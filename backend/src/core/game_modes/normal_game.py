from .base_game import Game
from core.player import Player

class NormalGame(Game):
    mode = "classic"

    def __init__(self, room_id, grid, owner):
        super().__init__(room_id, grid, owner)
        self.progress = {}

    def empty_progress(self):
        return [[False if c == '-' else None for c in row] for row in self.grid["grid_structure"]]

    async def join(self, websocket, name, token):
        if token not in self.players:
            self.players[token] = Player(token, name, websocket)
        else:
            self.players[token].name = name
            self.players[token].reconnect(websocket)
        self.progress[token] = self.empty_progress()
        await super().join(websocket, name, token)
        return token

    async def validate_word(self, attempt):
        for i in range(attempt.length):
            r = attempt.row if attempt.direction == "H" else attempt.row + i
            c = attempt.col + i if attempt.direction == "H" else attempt.col
            if attempt.guess[i] == self.grid["solution_grid"][r][c]:
                self.progress[attempt.token][r][c] = True

    def get_progress_for(self, token):
        return self.progress[token]

    def is_player_done(self, token):
        return not any(False in row for row in self.progress[token])

    def player_stats(self, token):
        cells = [cell for row in self.progress[token] for cell in row if cell is not None]
        percent = round(100 * sum(cells) / len(cells)) if cells else 0
        return percent, self.count_found_words(self.progress[token])

    def reset_progress(self):
        self.progress = {token: self.empty_progress() for token in self.players}

    async def send_initial_progress(self, websocket, token):
        initial_progress = [
            [self.grid["solution_grid"][r][c] if self.progress[token][r][c] else None
             for c in range(len(self.grid["grid_structure"][0]))]
            for r in range(len(self.grid["grid_structure"]))
        ]
        await websocket.send_json({"type": "self_progress", "progress": initial_progress})

    async def send_other_players_progress(self, websocket, token):
        for other_token, progress in self.progress.items():
            other_player = self.players.get(other_token)
            if other_player and other_token != token and other_player.is_connected:
                await websocket.send_json({
                    "type": "player_progress",
                    "from": other_player.name,
                    "progress": progress
                })