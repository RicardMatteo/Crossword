from models.game import GridTemplate
import html
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
        # Ensure clues are unescaped (in case DB contains HTML entities)
        if "clue" in word and isinstance(word["clue"], str):
            word["clue"] = html.unescape(word["clue"]) 
        # ensure consistent UTF-8 encoding when hashing
        if "word" in word and isinstance(word["word"], str):
            word["hash"] = hashlib.sha256(word["word"].encode("utf-8")).hexdigest()
        else:
            word["hash"] = None

    
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
        return None

    placed_words = row["placed_words"]
    for word in placed_words:
        if "clue" in word and isinstance(word["clue"], str):
            word["clue"] = html.unescape(word["clue"]) 
        if "word" in word and isinstance(word["word"], str):
            word["hash"] = hashlib.sha256(word["word"].encode("utf-8")).hexdigest()
        else:
            word["hash"] = None

    return {
        "grid_structure": row["grid_structure"],
        "solution_grid": row["solution_grid"],
        "grid_def_order": row["grid_def_order"],
        "placed_words": placed_words
    }

async def get_grid_structure():
    grid = await get_random_grid()
    return grid["grid_structure"] if grid else []