from core.database import database


async def add_word(channel, login, display_name, letters, words):
    """A word found, uncovering `letters` new letters and completing `words` words (crossings included)."""
    await database.execute(
        """INSERT INTO twitch_scores (channel, login, display_name, words, letters)
           VALUES (:channel, :login, :name, :words, :letters)
           ON CONFLICT (channel, login) DO UPDATE
           SET words = twitch_scores.words + EXCLUDED.words, letters = twitch_scores.letters + EXCLUDED.letters,
               display_name = EXCLUDED.display_name, updated_at = now()""",
        values={"channel": channel, "login": login, "name": display_name, "letters": letters, "words": words},
    )


async def add_grid(channel, logins):
    """One more grid played for each viewer who found a word in it."""
    if logins:
        await database.execute(
            "UPDATE twitch_scores SET grids = grids + 1 WHERE channel = :channel AND login = ANY(:logins)",
            values={"channel": channel, "logins": list(logins)},
        )


async def top_viewers(channel, limit=10):
    rows = await database.fetch_all(
        """SELECT display_name, words, letters, grids FROM twitch_scores WHERE channel = :channel
           ORDER BY letters DESC, words DESC, grids ASC, updated_at ASC LIMIT :limit""",
        values={"channel": channel, "limit": limit},
    )
    return [{"name": r["display_name"], "words": r["words"], "letters": r["letters"], "grids": r["grids"]} for r in rows]
