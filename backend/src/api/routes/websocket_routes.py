from fastapi import APIRouter, WebSocket
from services.websocket_manager import handle_websocket

router = APIRouter()

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await handle_websocket(websocket, room_id)
