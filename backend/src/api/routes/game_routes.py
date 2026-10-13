from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.game_manager import GAMES, get_room, validate_word
from utils.game_status import GameStatus
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
    game = await get_room(room_id)
    if not game:
        return JSONResponse(status_code=404, content={"error": "Room not found"})
    

    with open("./src/utils/grid_def_order.json", "r") as f:
        grid_def_order = json.load(f)

    game_data = game.grid
    return JSONResponse(content={
        "grid_structure": game_data["grid_structure"],
        "grid_def_order": grid_def_order["grid_def_order"],
        "placed_words": [
            {k: v for k, v in word.items() if k != "word"} for word in game_data["placed_words"]
        ]
    }, media_type="application/json; charset=utf-8")
    
@router.post("/api/submit_word")
async def submit_word(attempt: WordAttempt):
    game = await get_room(attempt.room_id)
    if not game:
        return JSONResponse(status_code=404, content={"error": "Room not found"})
    if game.status != GameStatus.IN_PROGRESS or attempt.token not in game.players:
        return {"valid": False, "error": "Game not in progress"}
    
    game_data = game.grid  
    for word in game_data["placed_words"]:
        if (word["row"], word["col"], word["direction"]) == (attempt.row, attempt.col, attempt.direction):
            # Vérification du mot
            print(f"Word: {attempt.guess}, Expected: {word['word']}")
            if word["word"] == attempt.guess:
                # Envoie la progression aux autres joueurs
                await validate_word(attempt)  
                return {"valid": True}
    return {"error": "Unknown word location"}


    """public_games = get_public_games()
    if not public_games:
        return JSONResponse(status_code=404, content={"error": "No public games found"})
    return JSONResponse(content=public_games, media_type="application/json; charset=utf-8")
"""

@router.get("/api/public_games")
async def get_public_games():
    """Retrieve a list of public games."""
    public_games = [
        {
            "id": room_id,
            "owner": game.owner_name,
            "game_mode": game.__class__.__name__,
            "playerCount": len(game.players),
            "isRanked": game.is_ranked,
            "status": game.status.name
        }
        for room_id, game in GAMES.items()
        if game.is_public
        and game.status == GameStatus.WAITING_FOR_PLAYERS
        and any(player.is_connected for player in game.players.values())
    ]
    return JSONResponse(content=public_games, media_type="application/json; charset=utf-8")