"""
PHOTIFY Skip Engine — Smart Skip learning and prediction.
"""
import time
import database as db
from config import SKIP_THRESHOLD_SECONDS, SKIP_RATIO_DEMOTE, REDISCOVER_DAYS

def get_skip_prediction(track_id):
    stats = db.get_track_skip_stats(track_id)
    if not stats or not stats.get("total_events") or stats["total_events"]==0:
        return 0.3
    total = stats["total_events"]
    skips = stats.get("skip_count",0) or 0
    if total < 3: return 0.3
    skip_ratio = skips / total
    avg_skip_time = stats.get("avg_skip_time")
    if avg_skip_time and avg_skip_time < SKIP_THRESHOLD_SECONDS:
        skip_ratio = min(1.0, skip_ratio * 1.3)
    return round(skip_ratio, 3)

def should_auto_skip(track_id):
    track = db.get_track(track_id)
    if not track: return False
    total = (track.get("play_count",0) or 0) + (track.get("skip_count",0) or 0)
    if total < 5: return False
    return ((track.get("skip_count",0) or 0) / total) > 0.85

def get_demoted_tracks():
    tracks = db.get_all_tracks()
    demoted = []
    for t in tracks:
        total = (t.get("play_count",0) or 0) + (t.get("skip_count",0) or 0)
        if total >= 3 and ((t.get("skip_count",0) or 0) / total) > SKIP_RATIO_DEMOTE:
            demoted.append(t["id"])
    return demoted

def get_rediscover_tracks(limit=20):
    cutoff = time.time() - (REDISCOVER_DAYS * 86400)
    tracks = db.get_all_tracks(sort_by="play_count", order="DESC")
    result = []
    for t in tracks:
        pc = t.get("play_count",0) or 0
        sc = t.get("skip_count",0) or 0
        lp = t.get("last_played")
        if pc < 3 or not lp or lp > cutoff: continue
        total = pc + sc
        if total > 0 and (sc/total) < 0.3:
            result.append(t)
        if len(result) >= limit: break
    return result

def record_skip(track_id, skip_time, context="library"):
    track = db.get_track(track_id)
    if not track: return
    duration = track.get("duration",0) or 0
    if duration > 0 and skip_time > duration * 0.8:
        db.log_play(track_id, skip_time, was_skipped=False, context=context)
    else:
        db.log_play(track_id, skip_time, was_skipped=True, skip_time=skip_time, context=context)

def record_complete_play(track_id, duration_played, context="library"):
    db.log_play(track_id, duration_played, was_skipped=False, context=context)
