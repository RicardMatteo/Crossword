from fastapi import WebSocket, WebSocketDisconnect
from services.game_manager import GAMES, join_room, restart_room, apply_mode
from crud.user_crud import get_session_user
from utils.game_status import GameStatus

async def handle_websocket(websocket: WebSocket, room_id: str):
    await websocket.accept()
    try:
        init = await websocket.receive_json()
    except WebSocketDisconnect:
        return

    user = await get_session_user(init.get("authToken"))
    join = await join_room(room_id, websocket, init.get("name"), init.get("token"), user)
    if "error" in join:
        await websocket.close(code=4000, reason=join["error"])
        return

    game = join["room"]
    # Use the token assigned by join_room: a new player arrives without one
    token = join["token"]

    try:
        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type")
            # The room's game object is replaced when its mode changes
            game = GAMES.get(room_id, game)

            if msg_type == "request_players":
                await websocket.send_json(game.players_message())
            elif msg_type == "update_settings":
                if token == game.owner:
                    await game.update_settings(msg.get("settings") or {})
            elif msg_type == "start_game":
                if token == game.owner and game.status == GameStatus.WAITING_FOR_PLAYERS:
                    game = apply_mode(game)
                    await game.start()
            elif msg_type == "restart_game":
                if token == game.owner and game.status == GameStatus.COMPLETED:
                    await restart_room(game)

    except WebSocketDisconnect:
        game = GAMES.get(room_id, game)
        player = game.players.get(token)
        # Ignore stale sockets: the player may already have reconnected elsewhere
        if player and player.websocket is websocket:
            player.disconnect()
            await game.on_player_left(token)
