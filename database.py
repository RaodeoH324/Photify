"""
PHOTIFY Database Layer
======================
SQLite schema, init, and CRUD operations.
"""

import sqlite3
import time
import json
import os
from contextlib import contextmanager
from config import DATABASE_PATH


@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def dict_from_row(row):
    return dict(row) if row else None

def dicts_from_rows(rows):
    return [dict(r) for r in rows]


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT UNIQUE NOT NULL,
                title TEXT, artist TEXT, album TEXT, album_artist TEXT,
                genre TEXT, year INTEGER, track_number INTEGER,
                duration REAL, bpm INTEGER, vibe TEXT,
                file_size INTEGER, file_modified REAL, date_added REAL,
                cover_art_path TEXT,
                play_count INTEGER DEFAULT 0, skip_count INTEGER DEFAULT 0,
                last_played REAL, last_skipped REAL,
                rating INTEGER DEFAULT 0,
                created_at REAL, updated_at REAL
            );
            CREATE TABLE IF NOT EXISTS playlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL, description TEXT,
                is_dynamic BOOLEAN DEFAULT 0, dynamic_rule TEXT,
                cover_art_path TEXT, created_at REAL, updated_at REAL
            );
            CREATE TABLE IF NOT EXISTS playlist_tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
                track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
                position INTEGER, added_at REAL,
                UNIQUE(playlist_id, track_id)
            );
            CREATE TABLE IF NOT EXISTS play_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
                played_at REAL, duration_played REAL,
                was_skipped BOOLEAN DEFAULT 0, skip_time REAL, context TEXT
            );
            CREATE TABLE IF NOT EXISTS queue_state (
                id INTEGER PRIMARY KEY DEFAULT 1,
                current_track_id INTEGER, position REAL DEFAULT 0,
                queue_json TEXT DEFAULT '[]',
                shuffle_enabled BOOLEAN DEFAULT 0,
                repeat_mode TEXT DEFAULT 'off',
                volume REAL DEFAULT 0.8, updated_at REAL
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY, value TEXT, updated_at REAL
            );
            CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
            CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
            CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
            CREATE INDEX IF NOT EXISTS idx_tracks_vibe ON tracks(vibe);
            CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON tracks(play_count);
            CREATE INDEX IF NOT EXISTS idx_tracks_date_added ON tracks(date_added);
            CREATE INDEX IF NOT EXISTS idx_tracks_last_played ON tracks(last_played);
            CREATE INDEX IF NOT EXISTS idx_play_history_track ON play_history(track_id);
            CREATE INDEX IF NOT EXISTS idx_play_history_time ON play_history(played_at);
        """)
        conn.execute("INSERT OR IGNORE INTO queue_state (id, updated_at) VALUES (1, ?)", (time.time(),))


# ─── Track CRUD ──────────────────────────────────────────────────────────

def upsert_track(data):
    now = time.time()
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM tracks WHERE file_path=?", (data["file_path"],)).fetchone()
        if existing:
            conn.execute("""UPDATE tracks SET title=?,artist=?,album=?,album_artist=?,genre=?,
                year=?,track_number=?,duration=?,bpm=?,file_size=?,file_modified=?,
                cover_art_path=?,updated_at=? WHERE file_path=?""",
                (data.get("title"),data.get("artist"),data.get("album"),data.get("album_artist"),
                 data.get("genre"),data.get("year"),data.get("track_number"),data.get("duration"),
                 data.get("bpm"),data.get("file_size"),data.get("file_modified"),
                 data.get("cover_art_path"),now,data["file_path"]))
            return existing["id"]
        else:
            cur = conn.execute("""INSERT INTO tracks (file_path,title,artist,album,album_artist,genre,
                year,track_number,duration,bpm,file_size,file_modified,date_added,
                cover_art_path,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (data["file_path"],data.get("title"),data.get("artist"),data.get("album"),
                 data.get("album_artist"),data.get("genre"),data.get("year"),data.get("track_number"),
                 data.get("duration"),data.get("bpm"),data.get("file_size"),data.get("file_modified"),
                 now,data.get("cover_art_path"),now,now))
            return cur.lastrowid


def get_track(track_id):
    with get_db() as conn:
        return dict_from_row(conn.execute("SELECT * FROM tracks WHERE id=?", (track_id,)).fetchone())

def get_all_tracks(sort_by="title", order="ASC", limit=None, offset=0,
                   genre=None, artist=None, album=None, vibe=None, search=None):
    query = "SELECT * FROM tracks WHERE 1=1"
    params = []
    if genre: query += " AND genre=?"; params.append(genre)
    if artist: query += " AND artist=?"; params.append(artist)
    if album: query += " AND album=?"; params.append(album)
    if vibe: query += " AND vibe=?"; params.append(vibe)
    if search:
        query += " AND (title LIKE ? OR artist LIKE ? OR album LIKE ?)"
        params.extend([f"%{search}%"]*3)
    valid = {"title","artist","album","genre","year","duration","play_count","date_added","last_played","rating","bpm"}
    if sort_by not in valid: sort_by = "title"
    order = "DESC" if order.upper()=="DESC" else "ASC"
    query += f" ORDER BY {sort_by} {order}"
    if limit: query += " LIMIT ? OFFSET ?"; params.extend([limit,offset])
    with get_db() as conn:
        return dicts_from_rows(conn.execute(query, params).fetchall())

def get_track_count():
    with get_db() as conn:
        return conn.execute("SELECT COUNT(*) as c FROM tracks").fetchone()["c"]

def update_track(track_id, updates):
    allowed = {"title","artist","album","genre","vibe","rating","bpm"}
    fields = {k:v for k,v in updates.items() if k in allowed}
    if not fields: return False
    fields["updated_at"] = time.time()
    s = ", ".join(f"{k}=?" for k in fields)
    with get_db() as conn:
        conn.execute(f"UPDATE tracks SET {s} WHERE id=?", list(fields.values())+[track_id])
    return True

def increment_play_count(track_id):
    now = time.time()
    with get_db() as conn:
        conn.execute("UPDATE tracks SET play_count=play_count+1,last_played=?,updated_at=? WHERE id=?", (now,now,track_id))

def increment_skip_count(track_id):
    now = time.time()
    with get_db() as conn:
        conn.execute("UPDATE tracks SET skip_count=skip_count+1,last_skipped=?,updated_at=? WHERE id=?", (now,now,track_id))

def search_tracks(query):
    with get_db() as conn:
        return dicts_from_rows(conn.execute("""SELECT * FROM tracks
            WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? OR genre LIKE ?
            ORDER BY play_count DESC, title ASC LIMIT 50""",
            (f"%{query}%",)*4).fetchall())

# ─── Aggregation ─────────────────────────────────────────────────────────

def get_all_albums():
    with get_db() as conn:
        return dicts_from_rows(conn.execute("""SELECT album, album_artist as artist,
            MIN(cover_art_path) as cover_art_path, COUNT(*) as track_count,
            MIN(year) as year, SUM(play_count) as total_plays
            FROM tracks WHERE album IS NOT NULL AND album!=''
            GROUP BY album, album_artist ORDER BY album ASC""").fetchall())

def get_all_artists():
    with get_db() as conn:
        return dicts_from_rows(conn.execute("""SELECT artist, COUNT(*) as track_count,
            SUM(play_count) as total_plays, MIN(cover_art_path) as cover_art_path
            FROM tracks WHERE artist IS NOT NULL AND artist!=''
            GROUP BY artist ORDER BY artist ASC""").fetchall())

def get_all_genres():
    with get_db() as conn:
        return dicts_from_rows(conn.execute("""SELECT genre, COUNT(*) as track_count
            FROM tracks WHERE genre IS NOT NULL AND genre!=''
            GROUP BY genre ORDER BY track_count DESC""").fetchall())

def get_album_tracks(album, artist=None):
    with get_db() as conn:
        if artist:
            return dicts_from_rows(conn.execute("""SELECT * FROM tracks WHERE album=? AND (album_artist=? OR artist=?)
                ORDER BY track_number ASC, title ASC""", (album,artist,artist)).fetchall())
        return dicts_from_rows(conn.execute("SELECT * FROM tracks WHERE album=? ORDER BY track_number ASC", (album,)).fetchall())

def get_artist_tracks(artist):
    with get_db() as conn:
        return dicts_from_rows(conn.execute("""SELECT * FROM tracks WHERE artist=? OR album_artist=?
            ORDER BY album ASC, track_number ASC""", (artist,artist)).fetchall())

# ─── Play History ────────────────────────────────────────────────────────

def log_play(track_id, duration_played, was_skipped=False, skip_time=None, context="library"):
    with get_db() as conn:
        conn.execute("""INSERT INTO play_history (track_id,played_at,duration_played,was_skipped,skip_time,context)
            VALUES (?,?,?,?,?,?)""", (track_id,time.time(),duration_played,was_skipped,skip_time,context))
    if was_skipped: increment_skip_count(track_id)
    else: increment_play_count(track_id)

def get_play_history(limit=50):
    with get_db() as conn:
        return dicts_from_rows(conn.execute("""SELECT ph.*,t.title,t.artist,t.album,t.cover_art_path,t.duration
            FROM play_history ph JOIN tracks t ON ph.track_id=t.id
            ORDER BY ph.played_at DESC LIMIT ?""", (limit,)).fetchall())

def get_track_skip_stats(track_id):
    with get_db() as conn:
        return dict_from_row(conn.execute("""SELECT COUNT(*) as total_events,
            SUM(CASE WHEN was_skipped THEN 1 ELSE 0 END) as skip_count,
            AVG(CASE WHEN was_skipped THEN skip_time END) as avg_skip_time,
            AVG(duration_played) as avg_duration_played
            FROM play_history WHERE track_id=?""", (track_id,)).fetchone())

# ─── Playlist CRUD ──────────────────────────────────────────────────────

def create_playlist(name, description="", is_dynamic=False, dynamic_rule=None):
    now = time.time()
    with get_db() as conn:
        cur = conn.execute("INSERT INTO playlists (name,description,is_dynamic,dynamic_rule,created_at,updated_at) VALUES (?,?,?,?,?,?)",
            (name,description,is_dynamic,json.dumps(dynamic_rule) if dynamic_rule else None,now,now))
        return cur.lastrowid

def get_all_playlists():
    with get_db() as conn:
        return dicts_from_rows(conn.execute("""SELECT p.*,COUNT(pt.id) as track_count
            FROM playlists p LEFT JOIN playlist_tracks pt ON p.id=pt.playlist_id
            GROUP BY p.id ORDER BY p.updated_at DESC""").fetchall())

def get_playlist(playlist_id):
    with get_db() as conn:
        return dict_from_row(conn.execute("""SELECT p.*,COUNT(pt.id) as track_count
            FROM playlists p LEFT JOIN playlist_tracks pt ON p.id=pt.playlist_id
            WHERE p.id=? GROUP BY p.id""", (playlist_id,)).fetchone())

def update_playlist(playlist_id, updates):
    allowed = {"name","description"}
    fields = {k:v for k,v in updates.items() if k in allowed}
    if not fields: return False
    fields["updated_at"] = time.time()
    s = ", ".join(f"{k}=?" for k in fields)
    with get_db() as conn:
        conn.execute(f"UPDATE playlists SET {s} WHERE id=?", list(fields.values())+[playlist_id])
    return True

def delete_playlist(playlist_id):
    with get_db() as conn:
        conn.execute("DELETE FROM playlists WHERE id=?", (playlist_id,))

def get_playlist_tracks(playlist_id):
    with get_db() as conn:
        return dicts_from_rows(conn.execute("""SELECT t.*,pt.position,pt.added_at as playlist_added_at
            FROM playlist_tracks pt JOIN tracks t ON pt.track_id=t.id
            WHERE pt.playlist_id=? ORDER BY pt.position ASC""", (playlist_id,)).fetchall())

def add_track_to_playlist(playlist_id, track_id):
    now = time.time()
    with get_db() as conn:
        row = conn.execute("SELECT COALESCE(MAX(position),-1)+1 as p FROM playlist_tracks WHERE playlist_id=?", (playlist_id,)).fetchone()
        conn.execute("INSERT OR IGNORE INTO playlist_tracks (playlist_id,track_id,position,added_at) VALUES (?,?,?,?)",
            (playlist_id,track_id,row["p"],now))
        conn.execute("UPDATE playlists SET updated_at=? WHERE id=?", (now,playlist_id))

def remove_track_from_playlist(playlist_id, track_id):
    with get_db() as conn:
        conn.execute("DELETE FROM playlist_tracks WHERE playlist_id=? AND track_id=?", (playlist_id,track_id))
        conn.execute("UPDATE playlists SET updated_at=? WHERE id=?", (time.time(),playlist_id))

def set_playlist_tracks(playlist_id, track_ids):
    now = time.time()
    with get_db() as conn:
        conn.execute("DELETE FROM playlist_tracks WHERE playlist_id=?", (playlist_id,))
        for i,tid in enumerate(track_ids):
            conn.execute("INSERT INTO playlist_tracks (playlist_id,track_id,position,added_at) VALUES (?,?,?,?)",
                (playlist_id,tid,i,now))
        conn.execute("UPDATE playlists SET updated_at=? WHERE id=?", (now,playlist_id))

# ─── Queue State ─────────────────────────────────────────────────────────

def save_queue_state(current_track_id, position, queue, shuffle, repeat_mode, volume):
    with get_db() as conn:
        conn.execute("""UPDATE queue_state SET current_track_id=?,position=?,queue_json=?,
            shuffle_enabled=?,repeat_mode=?,volume=?,updated_at=? WHERE id=1""",
            (current_track_id,position,json.dumps(queue),shuffle,repeat_mode,volume,time.time()))

def get_queue_state():
    with get_db() as conn:
        row = conn.execute("SELECT * FROM queue_state WHERE id=1").fetchone()
        if row:
            r = dict_from_row(row)
            r["queue_json"] = json.loads(r.get("queue_json") or "[]")
            return r
        return None

# ─── Statistics ──────────────────────────────────────────────────────────

def get_library_stats():
    with get_db() as conn:
        s = {}
        s["total_tracks"] = conn.execute("SELECT COUNT(*) as c FROM tracks").fetchone()["c"]
        s["total_artists"] = conn.execute("SELECT COUNT(DISTINCT artist) as c FROM tracks WHERE artist IS NOT NULL").fetchone()["c"]
        s["total_albums"] = conn.execute("SELECT COUNT(DISTINCT album) as c FROM tracks WHERE album IS NOT NULL").fetchone()["c"]
        s["total_genres"] = conn.execute("SELECT COUNT(DISTINCT genre) as c FROM tracks WHERE genre IS NOT NULL").fetchone()["c"]
        s["total_duration"] = conn.execute("SELECT SUM(duration) as d FROM tracks").fetchone()["d"] or 0
        s["total_plays"] = conn.execute("SELECT SUM(play_count) as c FROM tracks").fetchone()["c"] or 0
        s["top_artists"] = dicts_from_rows(conn.execute("""SELECT artist,SUM(play_count) as plays FROM tracks
            WHERE artist IS NOT NULL GROUP BY artist ORDER BY plays DESC LIMIT 5""").fetchall())
        s["recently_played"] = dicts_from_rows(conn.execute("""SELECT * FROM tracks WHERE last_played IS NOT NULL
            ORDER BY last_played DESC LIMIT 10""").fetchall())
        return s

# ─── Settings ────────────────────────────────────────────────────────────

def get_setting(key, default=None):
    with get_db() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        if row:
            try: return json.loads(row["value"])
            except: return row["value"]
        return default

def set_setting(key, value):
    with get_db() as conn:
        conn.execute("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
            (key,json.dumps(value),time.time()))
