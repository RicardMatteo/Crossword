from .base_game import Game
from utils.game_status import GameStatus
from core.player import Player

class CoopGame(Game):
    """Everyone fills the same shared grid; each letter is credited to whoever found it first."""
    mode = "coop"

    def __init__(self, room_id, grid, owner):
        super().__init__(room_id, grid, owner)
        self.reset_progress()

    def reset_progress(self):
        grid = self.grid["grid_structure"]
        self.progress = [[None if c != '-' else False for c in row] for row in grid]
        self.contributions = [[None for _ in row] for row in grid]
        self.found_words = {}  # token -> {(row, col, direction)}

    async def join(self, websocket, name, token):
        if token not in self.players:
            self.players[token] = Player(token, name, websocket)
        else:
            self.players[token].name = name
            self.players[token].reconnect(websocket)
        await super().join(websocket, name, token)
        return token

    async def validate_word(self, attempt):
        complete_before = self.complete_words()
        for i in range(attempt.length):
            r = attempt.row if attempt.direction == "H" else attempt.row + i
            c = attempt.col + i if attempt.direction == "H" else attempt.col
            if attempt.guess[i] == self.grid["solution_grid"][r][c] and not self.progress[r][c]:
                self.progress[r][c] = True
                self.contributions[r][c] = attempt.token
        # Credit every word this one completes, crossing words included
        self.found_words.setdefault(attempt.token, set()).update(self.complete_words() - complete_before)

    def complete_words(self):
        return {(w["row"], w["col"], w["direction"]) for w in self.grid["placed_words"]
                if all(self.progress[r][c] for r, c in self.word_cells(w))}

    def get_progress_for(self, token): # type: ignore
        return self.progress

    def is_player_done(self, token):
        # Shared grid: everyone is done once it is complete
        return not any(False in row for row in self.progress)

    async def on_player_progress(self, token):
        # The shared grid is complete: the end rule is irrelevant in coop
        if self.status == GameStatus.IN_PROGRESS and self.is_player_done(token):
            self.finish_times = {t: self.elapsed() for t in self.players}
            await self.end_game()

    def player_stats(self, token):
        """Share of the grid's letters this player filled in first."""
        cells = [cell for row in self.progress for cell in row if cell is not None]
        mine = sum(c == token for row in self.contributions for c in row)
        percent = round(100 * mine / len(cells)) if cells else 0
        return percent, len(self.found_words.get(token, ()))
    
    def team_progress_message(self):
        solution = self.grid["solution_grid"]
        letters_by_player = {}
        for row in self.contributions:
            for token in row:
                if token in self.players:
                    name = self.players[token].name
                    letters_by_player[name] = letters_by_player.get(name, 0) + 1
        cells = [cell for row in self.progress for cell in row if cell is not None]
        return {
            "type": "team_progress",
            # found letters of the shared grid, None elsewhere
            "progress": [
                [solution[r][c] if found else None for c, found in enumerate(row)]
                for r, row in enumerate(self.progress)
            ],
            "percent": round(100 * sum(cells) / len(cells)) if cells else 0,
            "contributions": letters_by_player,
        }

    async def broadcast_progress(self, token):
        # Everyone, sender included, gets the shared grid and the updated contributions
        await self.send_message_to_all(self.team_progress_message())

    async def send_initial_progress(self, websocket, token):
        await websocket.send_json(self.team_progress_message())

    async def send_other_players_progress(self, websocket, token):
        pass