from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.websocket_manager import handle_websocket
from services.overlay import join_overlay, leave_overlay
from services.twitch_chat import CHANNEL_RE

router = APIRouter()

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await handle_websocket(websocket, room_id)



@router.websocket("/ws/overlay/{channel}")
async def overlay_endpoint(websocket: WebSocket, channel: str, restart: int | None = None):
    """Watch the chat-only game of a Twitch channel (stream overlay / waiting screen)."""
    channel = channel.lower()
    await websocket.accept()
    if not CHANNEL_RE.match(channel):
        await websocket.close(code=4000, reason="invalid_channel")
        return
    restart = min(max(restart, 5), 600) if restart is not None else None
    await join_overlay(channel, websocket, restart)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await leave_overlay(channel, websocket)
