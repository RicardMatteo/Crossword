from datetime import datetime, timedelta, timezone

from core.database import database
from utils.security import hash_token, new_session_token

SESSION_DURATION = timedelta(days=30)

USER_FIELDS = "id, name, email, created_at"


def public_user(row):
    return {"id": row["id"], "name": row["name"], "email": row["email"], "createdAt": row["created_at"].isoformat()}


async def get_user_by_email(email):
    return await database.fetch_one(
        "SELECT * FROM users WHERE lower(email) = lower(:email)", values={"email": email}
    )


async def get_user_by_id(user_id):
    return await database.fetch_one("SELECT * FROM users WHERE id = :id", values={"id": user_id})


async def name_taken(name, except_id=None):
    row = await database.fetch_one(
        "SELECT id FROM users WHERE lower(name) = lower(:name) AND id IS DISTINCT FROM :except_id",
        values={"name": name, "except_id": except_id},
    )
    return row is not None


async def create_user(name, email, password_hash):
    return await database.fetch_one(
        f"INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :hash) RETURNING {USER_FIELDS}",
        values={"name": name, "email": email, "hash": password_hash},
    )


async def update_user(user_id, name=None, password_hash=None):
    return await database.fetch_one(
        f"""UPDATE users SET name = COALESCE(:name, name), password_hash = COALESCE(:hash, password_hash)
            WHERE id = :id RETURNING {USER_FIELDS}""",
        values={"id": user_id, "name": name, "hash": password_hash},
    )


async def delete_user(user_id):
    await database.execute("DELETE FROM users WHERE id = :id", values={"id": user_id})


async def create_session(user_id):
    token = new_session_token()
    await database.execute(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (:hash, :user_id, :expires_at)",
        values={
            "hash": hash_token(token),
            "user_id": user_id,
            "expires_at": datetime.now(timezone.utc) + SESSION_DURATION,
        },
    )
    return token


async def get_session_user(token):
    if not token:
        return None
    return await database.fetch_one(
        f"""SELECT {", ".join("u." + f for f in USER_FIELDS.split(", "))} FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = :hash AND s.expires_at > now()""",
        values={"hash": hash_token(token)},
    )


async def delete_session(token):
    await database.execute("DELETE FROM sessions WHERE token_hash = :hash", values={"hash": hash_token(token)})


async def delete_other_sessions(user_id, keep_token):
    await database.execute(
        "DELETE FROM sessions WHERE user_id = :user_id AND token_hash <> :hash",
        values={"user_id": user_id, "hash": hash_token(keep_token)},
    )
