from unicodedata import normalize

def normalize_string(s: str) -> str:
    return normalize("NFKC", s)

def normalize_grid(game_data):
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
