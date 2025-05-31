from models.game import GridTemplate
from core.database import database
import hashlib
from sqlalchemy import Table, Column, Integer, String, JSON, func
from core.database import database

async def get_first_grid():
    query = GridTemplate.select().limit(1)
    row = await database.fetch_one(query)
    if not row:
        return None

    placed_words = row["placed_words"]
    for word in placed_words:
        word["hash"] = hashlib.sha256(word["word"].encode()).hexdigest()

    
    return {
        "grid_structure": row["grid_structure"],
        "solution_grid": row["solution_grid"],
        "grid_def_order": row["grid_def_order"],
        "placed_words": placed_words,
        "difficulty": row["difficulty"]
    }

async def get_random_grid():
    query = GridTemplate.select().order_by(func.random()).limit(1)
    row = await database.fetch_one(query)
    if not row:
        return

    placed_words = row["placed_words"]
    for word in placed_words:
        word["hash"] = hashlib.sha256(word["word"].encode()).hexdigest()

    return {
        "grid_structure": row["grid_structure"],
        "solution_grid": row["solution_grid"],
        "grid_def_order": row["grid_def_order"],
        "placed_words": placed_words
    }

async def get_grid_structure():
    grid = await get_random_grid()
    return grid["grid_structure"] if grid else []