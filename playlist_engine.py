"""
PHOTIFY Dynamic Playlist Engine
================================
Auto-updating playlists based on listening habits, file timestamps, and play counts.
"""
import time
import json
import database as db
from config import (
    RECENTLY_ADDED_DAYS, HEAVY_ROTATION_MIN_PLAYS, HEAVY_ROTATION_DAYS,
    FORGOTTEN_GEMS_MIN_PLAYS, FORGOTTEN_GEMS_DAYS, FORGOTTEN_GEMS_MIN_RATING
)

# Dynamic playlist definitions
DYNAMIC_PLAYLISTS = [
    {
        "name": "Recently Added",
        "description": "Fresh tracks added in the last 2 weeks",
        "rule": {"type": "recently_added", "days": RECENTLY_ADDED_DAYS, "limit": 50}
    },
    {
        "name": "Heavy Rotation",
        "description": "Your most played tracks this week",
        "rule": {"type": "heavy_rotation", "min_plays": HEAVY_ROTATION_MIN_PLAYS,
                 "days": HEAVY_ROTATION_DAYS, "limit": 30}
    },
    {
        "name": "Forgotten Gems",
        "description": "Old favorites you haven't played in a while",
        "rule": {"type": "forgotten_gems", "min_plays": FORGOTTEN_GEMS_MIN_PLAYS,
                 "days": FORGOTTEN_GEMS_DAYS, "min_rating": FORGOTTEN_GEMS_MIN_RATING, "limit": 30}
    },
    {
        "name": "Skip-Free Zone",
        "description": "Tracks you never skip — pure quality",
        "rule": {"type": "skip_free", "max_skip_ratio": 0.1, "min_plays": 3, "limit": 50}
    },
    {
        "name": "New Discoveries",
        "description": "Tracks you haven't fully explored yet",
        "rule": {"type": "new_discoveries", "max_plays": 2, "days": 30, "limit": 40}
    },
    {
        "name": "Top Rated",
        "description": "Your highest rated tracks",
        "rule": {"type": "top_rated", "min_rating": 4, "limit": 50}
    },
]


def init_dynamic_playlists():
    """Create all dynamic playlists if they don't exist yet."""
    existing = db.get_all_playlists()
    existing_names = {p["name"] for p in existing}
    for dp in DYNAMIC_PLAYLISTS:
        if dp["name"] not in existing_names:
            db.create_playlist(dp["name"], dp["description"], is_dynamic=True, dynamic_rule=dp["rule"])


def evaluate_rule(rule):
    """Evaluate a dynamic playlist rule and return matching track IDs."""
    rule_type = rule.get("type")
    limit = rule.get("limit", 50)
    now = time.time()

    if rule_type == "recently_added":
        days = rule.get("days", 14)
        cutoff = now - (days * 86400)
        tracks = db.get_all_tracks(sort_by="date_added", order="DESC")
        return [t["id"] for t in tracks if t.get("date_added") and t["date_added"] > cutoff][:limit]

    elif rule_type == "heavy_rotation":
        min_plays = rule.get("min_plays", 5)
        days = rule.get("days", 7)
        cutoff = now - (days * 86400)
        tracks = db.get_all_tracks(sort_by="play_count", order="DESC")
        return [t["id"] for t in tracks
                if (t.get("play_count", 0) or 0) >= min_plays
                and t.get("last_played") and t["last_played"] > cutoff][:limit]

    elif rule_type == "forgotten_gems":
        min_plays = rule.get("min_plays", 3)
        days = rule.get("days", 60)
        min_rating = rule.get("min_rating", 0)
        cutoff = now - (days * 86400)
        tracks = db.get_all_tracks(sort_by="play_count", order="DESC")
        result = []
        for t in tracks:
            pc = t.get("play_count", 0) or 0
            lp = t.get("last_played")
            rating = t.get("rating", 0) or 0
            if pc >= min_plays and lp and lp < cutoff and rating >= min_rating:
                result.append(t["id"])
            if len(result) >= limit:
                break
        return result

    elif rule_type == "skip_free":
        max_ratio = rule.get("max_skip_ratio", 0.1)
        min_plays = rule.get("min_plays", 3)
        tracks = db.get_all_tracks(sort_by="play_count", order="DESC")
        result = []
        for t in tracks:
            pc = t.get("play_count", 0) or 0
            sc = t.get("skip_count", 0) or 0
            total = pc + sc
            if total >= min_plays:
                ratio = sc / total if total > 0 else 0
                if ratio <= max_ratio:
                    result.append(t["id"])
            if len(result) >= limit:
                break
        return result

    elif rule_type == "new_discoveries":
        max_plays = rule.get("max_plays", 2)
        days = rule.get("days", 30)
        cutoff = now - (days * 86400)
        tracks = db.get_all_tracks(sort_by="date_added", order="DESC")
        return [t["id"] for t in tracks
                if (t.get("play_count", 0) or 0) <= max_plays
                and t.get("date_added") and t["date_added"] > cutoff][:limit]

    elif rule_type == "top_rated":
        min_rating = rule.get("min_rating", 4)
        tracks = db.get_all_tracks(sort_by="rating", order="DESC")
        return [t["id"] for t in tracks
                if (t.get("rating", 0) or 0) >= min_rating][:limit]

    return []


def refresh_playlist(playlist_id):
    """Re-evaluate a dynamic playlist and update its tracks."""
    playlist = db.get_playlist(playlist_id)
    if not playlist or not playlist.get("is_dynamic"):
        return False

    rule = playlist.get("dynamic_rule")
    if isinstance(rule, str):
        try:
            rule = json.loads(rule)
        except json.JSONDecodeError:
            return False

    if not rule:
        return False

    track_ids = evaluate_rule(rule)
    db.set_playlist_tracks(playlist_id, track_ids)
    return True


def refresh_all_dynamic_playlists():
    """Refresh all dynamic playlists."""
    playlists = db.get_all_playlists()
    for p in playlists:
        if p.get("is_dynamic"):
            refresh_playlist(p["id"])
