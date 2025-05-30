from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.websocket_manager import get_room, validate_word
import json

router = APIRouter()

class WordAttempt(BaseModel):
    row: int
    col: int
    direction: str
    guess: str
    token: str
    room_id: str
    length: int

@router.get("/api/grid")
async def get_grid(room_id: str):
    room = await get_room(room_id)
    if not room:
        return JSONResponse(status_code=404, content={"error": "Room not found"})
    

    with open("./src/utils/grid_def_order.json", "r") as f:
        grid_def_order = json.load(f)

    game_data = room["grid"]
    return JSONResponse(content={
        "grid_structure": game_data["grid_structure"],
        "definitions_horizontal": game_data["definitions_horizontal"],
        "definitions_vertical": game_data["definitions_vertical"],
        "grid_def_order": grid_def_order["grid_def_order"],
        "placed_words": [
            {k: v for k, v in word.items() if k != "word"} for word in game_data["placed_words"]
        ]
    }, media_type="application/json; charset=utf-8")
    
@router.post("/api/submit_word")
async def submit_word(attempt: WordAttempt):
    room = await get_room(attempt.room_id)
    if not room:
        return JSONResponse(status_code=404, content={"error": "Room not found"})
    
    game_data = room["grid"]    
    for word in game_data["placed_words"]:
        if (word["row"], word["col"], word["direction"]) == (attempt.row, attempt.col, attempt.direction):
            # Vérification du mot
            print(f"Word: {attempt.guess}, Expected: {word['word']}")
            if word["word"] == attempt.guess:
                # Envoie la progression aux autres joueurs
                await validate_word(attempt)  
                return {"valid": True}
    return {"error": "Unknown word location"}