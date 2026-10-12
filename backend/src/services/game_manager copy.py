from utils.websocket_utils import send_message_to_all_except
from crud.game_crud import get_random_grid
from utils.normalize import normalize_grid
import uuid

from core.game_modes.normal_game import NormalGame
from core.game_modes.coop_game import CoopGame

GAMES = {}

ROOMS = {}


async def get_room(room_id):
    if room_id not in ROOMS:
        ROOMS[room_id] = {
            "players": {},
            "names": {},
            "progress": {},
            "is_connected": {},
            "grid":  normalize_grid(await get_random_grid()),
        }

    return ROOMS[room_id]

async def validate_word(attempt):
    """Méthode pour marquer un mot comme validé."""
    row, col = attempt.row, attempt.col
    direction = attempt.direction
    room = await get_room(attempt.room_id)
    if room is None:
        print(f"Room not found for room_id {attempt.room_id}")
        return
    
    length = attempt.length
    token = attempt.token
    room = next((r for r in ROOMS.values() if token in r["players"]), None)
    if room is None:
        print(f"Room not found for token {token}")
        return
    
    for i in range(length):
        r = row if direction == "H" else row + i
        c = col + i if direction == "H" else col
        
        if attempt.guess[i] == room["grid"]["solution_grid"][r][c]:
            room["progress"][token][r][c] = True
        else:       
            print(f"Invalid word attempt: {attempt.guess[i]} at ({r}, {c})")        
    
    print(f"Progression de {room['names'][token]} :")
    for row in room["progress"][token]:
        print(" ".join(['#' if c else '-' for c in row]))

    await send_message_to_all_except(
        room,
        token,
        {
            "type": "player_progress",
            "from": room["names"][token],
            "progress": room["progress"][token]
        }
    )

# Create a new game room
async def create_room(room_id, owner, game_mode="normal", is_public=True, is_ranked=False):
    if room_id in ROOMS:
        return {"error": "Room already exists"}

    grid = await get_random_grid()
    if not grid:
        return {"error": "No grid available"}

    # Initialize the room
    ROOMS[room_id] = {
        "players": {},
        "names": {},
        "progress": {},
        "is_connected": {},
        "grid": normalize_grid(grid),
        "game_mode": game_mode,
        "is_public": is_public,
        "is_ranked": is_ranked,
        "owner": owner,
    }
    
    # Todo create a game class to encapsulate room data and methods and support different game modes

    return {
        "message": "Room created successfully",
        "room_id": room_id,
        "grid": ROOMS[room_id]["grid"],
    }
 

async def join_room(room_id, websocket, name, token=None):
    room = await get_room(room_id)
    if not room:
        # Create a new room if it doesn't exist
        await create_room(room_id, name)
        room = await get_room(room_id)

    if token and token in room["players"]:
        print(f"Reconnecting player {name} with token {token} in room {room_id}")
        if not name:
            name = room["names"].get(token, f"Player-{token[-4:]}")
        room["is_connected"][token] = True
    else:
        token = f"{room_id}-{uuid.uuid4()}"
        while token in room["players"]:
            token = f"{room_id}-{uuid.uuid4()}"
        
        print(f"Joining player {name} with token {token} in room {room_id}")
        room["names"][token] = name
        room["progress"][token] = [
            [False if c == '-' else None for c in row] for row in room["grid"]["grid_structure"]
        ]
        room["is_connected"][token] = True

    # Add player to the room
    room["players"][token] = websocket

    # Send token and room ID to the player
    await websocket.send_json({"type": "token", "token": token, "room_id": room_id})

    return {"message": "Joined room successfully", "token": token, "room": room}


def init_progress(room):
    """Initialize the progress for all players in the room."""
    for token in room["players"]:
        room["progress"][token] = [
            [False if c == '-' else None for c in row] for row in room["grid"]["grid_structure"]
        ]
        room["is_connected"][token] = True