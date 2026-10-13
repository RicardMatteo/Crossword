"""Stream overlay: a chat-only game per Twitch channel, looping grid after grid.

The overlay page (e.g. an OBS browser source) only watches; the channel's chat
plays by sending grid words, one per message. A finished grid is replaced after
`restart_delay` seconds, and a stalled one gets letters revealed.
"""
import asyncio
import json
import random
import time
from collections import deque

from crud import twitch_crud
from crud.game_crud import get_random_grid
from services.twitch_chat import TwitchChat, chat_word
from utils.normalize import normalize_grid

DEFAULT_RESTART_DELAY = 30
HINT_AFTER_IDLE = 120  # seconds without a found word before letters get revealed
HINT_EVERY = 30
TEARDOWN_GRACE = 60  # keep the game a little after the last overlay closes (OBS reloads)
FEED_SIZE = 8
TOP_SIZE = 10

with open("./src/utils/grid_def_order.json", "r") as f:
    GRID_DEF_ORDER = json.load(f)["grid_def_order"]

OVERLAYS = {}  # channel -> ChannelOverlay


def word_cells(word):
    for i in range(word["length"]):
        yield (word["row"], word["col"] + i) if word["direction"] == "H" else (word["row"] + i, word["col"])


class ChannelOverlay:
    def __init__(self, channel):
        self.channel = channel
        self.spectators = set()
        self.restart_delay = DEFAULT_RESTART_DELAY
        self.chat = TwitchChat(channel, self.on_message, self.on_status)
        self.chat_status = "connecting"
        self.top_all_time = []
        self.round = 0
        self.status = None  # "playing" or "finished"
        self.tasks = []
        self.restart_task = None
        self.teardown_task = None

    async def start(self):
        self.top_all_time = await twitch_crud.top_viewers(self.channel, TOP_SIZE)
        await self.new_round()
        self.chat.start()
        self.tasks.append(asyncio.create_task(self._hint_loop()))

    def stop(self):
        self.chat.stop()
        for task in [*self.tasks, self.restart_task]:
            if task:
                task.cancel()

    # --- rounds ---------------------------------------------------------------

    async def new_round(self):
        grid = await get_random_grid()
        if not grid:
            print(f"Overlay #{self.channel}: no grid available")
            return
        self.grid = normalize_grid(grid)
        structure = self.grid["grid_structure"]
        # Found letters: "" for an empty letter cell, None for a clue cell
        self.letters = [["" if c == "-" else None for c in row] for row in structure]
        self.revealed = set()  # cells filled by a hint rather than by a viewer
        self.found_words = set()  # indexes in placed_words
        self.feed = deque(maxlen=FEED_SIZE)
        self.viewers = {}  # login -> {"name", "words"} for this grid
        self.round += 1
        self.status = "playing"
        self.started_at = time.monotonic()
        self.last_progress = self.started_at
        self.last_hint = 0
        self.duration = None
        self.restart_at = None
        await self.broadcast()

    def is_complete(self):
        return all(cell != "" for row in self.letters for cell in row if cell is not None)

    def fill(self, cells):
        """Writes the solution in `cells`; returns (letters that were still empty, words completed)."""
        solution = self.grid["solution_grid"]
        new = 0
        for r, c in cells:
            if self.letters[r][c] == "":
                new += 1
            self.letters[r][c] = solution[r][c]
        # Crossing words may now be complete too
        words = 0
        for i, word in enumerate(self.grid["placed_words"]):
            if i not in self.found_words and all(self.letters[r][c] for r, c in word_cells(word)):
                self.found_words.add(i)
                words += 1
        return new, words

    async def finish(self):
        self.status = "finished"
        self.duration = round(time.monotonic() - self.started_at, 1)
        self.restart_at = time.monotonic() + self.restart_delay
        try:
            await twitch_crud.add_grid(self.channel, self.viewers.keys())
            self.top_all_time = await twitch_crud.top_viewers(self.channel, TOP_SIZE)
        except Exception as e:
            print(f"Overlay #{self.channel}: error saving scores: {e!r}")
        await self.broadcast()
        self.restart_task = asyncio.create_task(self._restart_later())

    async def _restart_later(self):
        await asyncio.sleep(self.restart_delay)
        self.restart_task = None
        await self.new_round()

    # --- chat -----------------------------------------------------------------

    async def on_message(self, viewer, text, login):
        if self.status != "playing":
            return
        guess = chat_word(text)
        if not guess:
            return
        for i, word in enumerate(self.grid["placed_words"]):
            if word["word"] == guess and i not in self.found_words:
                break
        else:
            return
        # Viewers score the letters they uncover, not those already revealed by hints or crossing words
        letters, words = self.fill(word_cells(word))
        self.last_progress = time.monotonic()
        entry = self.viewers.setdefault(login, {"name": viewer, "words": 0, "letters": 0})
        entry["words"] += words
        entry["letters"] += letters
        self.feed.appendleft({"viewer": viewer, "word": guess})
        try:
            await twitch_crud.add_word(self.channel, login, viewer, letters, words)
            self.top_all_time = await twitch_crud.top_viewers(self.channel, TOP_SIZE)
        except Exception as e:
            print(f"Overlay #{self.channel}: error saving score: {e!r}")
        if self.is_complete():
            await self.finish()
        else:
            await self.broadcast()

    async def on_status(self, status):
        self.chat_status = status
        await self.broadcast()

    # --- hints ----------------------------------------------------------------

    def next_hint_in(self):
        """Seconds before the next revealed letter if nobody finds a word meanwhile."""
        if self.status != "playing":
            return None
        due = max(self.last_progress + HINT_AFTER_IDLE, self.last_hint + HINT_EVERY)
        return max(0, round(due - time.monotonic()))

    async def reveal_letter(self):
        empty = [(r, c) for r, row in enumerate(self.letters) for c, cell in enumerate(row) if cell == ""]
        if not empty:
            return
        cell = random.choice(empty)
        self.revealed.add(cell)
        self.fill([cell])
        # Consecutive hints share one feed line ("Letter revealed ×5")
        if self.feed and self.feed[0].get("hint"):
            self.feed[0]["count"] += 1
        else:
            self.feed.appendleft({"hint": True, "count": 1})
        if self.is_complete():
            await self.finish()
        else:
            await self.broadcast()

    async def _hint_loop(self):
        while True:
            await asyncio.sleep(1)
            now = time.monotonic()
            if (
                self.status == "playing"
                and now - self.last_progress >= HINT_AFTER_IDLE
                and now - self.last_hint >= HINT_EVERY
            ):
                self.last_hint = now
                try:
                    await self.reveal_letter()
                except Exception as e:
                    print(f"Overlay #{self.channel}: error revealing a letter: {e!r}")

    # --- spectators -----------------------------------------------------------

    def state(self):
        cells = [cell for row in self.letters for cell in row if cell is not None]
        top_game = sorted(self.viewers.values(), key=lambda v: (-v["letters"], -v["words"]))[:TOP_SIZE]
        finished = self.status == "finished"
        return {
            "type": "overlay",
            "channel": self.channel,
            "chatStatus": self.chat_status,
            "status": self.status,
            "round": self.round,
            "grid": {
                "grid_structure": self.grid["grid_structure"],
                "grid_def_order": GRID_DEF_ORDER,
                # never the answers: anyone can open the overlay
                "placed_words": [{k: v for k, v in w.items() if k not in ("word", "hash")}
                                 for w in self.grid["placed_words"]],
            },
            "letters": self.letters,
            "revealed": sorted(self.revealed),
            "percent": round(100 * sum(cell != "" for cell in cells) / len(cells)) if cells else 0,
            "wordsFound": len(self.found_words),
            "totalWords": len(self.grid["placed_words"]),
            "feed": list(self.feed),
            "topGame": top_game,
            "topAllTime": self.top_all_time,
            "nextHintIn": self.next_hint_in(),
            "duration": self.duration,
            "restartIn": max(0, round(self.restart_at - time.monotonic())) if finished else None,
        }

    async def broadcast(self):
        if self.status is None:
            return
        state = self.state()
        for ws in list(self.spectators):
            try:
                await ws.send_json(state)
            except Exception:
                self.spectators.discard(ws)


async def join_overlay(channel, websocket, restart_delay=None):
    overlay = OVERLAYS.get(channel)
    if overlay is None:
        overlay = OVERLAYS[channel] = ChannelOverlay(channel)
        overlay.spectators.add(websocket)
        if restart_delay is not None:
            overlay.restart_delay = restart_delay
        await overlay.start()
        return overlay
    if overlay.teardown_task:
        overlay.teardown_task.cancel()
        overlay.teardown_task = None
    if restart_delay is not None:
        overlay.restart_delay = restart_delay
    overlay.spectators.add(websocket)
    if overlay.status:
        await websocket.send_json(overlay.state())
    return overlay


async def leave_overlay(channel, websocket):
    overlay = OVERLAYS.get(channel)
    if not overlay:
        return
    overlay.spectators.discard(websocket)
    if not overlay.spectators and not overlay.teardown_task:
        overlay.teardown_task = asyncio.create_task(_teardown_later(channel, overlay))


async def _teardown_later(channel, overlay):
    await asyncio.sleep(TEARDOWN_GRACE)
    if not overlay.spectators and OVERLAYS.get(channel) is overlay:
        overlay.stop()
        del OVERLAYS[channel]
