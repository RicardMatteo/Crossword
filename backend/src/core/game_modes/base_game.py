from abc import ABC, abstractmethod
import asyncio
import time
from collections import deque

from core.player import Player

from crud import stats_crud
from utils.game_status import GameStatus

# How a game ends, chosen by the owner when starting it:
# - "first": as soon as one player completes the grid
# - "all":   once every connected player has completed it
# - "delay": the others get `end_delay` seconds after the first one finishes
END_RULES = ("first", "all", "delay")
DEFAULT_END_DELAY = 60
MAX_END_DELAY = 600
GAME_MODES = ("classic", "coop")
DEFAULT_MAX_PLAYERS = 4
MAX_PLAYERS_LIMIT = 8
TWITCH_FEED_SIZE = 8
TWITCH_TOP_SIZE = 10

class Game(ABC):
    mode = None  # "classic" or "coop", set by subclasses
    def __init__(self, room_id, grid, owner, is_public=True):
        """
        :param room_id: Unique identifier for the game room.
        :param grid: The grid structure for the game.
        :param owner: The token of the player who owns the game.
        :param is_public: Whether the room is listed on the homepage.
        """
        self.room_id = room_id
        self.grid = grid
        self.players = {}
        self.owner = owner
        self.status = GameStatus.WAITING_FOR_PLAYERS

        # Lobby settings, edited by the owner before the game starts
        self.is_public = is_public
        self.max_players = DEFAULT_MAX_PLAYERS
        self.next_mode = self.mode  # applied when the game starts
        self.end_rule = "first"
        self.end_delay = DEFAULT_END_DELAY
        self.started_at = None
        self.finish_times = {}  # token -> seconds since start
        self.end_task = None
        self.end_at = None
        self.results = None
        self.ranked_tokens = []  # tokens in ranking order, kept server-side (tokens are secrets)

        # Twitch plays: a linked channel's chat plays as one virtual player
        self.twitch_channel = None
        self.twitch_status = None  # "connecting", "connected" or "disconnected"
        self.twitch_feed = deque(maxlen=TWITCH_FEED_SIZE)  # last words found by viewers
        self.twitch_viewers = {}  # viewer -> {"words", "letters"} found this round

    
    async def join(self, websocket, name, token):
        pass

    @property
    def owner_name(self):
        owner = self.players.get(self.owner)
        return owner.name if owner else None

    def players_message(self):
        return {
            "type": "players",
            "players": [
                {"name": player.name, "isOwner": token == self.owner, "isTwitch": player.is_twitch}
                for token, player in self.players.items()
                if player.is_connected
            ],
        }

    async def on_player_left(self, token):
        """Hand ownership to another connected player and notify the room."""
        if token == self.owner:
            connected = self.connected_humans()
            if connected:
                self.owner = connected[0]
        await self.send_message_to_all({
            "type": "player_disconnected",
            "from": self.players[token].name
        })
        await self.send_message_to_all(self.players_message())
        # With the "all" rule, a player leaving may be the last one we were waiting for
        await self.check_end()

    def connected_humans(self):
        """Tokens of the connected real players (the Twitch chat is not one)."""
        return [t for t, p in self.players.items() if p.is_connected and not p.is_twitch]

    def connected_count(self):
        return len(self.connected_humans())

    @property
    def twitch_token(self):
        return f"{self.room_id}-twitch"

    def add_twitch_player(self, channel):
        """Add the virtual player of `channel`'s chat (lobby only)."""
        self.remove_twitch_player()
        player = Player(self.twitch_token, f"📺 {channel}")
        player.is_twitch = True
        self.players[self.twitch_token] = player
        self.twitch_channel = channel
        self.twitch_status = "connecting"
        self.reset_progress()

    def remove_twitch_player(self):
        self.players.pop(self.twitch_token, None)
        self.twitch_channel = None
        self.twitch_status = None
        self.reset_progress()

    def credit_viewer(self, viewer, word, letters):
        score = self.twitch_viewers.setdefault(viewer, {"words": 0, "letters": 0})
        score["words"] += 1
        score["letters"] += letters
        self.twitch_feed.appendleft({"viewer": viewer, "word": word})

    def top_viewers(self):
        """Best viewers by letters uncovered, then by words."""
        top = sorted(self.twitch_viewers.items(), key=lambda item: (-item[1]["letters"], -item[1]["words"]))
        return [{"name": name, **score} for name, score in top[:TWITCH_TOP_SIZE]]

    def twitch_message(self):
        return {
            "type": "twitch",
            "channel": self.twitch_channel,
            "status": self.twitch_status,
            "feed": list(self.twitch_feed),
            "top": self.top_viewers(),
        }

    def is_full(self):
        return self.connected_count() >= self.max_players

    def settings_message(self):
        return {
            "type": "settings",
            "mode": self.next_mode,
            "endRule": self.end_rule,
            "endDelay": self.end_delay,
            "isPublic": self.is_public,
            "maxPlayers": self.max_players,
        }

    def copy_settings_from(self, other):
        for attr in ("is_public", "max_players", "next_mode", "end_rule", "end_delay",
                     "twitch_channel", "twitch_status", "twitch_feed", "twitch_viewers"):
            setattr(self, attr, getattr(other, attr))

    async def update_settings(self, settings):
        """Apply the valid fields of `settings` and share the result with the room."""
        if self.status != GameStatus.WAITING_FOR_PLAYERS:
            return
        if settings.get("mode") in GAME_MODES:
            self.next_mode = settings["mode"]
        if settings.get("endRule") in END_RULES:
            self.end_rule = settings["endRule"]
        if "endDelay" in settings:
            try:
                self.end_delay = min(max(int(settings["endDelay"]), 5), MAX_END_DELAY)
            except (TypeError, ValueError):
                pass
        if isinstance(settings.get("isPublic"), bool):
            self.is_public = settings["isPublic"]
        if "maxPlayers" in settings:
            try:
                # Never below the players already in the room
                lowest = max(2, self.connected_count())
                self.max_players = min(max(int(settings["maxPlayers"]), lowest), MAX_PLAYERS_LIMIT)
            except (TypeError, ValueError):
                pass
        await self.send_message_to_all(self.settings_message())

    def elapsed(self):
        return round(time.monotonic() - self.started_at, 1) if self.started_at else 0

    async def start(self):
        if self.status != GameStatus.WAITING_FOR_PLAYERS:
            return
        self.status = GameStatus.IN_PROGRESS
        self.started_at = time.monotonic()
        await self.send_message_to_all(self.started_message())

    def started_message(self):
        return {
            "type": "game_started",
            "mode": self.mode,
            "endRule": self.end_rule,
            "endDelay": self.end_delay,
            # lets a reconnecting player know who already finished
            "finished": [
                {"name": self.players[t].name, "time": time_}
                for t, time_ in sorted(self.finish_times.items(), key=lambda item: item[1])
            ],
        }

    async def broadcast_progress(self, token):
        """Tell the other players about `token`'s progress after a validated word."""
        await self.send_message_to_all_except(token, {
            "type": "player_progress",
            "from": self.players[token].name,
            "progress": self.get_progress_for(token),
        })

    async def on_player_progress(self, token):
        """Record when a player completes the grid, then apply the end rule."""
        if self.status != GameStatus.IN_PROGRESS:
            return
        if token not in self.finish_times and self.is_player_done(token):
            self.finish_times[token] = self.elapsed()
            await self.send_message_to_all({
                "type": "player_finished",
                "name": self.players[token].name,
                "time": self.finish_times[token],
            })
        await self.check_end()

    async def check_end(self):
        if self.status != GameStatus.IN_PROGRESS or not self.finish_times:
            return
        # The Twitch chat may never finish: only real players are waited for
        connected = self.connected_humans()
        all_done = all(t in self.finish_times for t in connected)

        if self.end_rule == "first" or all_done:
            await self.end_game()
        elif self.end_rule == "delay" and self.end_task is None:
            self.end_task = asyncio.create_task(self._end_after(self.end_delay))
            self.end_at = time.monotonic() + self.end_delay
            await self.send_message_to_all(self.countdown_message())

    def countdown_message(self):
        return {"type": "end_countdown", "seconds": max(0, round(self.end_at - time.monotonic()))}

    async def _end_after(self, seconds):
        await asyncio.sleep(seconds)
        self.end_task = None
        await self.end_game()

    async def end_game(self):
        if self.status != GameStatus.IN_PROGRESS:
            return
        self.status = GameStatus.COMPLETED
        if self.end_task:  # None when called by the timer itself
            self.end_task.cancel()
        self.end_task = None
        self.results = self.compute_results()
        # Each player gets their own found-cells grid to colour the revealed solution
        for token, player in self.players.items():
            if player.is_connected and player.websocket:
                try:
                    await player.websocket.send_json(self.finished_message(token))
                except Exception as e:
                    print(f"Error sending message to player {token}: {e}")
        await self.save_results()

    async def save_results(self):
        """Store the result of each logged-in player for their profile stats."""
        rows = []
        for rank, (token, row) in enumerate(zip(self.ranked_tokens, self.results), start=1):
            user_id = self.players[token].user_id
            if user_id is None:
                continue
            rows.append({
                "user_id": user_id,
                "mode": self.mode,
                "rank": 1 if self.mode == "coop" else rank,
                "player_count": len(self.results),
                "finished": row["finished"],
                "time": row["time"],
                "percent": row["percent"],
                "words_found": row["wordsFound"],
                # coop: the team completed the grid; classic: first to complete it
                "won": row["finished"] and (self.mode == "coop" or rank == 1),
            })
        try:
            await stats_crud.save_results(rows)
        except Exception as e:
            print(f"Error saving results of room {self.room_id}: {e}")

    def compute_results(self):
        rows = []
        for token, player in self.players.items():
            percent, words_found = self.player_stats(token)
            rows.append({
                "token": token,
                "name": player.name,
                "finished": token in self.finish_times,
                "time": self.finish_times.get(token),
                "percent": percent,
                "wordsFound": words_found,
                "totalWords": len(self.grid["placed_words"]),
            })
        # Finishers first (fastest first), then by how much of the grid they filled
        rows.sort(key=lambda r: (not r["finished"], r["time"] or 0, -r["percent"], -r["wordsFound"]))
        self.ranked_tokens = [row.pop("token") for row in rows]
        return rows

    def finished_message(self, token):
        return {
            "type": "game_finished",
            "ranking": self.results,
            "solution": self.grid["solution_grid"],
            "found": self.get_progress_for(token),  # True = found, False = missed, None = clue cell
            "duration": self.elapsed(),
            "twitchViewers": self.top_viewers() if self.twitch_channel else None,
        }

    async def reset(self, grid):
        """Back to the lobby with a fresh grid, keeping the same players."""
        if self.end_task:
            self.end_task.cancel()
        self.end_task = None
        self.end_at = None
        self.grid = grid
        self.status = GameStatus.WAITING_FOR_PLAYERS
        self.started_at = None
        self.finish_times = {}
        self.results = None
        self.ranked_tokens = []
        self.twitch_feed.clear()
        self.twitch_viewers = {}
        self.reset_progress()
        await self.send_message_to_all({"type": "game_reset"})
        if self.twitch_channel:
            await self.send_message_to_all(self.twitch_message())

    def is_word_found(self, token, word):
        progress = self.get_progress_for(token)
        return all(progress[r][c] for r, c in self.word_cells(word))

    @staticmethod
    def word_cells(word):
        for i in range(word["length"]):
            yield (word["row"], word["col"] + i) if word["direction"] == "H" else (word["row"] + i, word["col"])

    def count_found_words(self, progress):
        """Words whose letters are all found in a progress grid (True = found)."""
        return sum(all(progress[r][c] for r, c in self.word_cells(word)) for word in self.grid["placed_words"])

    @abstractmethod
    def is_player_done(self, token):
        pass

    @abstractmethod
    def player_stats(self, token):
        """Return (percent of the grid's letters found, number of words found)."""

    @abstractmethod
    def reset_progress(self):
        pass

    @abstractmethod
    async def validate_word(self, attempt):
        pass

    @abstractmethod
    def get_progress_for(self, token):
        pass

    @abstractmethod
    async def send_initial_progress(self, websocket, token):
        pass

    @abstractmethod
    async def send_other_players_progress(self, websocket, token):
        pass

    async def update_owner(self, new_owner):
        if new_owner in self.players:
            self.owner = new_owner
        else:
            raise ValueError("New owner must be a player in the game.")
        await self.send_message_to_all(self.players_message())

    async def send_message_to_all_except(self, excluded_token, message):
        for token, player in self.players.items():
            if token != excluded_token and player.is_connected and player.websocket:
                try:
                    await player.websocket.send_json(message)
                except Exception as e:
                    print(f"Error sending message to player {token}: {e}")

    async def send_message_to_all(self, message):
        for player in self.players.values():
            if player.is_connected and player.websocket:
                try:
                    await player.websocket.send_json(message)
                except Exception as e:
                    print(f"Error sending message to player {player.token}: {e}")
    
    