"""
PHOTIFY Configuration
=====================
Central configuration for the local music streaming ecosystem.
"""

import os

# ─── Paths ───────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "photify.db")
COVERS_DIR = os.path.join(BASE_DIR, "covers")
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Default music directories to scan (user can add more via UI)
MUSIC_DIRECTORIES = [
    os.path.expanduser("~/Music"),
    "D:\\Music",
]

# ─── Supported Audio Formats ─────────────────────────────────────────────
SUPPORTED_EXTENSIONS = {
    ".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac", ".opus", ".wma"
}

# MIME types for streaming
MIME_TYPES = {
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".opus": "audio/opus",
    ".wma": "audio/x-ms-wma",
}

# ─── Server ──────────────────────────────────────────────────────────────
HOST = "127.0.0.1"
PORT = 5000
DEBUG = True

# ─── Scanner ─────────────────────────────────────────────────────────────
SCAN_BATCH_SIZE = 50  # Process files in batches for progress reporting
COVER_ART_SIZE = (300, 300)  # Max dimensions for cached album art

# ─── Smart Shuffle ───────────────────────────────────────────────────────
SHUFFLE_NO_REPEAT_ARTIST_WINDOW = 3    # Min tracks between same artist
SHUFFLE_NO_REPEAT_ALBUM_WINDOW = 5     # Min tracks between same album
SHUFFLE_RECENTLY_PLAYED_PENALTY = 0.3  # Weight reduction for recently played
SHUFFLE_HIGH_SKIP_THRESHOLD = 0.7      # Skip ratio above this = demote
SHUFFLE_UNPLAYED_BOOST = 1.5           # Weight boost for unheard tracks

# ─── Smart Skip ──────────────────────────────────────────────────────────
SKIP_THRESHOLD_SECONDS = 10   # Skipping within this many seconds counts as a "quick skip"
SKIP_RATIO_DEMOTE = 0.7       # Skip ratio above this triggers demotion
REDISCOVER_DAYS = 30           # Days since last play to qualify as "forgotten"

# ─── Dynamic Playlists ──────────────────────────────────────────────────
RECENTLY_ADDED_DAYS = 14
HEAVY_ROTATION_MIN_PLAYS = 5
HEAVY_ROTATION_DAYS = 7
FORGOTTEN_GEMS_MIN_PLAYS = 3
FORGOTTEN_GEMS_DAYS = 60
FORGOTTEN_GEMS_MIN_RATING = 3

# ─── Vibe Options ────────────────────────────────────────────────────────
VIBE_OPTIONS = [
    "chill", "hype", "melancholy", "romantic", "aggressive",
    "peaceful", "dark", "uplifting", "dreamy", "intense",
    "groovy", "ethereal", "raw", "nostalgic", "triumphant"
]

# Ensure directories exist
os.makedirs(COVERS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
