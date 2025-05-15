import json
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import unicodedata
from fastapi.middleware.cors import CORSMiddleware
import hashlib
from pydantic import BaseModel
from fastapi import WebSocket, WebSocketDisconnect
import uuid

app = FastAPI()
# Middleware pour gérer les CORS
# Cela permet à votre application de répondre aux requêtes provenant d'autres origines
# (comme votre frontend)



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # URL de votre frontend
    allow_credentials=True,
    allow_methods=["*"],  # Autoriser toutes les méthodes (GET, POST, etc.)
    allow_headers=["*"],  # Autoriser tous les en-têtes
)

ROOMS = {}


def normalize_string(s: str) -> str:
    """
    Normalise la chaîne Unicode pour assurer une représentation cohérente des caractères accentués.
    """
    return unicodedata.normalize("NFKC", s) # Utilisation de NFKC Normalization

def load_game_data():
    """Charge les données du jeu à partir du fichier JSON."""
    with open("game_data.json", "r", encoding="utf-8") as f:
        game_data = json.load(f)
    # Normaliser les chaînes de caractères dans les données chargées
    normalized_game_data = {}
    for key, value in game_data.items():
        if isinstance(value, str):
            normalized_game_data[key] = normalize_string(value)
        elif isinstance(value, list):
            normalized_game_data[key] = [normalize_string(item) if isinstance(item, str) else item for item in value]
        elif isinstance(value, dict): #pour gérer les definitions
             normalized_game_data[key] = {k: normalize_string(v) if isinstance(v, str) else v for k, v in value.items()}
        else:
            normalized_game_data[key] = value
    return normalized_game_data

game_data = load_game_data() # Charger et normaliser les données une seule fois à l'initialisation

# On génère un hash SHA-256 pour chaque mot (côté backend)
for word in game_data["placed_words"]:
    word["hash"] = hashlib.sha256(word["word"].encode()).hexdigest()


@app.get("/api/grid")
async def get_grid():
    """Retourne les données du jeu au format JSON, en spécifiant l'encodage UTF-8."""
    return JSONResponse(content={
        "grid_structure": game_data["grid_structure"],
        "definitions_horizontal": game_data["definitions_horizontal"],
        "definitions_vertical": game_data["definitions_vertical"],
        "grid_def_order": game_data["grid_def_order"],
        # placed_words mais en retirant le mot
        "placed_words": [
            {k: v for k, v in word.items() if k != "word"} for word in game_data["placed_words"]
        ]
    }, media_type="application/json; charset=utf-8")

class WordAttempt(BaseModel):
    """Modèle de données pour une tentative de mot."""
    row: int
    col: int
    direction: str
    guess: str

@app.post("/api/submit_word")
async def submit_word(attempt: WordAttempt):
    """Soumet une tentative de mot et retourne si elle est correcte."""
    for word in game_data["placed_words"]:
        if (word["row"], word["col"], word["direction"]) == (attempt.row, attempt.col, attempt.direction):
            return {"valid": word["word"].upper() == attempt.guess.upper()}
    return {"error": "Unknown word location"}

@app.post("/api/submit_word_hash")
async def submit_word_hash(attempt: WordAttempt):
    """Soumet une tentative de mot et retourne si elle est correcte."""
    for word in game_data["placed_words"]:
        if (word["row"], word["col"], word["direction"]) == (attempt.row, attempt.col, attempt.direction):
            return {"valid": word["hash"] == hashlib.sha256(attempt.guess.encode()).hexdigest()}
    return {"error": "Unknown word location"}

"""
@app.websocket("/ws/{room_id}/{player}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player: str):
    await websocket.accept()
    room = ROOMS.setdefault(room_id, {"players": {}, "grid": game_data})
    room["players"][player] = websocket

    try:
        while True:
            data = await websocket.receive_json()
            if data["type"] == "word_validated":
                # Broadcast to all other players
                for name, sock in room["players"].items():
                    if name != player:
                        await sock.send_json({
                            "type": "player_progress",
                            "from": player,
                            "row": data["row"],
                            "col": data["col"],
                            "direction": data["direction"],
                            "length": data["length"]
                        })
    except WebSocketDisconnect:
        del room["players"][player]
"""

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    # Réception de l'identité initiale
    try:
        init = await websocket.receive_json()
    except WebSocketDisconnect:
        print("WebSocket closed before receiving initial identity")
        return
    token = init.get("token")
    name = init.get("name")

    # Création de la room si elle n'existe pas
    if room_id not in ROOMS:
        ROOMS[room_id] = {
            "players": {},       # token → websocket
            "names": {},         # token → name
            "progress": {},      # token → [[bool, ...], ...]
        }

    room = ROOMS[room_id]


    # Création d’un token si nouveau joueur
    if not token or token not in room["names"]:
        token = str(uuid.uuid4())
        room["names"][token] = name
        room["progress"][token] = [
            [False if c == '-' else None for c in row]
            for row in game_data["grid_structure"]
        ]

    room["players"][token] = websocket

    print(f"Player {name} with token {token} connected to room {room_id}")
    # Envoie du token pour persistance côté client
    await websocket.send_json({"type": "token", "token": token, "room_id": room_id})

    # Envoie de la progression des autres joueurs
    for other_token, progress in room["progress"].items():
        if other_token != token:
            await websocket.send_json({
                "type": "player_progress",
                "from": room["names"][other_token],
                "progress": progress
            })

    # Envoie de sa propre progression (pour reconnexion)
    await websocket.send_json({
        "type": "self_progress",
        "progress": room["progress"][token]
    })

    try:
        while True:
            msg = await websocket.receive_json()
            if msg["type"] == "word_validated":
                row, col = msg["row"], msg["col"]
                direction = msg["direction"]
                length = msg["length"]

                # Marquer les cases comme validées pour ce joueur
                for i in range(length):
                    r = row if direction == "H" else row + i
                    c = col + i if direction == "H" else col
                    room["progress"][token][r][c] = True

                # Broadcast aux autres
                for tkn, ws in room["players"].items():
                    if tkn != token:
                        await ws.send_json({
                            "type": "player_progress",
                            "from": room["names"][token],
                            "progress": room["progress"][token]
                        })
    except WebSocketDisconnect:
        try:
            if token in room["players"]: # Vérifier d'abord si la clé existe
                del room["players"][token]
                print(f"Player with token {token} removed from room {room_id}")
            # Ou utiliser pop qui ne lève pas d'erreur si la clé manque:
            # removed_player = room["players"].pop(token, None) # None si clé absente
            # if removed_player:
            #    print(f"Player with token {token} removed from room {room_id}")

            # Mettre à jour les autres joueurs si nécessaire
            # await manager.broadcast(...)
        except Exception as e:
            print(f"Error during cleanup for token {token} in room {room_id}: {e}")
