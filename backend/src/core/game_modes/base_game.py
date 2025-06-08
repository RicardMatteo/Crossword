from abc import ABC, abstractmethod

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

    def __init__(self, room_id, grid, owner):
        self.room_id = room_id
        self.grid = grid
        self.players = {}
        self.owner = owner

    @abstractmethod
    async def join(self, websocket, name, token):
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