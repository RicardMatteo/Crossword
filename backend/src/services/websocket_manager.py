from fastapi import WebSocket, WebSocketDisconnect
import uuid
import hashlib
from crud.game_crud import get_random_grid
from utils.normalize import normalize_grid

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

async def handle_websocket(websocket: WebSocket, room_id: str):
    await websocket.accept()
    try:
        init = await websocket.receive_json()
    except WebSocketDisconnect:
        return

    token = init.get("token")
    name = init.get("name")

    room = await get_room(room_id)

    if not token or token not in room["players"]:
        if not name:
            await websocket.close(code=1008)
            return
        token = f"{room_id}-{uuid.uuid4()}"
        room["names"][token] = name
        room["progress"][token] = [[False if c == '-' else None for c in row] for row in room["grid"]["grid_structure"]]

    room["players"][token] = websocket
    room["is_connected"][token] = True

    await websocket.send_json({"type": "token", "token": token, "room_id": room_id})

    for other_token, progress in room["progress"].items():
        if not room["is_connected"].get(other_token):
            continue
        if other_token != token:
            await websocket.send_json({"type": "player_progress", "from": room["names"][other_token], "progress": progress})
            await room["players"][other_token].send_json({"type": "player_progress", "from": name, "progress": room["progress"][token]})

    # Pour le joueur on renvoit les lettres bien placées
    # Build self_progress: show the letter if validated, else None
    self_progress = [
        [
            room["grid"]["grid_structure"][r][c] if room["progress"][token][r][c] == True else None
            for c in range(len(room["grid"]["grid_structure"][0]))
        ]
        for r in range(len(room["grid"]["grid_structure"]))
    ]
    await websocket.send_json({"type": "self_progress", "progress": self_progress})

    try:
        while True:
            msg = await websocket.receive_json()
            if msg["type"] == "word_validated":
                row, col = msg["row"], msg["col"]
                direction, length = msg["direction"], msg["length"]

                for i in range(length):
                    r = row if direction == "H" else row + i
                    c = col + i if direction == "H" else col
                    room["progress"][token][r][c] = True

                await send_message_to_all_except(room, token, {
                    "type": "player_progress",
                    "from": name,
                    "progress": room["progress"][token]
                })

    except WebSocketDisconnect:
        if token in room["players"]:
            room["is_connected"][token] = False
            await send_message_to_all_except(room, token, {
                "type": "player_disconnected",
                "from": name
            })

async def send_message_to_all_except(room, sender_token, message):
    for token, player in room["players"].items():
        if token != sender_token:
            try:
                await player.send_json(message)
            except Exception as e:
                print(f"Error sending message to player {token}: {e}")

async def send_message_to_all(room, message):
    await send_message_to_all_except(room, None, message)


async def validate_word(attempt):
    """Méthode pour marquer un mot comme validé."""
    row, col = attempt.row, attempt.col
    direction = attempt.direction
    room = await get_room(attempt.room_id)
    if room is None:
        print(f"Room not found for room_id {attempt.room_id}")
        return
    game_data = room["grid"]
    length = attempt.length if hasattr(attempt, "length") else next(
        (w["length"] for w in game_data["placed_words"]
         if w["row"] == row and w["col"] == col and w["direction"] == direction),
        None
    )
    token = attempt.token
    # Trouver la room contenant ce token
    room = next((r for r in ROOMS.values() if token in r["players"]), None)
    if room is None:
        print(f"Room not found for token {token}")
        return
    for i in range(length):
        r = row if direction == "H" else row + i
        c = col + i if direction == "H" else col
        if attempt.guess[i] == room["grid"]["grid_structure"][r][c]:
            room["progress"][token][r][c] = True

    # affiche la progression
    print(f"Progression de {room['names'][token]} :")
    for row in room["progress"][token]:
        print(" ".join(['#' if c else '-' for c in row]))
    # Broadcast aux autres
    await send_message_to_all_except(
        room,
        token,
        {
            "type": "player_progress",
            "from": room["names"][token],
            "progress": room["progress"][token]
        }
    )

