from abc import ABC, abstractmethod

from utils.game_status import GameStatus

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

    
    async def join(self, websocket, name, token):
        # Send a JSON-serializable list of connected player names (not a set)
        await self.send_message_to_all({
            "type": "players",
            "players": [player.name for player in self.players.values() if player.is_connected]
        })

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
        await self.send_message_to_all({
            "type": "game_owner",
            "new_owner": new_owner
        })
        
    async def send_message_to_all(self, message):
        for player in self.players.values():
            if player.is_connected and player.websocket:
                try:
                    await player.websocket.send_json(message)
                except Exception as e:
                    print(f"Error sending message to player {player.token}: {e}")
    
    