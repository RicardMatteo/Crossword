import asyncio
import hashlib
import hmac
import secrets

# scrypt from the standard library: no extra dependency for password hashing
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1


def _scrypt(password, salt, n, r, p):
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=n, r=r, p=p, dklen=32)


async def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = await asyncio.to_thread(_scrypt, password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


async def verify_password(password, stored):
    try:
        _, n, r, p, salt, digest = stored.split("$")
        computed = await asyncio.to_thread(_scrypt, password, bytes.fromhex(salt), int(n), int(r), int(p))
    except ValueError:
        return False
    return hmac.compare_digest(computed.hex(), digest)


def new_session_token():
    return secrets.token_urlsafe(32)


def hash_token(token):
    # Only the hash is stored: a leaked sessions table can't be replayed
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
