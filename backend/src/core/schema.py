from core.database import database

# Account tables, created at startup so an existing database picks them up too
# (db/init.sql only runs when the Postgres volume is first created)
SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(20) NOT NULL,
        email VARCHAR(254) NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    "CREATE UNIQUE INDEX IF NOT EXISTS users_name_key ON users (lower(name))",
    "CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email))",
    """
    CREATE TABLE IF NOT EXISTS sessions (
        token_hash CHAR(64) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS game_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mode VARCHAR(10) NOT NULL,
        rank INTEGER NOT NULL,
        player_count INTEGER NOT NULL,
        finished BOOLEAN NOT NULL,
        time REAL,
        percent INTEGER NOT NULL,
        words_found INTEGER NOT NULL,
        won BOOLEAN NOT NULL,
        played_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS game_results_user_idx ON game_results (user_id, played_at DESC)",
]


async def create_schema():
    for statement in SCHEMA:
        await database.execute(statement)
