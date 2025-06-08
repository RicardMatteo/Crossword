from fastapi import WebSocket, WebSocketDisconnect
from services.game_manager import join_room
from utils.websocket_utils import send_message_to_all_except

async def handle_websocket(websocket: WebSocket, room_id: str):
    await websocket.accept()
    try:
        init = await websocket.receive_json()
    except WebSocketDisconnect:
        return

    token = init.get("token")
    name = init.get("name")

    join = await join_room(room_id, websocket, name, token)
    if "error" in join or "room" not in join or join["message"] != "Joined room successfully":
        await websocket.close(code=4000, reason=join["error"])
        return
    
    game = join["room"]

    try:
        while True:
            msg = await websocket.receive_json()
            # Todo : Handle futur incoming messages

    except WebSocketDisconnect:
        if token in game.players:
            game.players[token].disconnect()
            
            await send_message_to_all_except(game, token, {
            "type": "player_disconnected",
            "from": name
            })