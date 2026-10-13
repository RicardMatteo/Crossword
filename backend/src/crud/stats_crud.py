from core.database import database


async def save_results(rows):
    """rows: dicts with user_id, mode, rank, player_count, finished, time, percent, words_found, won."""
    if rows:
        await database.execute_many(
            """INSERT INTO game_results (user_id, mode, rank, player_count, finished, time, percent, words_found, won)
               VALUES (:user_id, :mode, :rank, :player_count, :finished, :time, :percent, :words_found, :won)""",
            values=rows,
        )


async def get_stats(user_id):
    totals = await database.fetch_one(
        """SELECT count(*) AS games_played,
                  count(*) FILTER (WHERE won) AS games_won,
                  count(*) FILTER (WHERE finished) AS grids_completed,
                  min(time) FILTER (WHERE finished AND mode = 'classic') AS best_time,
                  avg(time) FILTER (WHERE finished AND mode = 'classic') AS average_time,
                  coalesce(sum(words_found), 0) AS words_found
           FROM game_results WHERE user_id = :user_id""",
        values={"user_id": user_id},
    )
    recent = await database.fetch_all(
        """SELECT mode, rank, player_count, finished, time, percent, words_found, won, played_at
           FROM game_results WHERE user_id = :user_id ORDER BY played_at DESC LIMIT 10""",
        values={"user_id": user_id},
    )
    return {
        "gamesPlayed": totals["games_played"],
        "gamesWon": totals["games_won"],
        "gridsCompleted": totals["grids_completed"],
        "bestTime": totals["best_time"],
        "averageTime": round(totals["average_time"], 1) if totals["average_time"] is not None else None,
        "wordsFound": totals["words_found"],
        "recent": [
            {
                "mode": r["mode"],
                "rank": r["rank"],
                "playerCount": r["player_count"],
                "finished": r["finished"],
                "time": r["time"],
                "percent": r["percent"],
                "wordsFound": r["words_found"],
                "won": r["won"],
                "playedAt": r["played_at"].isoformat(),
            }
            for r in recent
        ],
    }
