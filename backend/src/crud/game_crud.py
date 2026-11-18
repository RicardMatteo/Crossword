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

def _grid_from_row(row):
    placed_words = row["placed_words"]
    for word in placed_words:
        if "clue" in word and isinstance(word["clue"], str):
            word["clue"] = html.unescape(word["clue"]) 
        if "word" in word and isinstance(word["word"], str):
            word["hash"] = hashlib.sha256(word["word"].encode("utf-8")).hexdigest()
        else:
            word["hash"] = None

    return {
        "id": row["id"],
        "grid_structure": row["grid_structure"],
        "solution_grid": row["solution_grid"],
        "grid_def_order": row["grid_def_order"],
        "placed_words": placed_words
    }


async def get_random_grid(exclude=()):
    """A random grid, avoiding the ids in `exclude` unless they are all that is left."""
    query = GridTemplate.select().order_by(func.random()).limit(1)
    row = None
    if exclude:
        row = await database.fetch_one(query.where(GridTemplate.c.id.notin_(list(exclude))))
    if not row:
        row = await database.fetch_one(query)
    return _grid_from_row(row) if row else None


async def get_grid_for_channel(channel):
    """The grid this channel's overlay played least recently (never played first), and mark it played."""
    pick = await database.fetch_one(
        """SELECT g.id FROM grid_template g
           LEFT JOIN overlay_grids p ON p.grid_id = g.id AND p.channel = :channel
           ORDER BY p.played_at ASC NULLS FIRST, random() LIMIT 1""",
        values={"channel": channel},
    )
    if not pick:
        return None
    await database.execute(
        """INSERT INTO overlay_grids (channel, grid_id) VALUES (:channel, :id)
           ON CONFLICT (channel, grid_id) DO UPDATE SET played_at = now()""",
        values={"channel": channel, "id": pick["id"]},
    )
    row = await database.fetch_one(GridTemplate.select().where(GridTemplate.c.id == pick["id"]))
    return _grid_from_row(row)


async def get_grid_structure():
    grid = await get_random_grid()
    return grid["grid_structure"] if grid else []