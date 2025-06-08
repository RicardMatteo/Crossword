from utils.websocket_utils import send_message_to_all_except
from crud.game_crud import get_random_grid
from utils.normalize import normalize_grid
import uuid

from core.game_modes.normal_game import NormalGame
from core.game_modes.coop_game import CoopGame
from core.game_modes.base_game import Game

GAMES = {}


async def get_room(room_id) -> "Game | None":
    """Retrieve the game instance for a given room ID."""
    return GAMES.get(room_id, None)


async def validate_word(attempt) -> None:
    """Method to validate a word attempt."""
    game = GAMES.get(attempt.room_id)
    if not game:
        print(f"Room not found for room_id {attempt.room_id}")
        return

    await game.validate_word(attempt)

    progress = game.get_progress_for(attempt.token)
    await send_message_to_all_except(
        game,
        attempt.token,
        {
            "type": "player_progress",
            "from": game.players[attempt.token].name,
            "progress": progress
        }
    )


async def create_room(room_id, owner, game_mode="normal", is_public=True, is_ranked=False) -> dict:
    """Create a new game room."""
    if room_id in GAMES:
        return {"error": "Room already exists"}

    grid = await get_random_grid()
    if not grid:
        return {"error": "No grid available"}

    grid = normalize_grid(grid)

    if game_mode == "coop":
        game = CoopGame(room_id, grid, owner)
    else:
        game = NormalGame(room_id, grid, owner)

    GAMES[room_id] = game

    return {
        "message": "Room created successfully",
        "room_id": room_id,
        "grid": grid,
    }
 

async def join_room(room_id, websocket, name, token=None) -> dict:
    """Join an existing game room or create a new one if it doesn't exist."""
    game = GAMES.get(room_id)
    if not game:
        await create_room(room_id, name)
        game = GAMES[room_id]

    if not token or token not in game.players:
        token = f"{room_id}-{uuid.uuid4()}"
        while token in game.players:
            token = f"{room_id}-{uuid.uuid4()}"
        await game.join(websocket, name, token)
    else:
        print(f"Reconnecting player {name} with token {token} in room {room_id}")
        if not name:
            name = game.players[token].name
        game.players[token].reconnect(websocket)
    
    await websocket.send_json({"type": "token", "token": token, "room_id": room_id})
    
    await game.send_initial_progress(websocket, token)
    await game.send_other_players_progress(websocket, token)
    
    return {"message": "Joined room successfully", "token": token, "room": game}