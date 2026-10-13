from crud.game_crud import get_random_grid
from crud.user_crud import name_taken
from services.twitch_chat import CHANNEL_RE, TwitchChat, chat_word
from utils.normalize import normalize_grid
from types import SimpleNamespace
import uuid

from core.game_modes.normal_game import NormalGame
from core.game_modes.coop_game import CoopGame
from core.game_modes.base_game import Game
from utils.game_status import GameStatus

GAMES = {}

async def get_room(room_id) -> "Game | None":
    """Retrieve the game instance for a given room ID."""
    return GAMES.get(room_id, None)


async def validate_word(attempt) -> None:
    """Method to validate a word attempt."""
    game = GAMES.get(attempt.room_id)
    if not game:
        print(f"Room not found for room_id {attempt.room_id}")
        return

    await apply_word(game, attempt)


async def apply_word(game, attempt) -> None:
    await game.validate_word(attempt)
    await game.broadcast_progress(attempt.token)
    await game.on_player_progress(attempt.token)


GAME_MODES = {"classic": NormalGame, "coop": CoopGame}


def apply_mode(game) -> Game:
    """Switch the room to the mode picked in the lobby, keeping players, owner, grid and settings."""
    cls = GAME_MODES.get(game.next_mode, NormalGame)
    if type(game) is cls:
        return game
    new_game = cls(game.room_id, game.grid, game.owner)
    new_game.players = game.players
    new_game.copy_settings_from(game)
    new_game.reset_progress()
    GAMES[game.room_id] = new_game
    return new_game


async def restart_room(game) -> None:
    """Start a new round in the same room with a fresh grid."""
    grid = await get_random_grid()
    if grid:
        await game.reset(normalize_grid(grid))


async def create_room(room_id, owner, game_mode="classic") -> dict:
    """Create a new game room."""
    if room_id in GAMES:
        return {"error": "Room already exists"}

    grid = await get_random_grid()
    if not grid:
        return {"error": "No grid available"}

    grid = normalize_grid(grid)

    if game_mode == "coop":
        game = CoopGame(room_id, grid, owner)
    else:
        game = NormalGame(room_id, grid, owner)

    GAMES[room_id] = game

    return {
        "message": "Room created successfully",
        "room_id": room_id,
        "grid": grid,
    }
 

async def check_new_name(game, name, user):
    """Error code if `name` can't be used by a player joining `game`, else None."""
    if any(p.is_connected and p.name.lower() == name.lower() for p in game.players.values()):
        return "name_taken"
    # A guest can't borrow the name of an account
    if user is None and await name_taken(name):
        return "name_reserved"
    return None


async def join_room(room_id, websocket, name, token=None, user=None) -> dict:
    """Join an existing game room or create a new one if it doesn't exist.

    `user` is the logged-in account, if any: it imposes the player's name.
    """
    if user:
        name = user["name"]
    name = (name or "").strip()[:20]
    if not name:
        return {"error": "name_required"}

    game = GAMES.get(room_id)
    if not game:
        created = await create_room(room_id, None)
        if "error" in created:
            return created
        game = GAMES[room_id]

    if not token or token not in game.players:
        if game.is_full():
            return {"error": "room_full"}
        error = await check_new_name(game, name, user)
        if error:
            return {"error": error}
        token = f"{room_id}-{uuid.uuid4()}"
        while token in game.players:
            token = f"{room_id}-{uuid.uuid4()}"
        await websocket.send_json({"type": "token", "token": token, "room_id": room_id})
        await game.join(websocket, name, token)
        game.players[token].user_id = user["id"] if user else None
    else:
        print(f"Reconnecting player {name} with token {token} in room {room_id}")
        await websocket.send_json({"type": "token", "token": token, "room_id": room_id})
        player = game.players[token]
        player.reconnect(websocket)
        player.name = name
        if user:
            player.user_id = user["id"]

    # The first player (or the first one back if the owner left) owns the room
    owner = game.players.get(game.owner)
    if owner is None or not owner.is_connected:
        game.owner = token

    if game.twitch_channel and room_id not in TWITCH_CHATS:
        start_twitch(game)

    await game.send_message_to_all(game.players_message())
    await websocket.send_json(game.settings_message())
    if game.twitch_channel:
        await websocket.send_json(game.twitch_message())

    # Bring a (re)joining player up to speed with the game's state
    if game.status == GameStatus.IN_PROGRESS:
        await websocket.send_json(game.started_message())
        if game.end_at:
            await websocket.send_json(game.countdown_message())
    elif game.status == GameStatus.COMPLETED:
        await websocket.send_json(game.started_message())
        await websocket.send_json(game.finished_message(token))

    await game.send_initial_progress(websocket, token)
    await game.send_other_players_progress(websocket, token)

    return {"message": "Joined room successfully", "token": token, "room": game}

# --- Twitch plays -----------------------------------------------------------

TWITCH_CHATS = {}  # room_id -> TwitchChat reading the room's linked channel


async def on_twitch_message(room_id, viewer, text):
    """A message made of a single grid word fills it, wherever it is."""
    game = GAMES.get(room_id)
    if not game or game.status != GameStatus.IN_PROGRESS or game.twitch_token not in game.players:
        return
    guess = chat_word(text)
    if not guess:
        return
    token = game.twitch_token
    for word in game.grid["placed_words"]:
        if word["word"] != guess or game.is_word_found(token, word):
            continue
        # Credit the viewer before applying: the last word ends the game and sends the results.
        # They score the letters still missing and every word this one completes, crossings included.
        progress = game.get_progress_for(token)
        cells = set(game.word_cells(word))
        letters = sum(not progress[r][c] for r, c in cells)
        words = sum(
            1 for w in game.grid["placed_words"]
            if not game.is_word_found(token, w) and all(progress[r][c] or (r, c) in cells for r, c in game.word_cells(w))
        )
        game.credit_viewer(viewer, guess, letters, words)
        await apply_word(game, SimpleNamespace(
            room_id=room_id, token=token, guess=guess, length=word["length"],
            row=word["row"], col=word["col"], direction=word["direction"],
        ))
        await game.send_message_to_all(game.twitch_message())
        return  # one occurrence per message


async def on_twitch_status(room_id, status):
    game = GAMES.get(room_id)
    if game and game.twitch_channel:
        game.twitch_status = status
        await game.send_message_to_all(game.twitch_message())


def start_twitch(game):
    room_id = game.room_id
    stop_twitch(room_id)
    chat = TwitchChat(
        game.twitch_channel,
        on_message=lambda viewer, text, login: on_twitch_message(room_id, viewer, text),
        on_status=lambda status: on_twitch_status(room_id, status),
    )
    TWITCH_CHATS[room_id] = chat
    chat.start()


def stop_twitch(room_id):
    chat = TWITCH_CHATS.pop(room_id, None)
    if chat:
        chat.stop()


async def link_twitch(game, channel) -> None:
    """Owner, in the lobby: let `channel`'s chat play in the room (None unlinks)."""
    if game.status != GameStatus.WAITING_FOR_PLAYERS:
        return
    channel = (channel or "").strip().lstrip("#").lower()
    if channel and not CHANNEL_RE.match(channel):
        await game.send_message_to_all({"type": "twitch", "error": "invalid_channel", **game.twitch_message()})
        return
    if channel:
        game.add_twitch_player(channel)
        start_twitch(game)
    else:
        stop_twitch(game.room_id)
        game.remove_twitch_player()
    await game.send_message_to_all(game.players_message())
    await game.send_message_to_all(game.twitch_message())
