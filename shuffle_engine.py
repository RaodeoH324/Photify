"""
PHOTIFY Shuffle Engine
======================
Fisher-Yates Smart Shuffle with constraint solving.
Not just random — it FEELS right.
"""

import random
import time
import database as db
from config import (
    SHUFFLE_NO_REPEAT_ARTIST_WINDOW,
    SHUFFLE_NO_REPEAT_ALBUM_WINDOW,
    SHUFFLE_RECENTLY_PLAYED_PENALTY,
    SHUFFLE_HIGH_SKIP_THRESHOLD,
    SHUFFLE_UNPLAYED_BOOST
)


def fisher_yates_shuffle(arr):
    """Classic Fisher-Yates (Knuth) shuffle — O(n) unbiased permutation."""
    result = arr[:]
    for i in range(len(result) - 1, 0, -1):
        j = random.randint(0, i)
        result[i], result[j] = result[j], result[i]
    return result


def calculate_weight(track):
    """Calculate a weight for track selection priority.

    Higher weight = more likely to appear earlier in shuffle.
    Factors:
      - Unplayed tracks get a boost (surface new music)
      - High skip ratio gets penalized (user doesn't like it)
      - Recently played gets penalized (avoid repetition)
      - Higher rated tracks get a small boost
    """
    weight = 1.0

    play_count = track.get("play_count", 0)
    skip_count = track.get("skip_count", 0)
    rating = track.get("rating", 0)
    last_played = track.get("last_played")

    # Unplayed boost
    if play_count == 0:
        weight *= SHUFFLE_UNPLAYED_BOOST

    # Skip ratio penalty
    total = play_count + skip_count
    if total > 2:
        skip_ratio = skip_count / total
        if skip_ratio > SHUFFLE_HIGH_SKIP_THRESHOLD:
            weight *= 0.1  # Heavily penalize chronic skips
        elif skip_ratio > 0.4:
            weight *= 0.5

    # Recency penalty (played within last 2 hours)
    if last_played:
        hours_ago = (time.time() - last_played) / 3600
        if hours_ago < 2:
            weight *= SHUFFLE_RECENTLY_PLAYED_PENALTY
        elif hours_ago < 24:
            weight *= 0.7

    # Rating boost
    if rating >= 4:
        weight *= 1.3
    elif rating >= 3:
        weight *= 1.1

    return weight


def weighted_shuffle(tracks):
    """Shuffle weighted by track quality/history.

    Uses weighted random sampling: tracks with higher weights
    are more likely to be placed earlier in the queue.
    """
    if not tracks:
        return []

    weighted = [(t, calculate_weight(t)) for t in tracks]
    result = []

    while weighted:
        total_weight = sum(w for _, w in weighted)
        if total_weight <= 0:
            # Fallback to pure Fisher-Yates
            remaining = [t for t, _ in weighted]
            result.extend(fisher_yates_shuffle(remaining))
            break

        r = random.uniform(0, total_weight)
        cumulative = 0
        for i, (track, weight) in enumerate(weighted):
            cumulative += weight
            if cumulative >= r:
                result.append(track)
                weighted.pop(i)
                break

    return result


def apply_constraints(tracks):
    """Post-shuffle constraint solver.

    Rules:
    1. No same artist back-to-back (within window)
    2. No same album within N positions
    3. Best-effort — won't infinite loop
    """
    if len(tracks) <= 2:
        return tracks

    result = tracks[:]
    max_attempts = len(result) * 3

    for attempt in range(max_attempts):
        swapped = False
        for i in range(1, len(result)):
            # Check artist adjacency constraint
            artist_violation = False
            for j in range(max(0, i - SHUFFLE_NO_REPEAT_ARTIST_WINDOW), i):
                if (result[i].get("artist") and result[j].get("artist") and
                    result[i]["artist"] == result[j]["artist"]):
                    artist_violation = True
                    break

            # Check album proximity constraint
            album_violation = False
            for j in range(max(0, i - SHUFFLE_NO_REPEAT_ALBUM_WINDOW), i):
                if (result[i].get("album") and result[j].get("album") and
                    result[i]["album"] == result[j]["album"]):
                    album_violation = True
                    break

            if artist_violation or album_violation:
                # Try to find a better position
                best_swap = None
                best_distance = 0
                for k in range(i + 1, min(i + 20, len(result))):
                    ok = True
                    # Check if swapping k to position i fixes things
                    for j in range(max(0, i - SHUFFLE_NO_REPEAT_ARTIST_WINDOW), i):
                        if (result[k].get("artist") and result[j].get("artist") and
                            result[k]["artist"] == result[j]["artist"]):
                            ok = False
                            break
                    if ok:
                        for j in range(max(0, i - SHUFFLE_NO_REPEAT_ALBUM_WINDOW), i):
                            if (result[k].get("album") and result[j].get("album") and
                                result[k]["album"] == result[j]["album"]):
                                ok = False
                                break
                    if ok and (k - i) > best_distance:
                        best_swap = k
                        best_distance = k - i

                if best_swap:
                    result[i], result[best_swap] = result[best_swap], result[i]
                    swapped = True

        if not swapped:
            break

    return result


def smart_shuffle(track_ids=None, genre=None, vibe=None, artist=None):
    """Generate a smart shuffled queue.

    Args:
        track_ids: Optional specific list of track IDs to shuffle.
        genre/vibe/artist: Optional filters to apply before shuffling.

    Returns:
        List of track IDs in shuffled order.
    """
    if track_ids:
        tracks = [db.get_track(tid) for tid in track_ids]
        tracks = [t for t in tracks if t]
    else:
        kwargs = {}
        if genre: kwargs["genre"] = genre
        if vibe: kwargs["vibe"] = vibe
        if artist: kwargs["artist"] = artist
        tracks = db.get_all_tracks(**kwargs)

    if not tracks:
        return []

    # Step 1: Weighted shuffle (smart ordering)
    shuffled = weighted_shuffle(tracks)

    # Step 2: Apply constraints (no artist/album clustering)
    constrained = apply_constraints(shuffled)

    return [t["id"] for t in constrained]
