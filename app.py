"""
PHOTIFY Flask Server
====================
REST API for the local music streaming ecosystem.
"""
import os
import re
import json
import threading
from flask import Flask, request, jsonify, send_file, send_from_directory, Response
from config import HOST, PORT, DEBUG, STATIC_DIR, COVERS_DIR, MIME_TYPES, MUSIC_DIRECTORIES, VIBE_OPTIONS
import database as db
import scanner
import shuffle_engine
import skip_engine
import playlist_engine

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/static")

# ─── Static / UI ─────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")

# ─── Library Scan ────────────────────────────────────────────────────────

@app.route("/api/scan", methods=["POST"])
def start_scan():
    data = request.get_json(silent=True) or {}
    dirs = data.get("directories", db.get_setting("music_directories", MUSIC_DIRECTORIES))
    db.set_setting("music_directories", dirs)
    def run_scan():
        scanner.scan_directories_fast(dirs)
        playlist_engine.refresh_all_dynamic_playlists()
    thread = threading.Thread(target=run_scan, daemon=True)
    thread.start()
    return jsonify({"status": "scanning", "directories": dirs})

@app.route("/api/scan/status")
def scan_status():
    return jsonify(scanner.get_scan_status())

# ─── Tracks ──────────────────────────────────────────────────────────────

@app.route("/api/tracks")
def get_tracks():
    return jsonify(db.get_all_tracks(
        sort_by=request.args.get("sort", "title"),
        order=request.args.get("order", "ASC"),
        limit=request.args.get("limit", type=int),
        offset=request.args.get("offset", 0, type=int),
        genre=request.args.get("genre"),
        artist=request.args.get("artist"),
        album=request.args.get("album"),
        vibe=request.args.get("vibe"),
        search=request.args.get("search")
    ))

@app.route("/api/tracks/<int:track_id>")
def get_track(track_id):
    track = db.get_track(track_id)
    if not track:
        return jsonify({"error": "Track not found"}), 404
    return jsonify(track)

@app.route("/api/tracks/<int:track_id>", methods=["PATCH"])
def update_track(track_id):
    data = request.get_json()
    if db.update_track(track_id, data):
        return jsonify(db.get_track(track_id))
    return jsonify({"error": "No valid fields"}), 400

@app.route("/api/tracks/<int:track_id>/stream")
def stream_track(track_id):
    track = db.get_track(track_id)
    if not track:
        return jsonify({"error": "Track not found"}), 404
    fp = track["file_path"]
    if not os.path.isfile(fp):
        return jsonify({"error": "File not found"}), 404
    ext = os.path.splitext(fp)[1].lower()
    mime = MIME_TYPES.get(ext, "application/octet-stream")
    file_size = os.path.getsize(fp)
    range_header = request.headers.get("Range")
    if range_header:
        m = re.search(r"bytes=(\d+)-(\d*)", range_header)
        if m:
            start = int(m.group(1))
            end = int(m.group(2)) if m.group(2) else file_size - 1
            end = min(end, file_size - 1)
            length = end - start + 1
            def generate():
                with open(fp, "rb") as f:
                    f.seek(start)
                    remaining = length
                    while remaining > 0:
                        chunk = f.read(min(8192, remaining))
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
            resp = Response(generate(), status=206, mimetype=mime)
            resp.headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
            resp.headers["Content-Length"] = length
            resp.headers["Accept-Ranges"] = "bytes"
            return resp
    return send_file(fp, mimetype=mime)

@app.route("/api/tracks/<int:track_id>/cover")
def get_cover(track_id):
    track = db.get_track(track_id)
    if not track or not track.get("cover_art_path"):
        return send_from_directory(STATIC_DIR, "default-cover.svg")
    if os.path.isfile(track["cover_art_path"]):
        return send_file(track["cover_art_path"])
    return send_from_directory(STATIC_DIR, "default-cover.svg")

@app.route("/api/tracks/<int:track_id>/play", methods=["POST"])
def log_play(track_id):
    data = request.get_json(silent=True) or {}
    duration = data.get("duration_played", 0)
    context = data.get("context", "library")
    skip_engine.record_complete_play(track_id, duration, context)
    return jsonify({"ok": True})

@app.route("/api/tracks/<int:track_id>/skip", methods=["POST"])
def log_skip(track_id):
    data = request.get_json(silent=True) or {}
    skip_time = data.get("skip_time", 0)
    context = data.get("context", "library")
    skip_engine.record_skip(track_id, skip_time, context)
    return jsonify({"ok": True})

# ─── Search ──────────────────────────────────────────────────────────────

@app.route("/api/search")
def search():
    q = request.args.get("q", "")
    if len(q) < 2:
        return jsonify([])
    return jsonify(db.search_tracks(q))

# ─── Albums / Artists / Genres ───────────────────────────────────────────

@app.route("/api/albums")
def get_albums():
    return jsonify(db.get_all_albums())

@app.route("/api/albums/<path:album_name>/tracks")
def get_album_tracks(album_name):
    artist = request.args.get("artist")
    return jsonify(db.get_album_tracks(album_name, artist))

@app.route("/api/artists")
def get_artists():
    return jsonify(db.get_all_artists())

@app.route("/api/artists/<path:artist_name>/tracks")
def get_artist_tracks(artist_name):
    return jsonify(db.get_artist_tracks(artist_name))

@app.route("/api/genres")
def get_genres():
    return jsonify(db.get_all_genres())

# ─── Playlists ───────────────────────────────────────────────────────────

@app.route("/api/playlists")
def get_playlists():
    return jsonify(db.get_all_playlists())

@app.route("/api/playlists", methods=["POST"])
def create_playlist():
    data = request.get_json()
    pid = db.create_playlist(data.get("name","Untitled"), data.get("description",""))
    return jsonify(db.get_playlist(pid)), 201

@app.route("/api/playlists/<int:pid>")
def get_playlist(pid):
    p = db.get_playlist(pid)
    if not p: return jsonify({"error":"Not found"}), 404
    return jsonify(p)

@app.route("/api/playlists/<int:pid>", methods=["PATCH"])
def update_playlist(pid):
    data = request.get_json()
    db.update_playlist(pid, data)
    return jsonify(db.get_playlist(pid))

@app.route("/api/playlists/<int:pid>", methods=["DELETE"])
def delete_playlist(pid):
    db.delete_playlist(pid)
    return jsonify({"ok": True})

@app.route("/api/playlists/<int:pid>/tracks")
def get_playlist_tracks(pid):
    return jsonify(db.get_playlist_tracks(pid))

@app.route("/api/playlists/<int:pid>/tracks", methods=["POST"])
def add_playlist_track(pid):
    data = request.get_json()
    db.add_track_to_playlist(pid, data["track_id"])
    return jsonify({"ok": True})

@app.route("/api/playlists/<int:pid>/tracks", methods=["DELETE"])
def remove_playlist_track(pid):
    data = request.get_json()
    db.remove_track_from_playlist(pid, data["track_id"])
    return jsonify({"ok": True})

@app.route("/api/playlists/<int:pid>/refresh", methods=["POST"])
def refresh_playlist(pid):
    playlist_engine.refresh_playlist(pid)
    return jsonify({"ok": True})

# ─── Shuffle ─────────────────────────────────────────────────────────────

@app.route("/api/shuffle", methods=["POST"])
def shuffle():
    data = request.get_json(silent=True) or {}
    ids = shuffle_engine.smart_shuffle(
        track_ids=data.get("track_ids"),
        genre=data.get("genre"),
        vibe=data.get("vibe"),
        artist=data.get("artist")
    )
    return jsonify(ids)

# ─── Queue ───────────────────────────────────────────────────────────────

@app.route("/api/queue")
def get_queue():
    return jsonify(db.get_queue_state())

@app.route("/api/queue", methods=["POST"])
def save_queue():
    data = request.get_json()
    db.save_queue_state(
        data.get("current_track_id"),
        data.get("position", 0),
        data.get("queue", []),
        data.get("shuffle", False),
        data.get("repeat_mode", "off"),
        data.get("volume", 0.8)
    )
    return jsonify({"ok": True})

# ─── Stats & Config ─────────────────────────────────────────────────────

@app.route("/api/stats")
def stats():
    return jsonify(db.get_library_stats())

@app.route("/api/config")
def get_config():
    return jsonify({
        "music_directories": db.get_setting("music_directories", MUSIC_DIRECTORIES),
        "vibe_options": VIBE_OPTIONS,
    })

@app.route("/api/config", methods=["POST"])
def save_config():
    data = request.get_json()
    if "music_directories" in data:
        db.set_setting("music_directories", data["music_directories"])
    return jsonify({"ok": True})

@app.route("/api/history")
def get_history():
    limit = request.args.get("limit", 50, type=int)
    return jsonify(db.get_play_history(limit))

# ─── Init ────────────────────────────────────────────────────────────────

def initialize():
    db.init_db()
    playlist_engine.init_dynamic_playlists()

if __name__ == "__main__":
    initialize()
    app.run(host=HOST, port=PORT, debug=DEBUG)
