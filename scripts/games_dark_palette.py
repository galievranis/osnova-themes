"""User-approved literal Games colors from the v004 export."""
import json
from pathlib import Path

def games_dark_palette():
    return json.loads((Path(__file__).resolve().parent.parent / 'showcase/games-extension-palette.json').read_text())['dark']
