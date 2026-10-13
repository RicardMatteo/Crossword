from enum import Enum, auto

class GameStatus(Enum):
    WAITING_FOR_PLAYERS = auto()
    IN_PROGRESS = auto()
    COMPLETED = auto()
    ABANDONED = auto()