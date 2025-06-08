from .base_game import Game
from core.player import Player

class CoopGame(Game):
    def __init__(self, room_id, grid, owner):
        super().__init__(room_id, grid, owner)
        self.progress = [
            [None if c != '-' else False for c in row] for row in grid["grid_structure"]
        ]
        self.contributions = [[None for _ in row] for row in grid["grid_structure"]]

    async def join(self, websocket, name, token):
        if token not in self.players:
            self.players[token] = Player(token, name, websocket)
        else:
            self.players[token].name = name
            self.players[token].reconnect(websocket)
        return token

    async def validate_word(self, attempt):
        for i in range(attempt.length):
            r = attempt.row if attempt.direction == "H" else attempt.row + i
            c = attempt.col + i if attempt.direction == "H" else attempt.col
            if attempt.guess[i] == self.grid["solution_grid"][r][c]:
                self.progress[r][c] = True
                self.contributions[r][c] = attempt.token
        self.check_endgame()

    def get_progress_for(self, token): # type: ignore
        return self.progress

    def check_endgame(self):
        for row in self.progress:
            if False in row:
                return False
        self.is_finished = True
        return True
    
    async def send_initial_progress(self, websocket, token):
        pass
    
    async def send_other_players_progress(self, websocket, token):
        pass