from abc import ABC, abstractmethod
import asyncio
import time

from utils.game_status import GameStatus

# How a game ends, chosen by the owner when starting it:
# - "first": as soon as one player completes the grid
# - "all":   once every connected player has completed it
# - "delay": the others get `end_delay` seconds after the first one finishes
END_RULES = ("first", "all", "delay")
DEFAULT_END_DELAY = 60
MAX_END_DELAY = 600

class Game(ABC):
    class Player:
        def __init__(self, token, name, websocket=None):
            self.token = token
            self.name = name
            self.websocket = websocket
            self.is_connected = True
            self.progress = None
            self.is_finished = False

        def set_progress(self, progress):
            self.progress = progress

        def mark_finished(self):
            self.is_finished = True

        def disconnect(self):
            self.is_connected = False

        def reconnect(self, websocket):
            self.websocket = websocket
            self.is_connected = True

    def __init__(self, room_id, grid, owner, is_public=True, is_ranked=False):
        """
        Initialize the game with a room ID, grid, owner, and optional flags for public and ranked status.
        :param room_id: Unique identifier for the game room.
        :param grid: The grid structure for the game.
        :param owner: The token of the player who owns the game.
        :param is_public: Whether the game is public (default is True).
        :param is_ranked: Whether the game is ranked (default is False).
        """
        self.room_id = room_id
        self.grid = grid
        self.players = {}
        self.owner = owner
        self.status = GameStatus.WAITING_FOR_PLAYERS
        self.is_public = is_public
        self.is_ranked = is_ranked

        self.end_rule = "first"
        self.end_delay = DEFAULT_END_DELAY
        self.started_at = None
        self.finish_times = {}  # token -> seconds since start
        self.end_task = None
        self.end_at = None
        self.results = None

    
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
                {"name": player.name, "isOwner": token == self.owner}
                for token, player in self.players.items()
                if player.is_connected
            ],
        }

    async def on_player_left(self, token):
        """Hand ownership to another connected player and notify the room."""
        if token == self.owner:
            connected = [t for t, p in self.players.items() if p.is_connected]
            if connected:
                self.owner = connected[0]
        await self.send_message_to_all({
            "type": "player_disconnected",
            "from": self.players[token].name
        })
        await self.send_message_to_all(self.players_message())
        # With the "all" rule, a player leaving may be the last one we were waiting for
        await self.check_end()

    def elapsed(self):
        return round(time.monotonic() - self.started_at, 1) if self.started_at else 0

    async def start(self, end_rule=None, end_delay=None):
        if self.status != GameStatus.WAITING_FOR_PLAYERS:
            return
        self.end_rule = end_rule if end_rule in END_RULES else "first"
        try:
            self.end_delay = min(max(int(end_delay), 5), MAX_END_DELAY)
        except (TypeError, ValueError):
            self.end_delay = DEFAULT_END_DELAY
        self.status = GameStatus.IN_PROGRESS
        self.started_at = time.monotonic()
        await self.send_message_to_all(self.started_message())

    def started_message(self):
        return {
            "type": "game_started",
            "endRule": self.end_rule,
            "endDelay": self.end_delay,
            # lets a reconnecting player know who already finished
            "finished": [
                {"name": self.players[t].name, "time": time_}
                for t, time_ in sorted(self.finish_times.items(), key=lambda item: item[1])
            ],
        }

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
        connected = [t for t, p in self.players.items() if p.is_connected]
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

    def compute_results(self):
        rows = []
        for token, player in self.players.items():
            percent, words_found = self.player_stats(token)
            rows.append({
                "name": player.name,
                "finished": token in self.finish_times,
                "time": self.finish_times.get(token),
                "percent": percent,
                "wordsFound": words_found,
                "totalWords": len(self.grid["placed_words"]),
            })
        # Finishers first (fastest first), then by how much of the grid they filled
        rows.sort(key=lambda r: (not r["finished"], r["time"] or 0, -r["percent"], -r["wordsFound"]))
        return rows

    def finished_message(self, token):
        return {
            "type": "game_finished",
            "ranking": self.results,
            "solution": self.grid["solution_grid"],
            "found": self.get_progress_for(token),  # True = found, False = missed, None = clue cell
            "duration": self.elapsed(),
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
        self.reset_progress()
        await self.send_message_to_all({"type": "game_reset"})

    def count_found_words(self, progress):
        """Words whose letters are all found in a progress grid (True = found)."""
        def cells(word):
            for i in range(word["length"]):
                yield (word["row"], word["col"] + i) if word["direction"] == "H" else (word["row"] + i, word["col"])
        return sum(all(progress[r][c] for r, c in cells(word)) for word in self.grid["placed_words"])

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

    async def send_message_to_all(self, message):
        for player in self.players.values():
            if player.is_connected and player.websocket:
                try:
                    await player.websocket.send_json(message)
                except Exception as e:
                    print(f"Error sending message to player {player.token}: {e}")
    
    