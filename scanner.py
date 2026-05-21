"""
PHOTIFY Scanner
===============
Recursive directory scanner with metadata extraction using mutagen.
Extracts ID3 tags, album art, BPM, and duration from audio files.
"""

import os
import time
import hashlib
from mutagen import File as MutagenFile
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.oggvorbis import OggVorbis
from mutagen.mp4 import MP4
from mutagen.id3 import ID3

from config import SUPPORTED_EXTENSIONS, COVERS_DIR
import database as db

# Scan state for progress tracking
scan_state = {
    "scanning": False,
    "total_files": 0,
    "processed": 0,
    "new_tracks": 0,
    "updated_tracks": 0,
    "errors": 0,
    "current_file": "",
}


def reset_scan_state():
    scan_state.update({
        "scanning": False, "total_files": 0, "processed": 0,
        "new_tracks": 0, "updated_tracks": 0, "errors": 0, "current_file": ""
    })


def find_audio_files(directories):
    """Recursively find all audio files in given directories."""
    audio_files = []
    for directory in directories:
        if not os.path.isdir(directory):
            continue
        for root, dirs, files in os.walk(directory):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in SUPPORTED_EXTENSIONS:
                    audio_files.append(os.path.join(root, f))
    return audio_files


def extract_cover_art(audio, file_path):
    """Extract embedded album art and save to covers directory."""
    try:
        art_data = None

        if isinstance(audio, MP3) or hasattr(audio, 'tags') and isinstance(audio.tags, ID3):
            tags = audio.tags
            if tags:
                for key in tags:
                    if key.startswith("APIC"):
                        art_data = tags[key].data
                        break

        elif isinstance(audio, FLAC):
            if audio.pictures:
                art_data = audio.pictures[0].data

        elif isinstance(audio, MP4):
            covr = audio.tags.get("covr")
            if covr:
                art_data = bytes(covr[0])

        elif isinstance(audio, OggVorbis):
            import base64
            pics = audio.get("metadata_block_picture")
            if pics:
                from mutagen.flac import Picture
                pic = Picture(base64.b64decode(pics[0]))
                art_data = pic.data

        if art_data:
            # Use hash of file path for consistent naming
            art_hash = hashlib.md5(file_path.encode()).hexdigest()
            art_path = os.path.join(COVERS_DIR, f"{art_hash}.jpg")
            if not os.path.exists(art_path):
                with open(art_path, "wb") as f:
                    f.write(art_data)
            return art_path

    except Exception:
        pass
    return None


def get_tag(audio, keys, default=None):
    """Safely extract a tag value from audio metadata."""
    if audio.tags is None:
        return default
    for key in keys:
        try:
            val = audio.tags.get(key)
            if val:
                if isinstance(val, list):
                    return str(val[0])
                return str(val)
        except Exception:
            continue
    return default


def extract_metadata(file_path):
    """Extract all metadata from an audio file."""
    try:
        audio = MutagenFile(file_path)
        if audio is None:
            return None

        stat = os.stat(file_path)
        data = {
            "file_path": file_path,
            "file_size": stat.st_size,
            "file_modified": stat.st_mtime,
            "duration": audio.info.length if audio.info else 0,
        }

        # MP3 (ID3 tags)
        if isinstance(audio, MP3):
            tags = audio.tags
            if tags:
                data["title"] = get_tag(audio, ["TIT2"])
                data["artist"] = get_tag(audio, ["TPE1"])
                data["album"] = get_tag(audio, ["TALB"])
                data["album_artist"] = get_tag(audio, ["TPE2"])
                data["genre"] = get_tag(audio, ["TCON"])
                try:
                    yr = get_tag(audio, ["TDRC", "TYER"])
                    if yr: data["year"] = int(str(yr)[:4])
                except (ValueError, TypeError):
                    pass
                try:
                    tn = get_tag(audio, ["TRCK"])
                    if tn: data["track_number"] = int(str(tn).split("/")[0])
                except (ValueError, TypeError):
                    pass
                bpm = get_tag(audio, ["TBPM"])
                if bpm:
                    try: data["bpm"] = int(float(str(bpm)))
                    except: pass

        # FLAC
        elif isinstance(audio, FLAC):
            data["title"] = get_tag(audio, ["title"])
            data["artist"] = get_tag(audio, ["artist"])
            data["album"] = get_tag(audio, ["album"])
            data["album_artist"] = get_tag(audio, ["albumartist"])
            data["genre"] = get_tag(audio, ["genre"])
            try:
                yr = get_tag(audio, ["date", "year"])
                if yr: data["year"] = int(str(yr)[:4])
            except: pass
            try:
                tn = get_tag(audio, ["tracknumber"])
                if tn: data["track_number"] = int(str(tn).split("/")[0])
            except: pass
            bpm = get_tag(audio, ["bpm"])
            if bpm:
                try: data["bpm"] = int(float(str(bpm)))
                except: pass

        # OGG Vorbis
        elif isinstance(audio, OggVorbis):
            data["title"] = get_tag(audio, ["title"])
            data["artist"] = get_tag(audio, ["artist"])
            data["album"] = get_tag(audio, ["album"])
            data["album_artist"] = get_tag(audio, ["albumartist"])
            data["genre"] = get_tag(audio, ["genre"])
            try:
                yr = get_tag(audio, ["date"])
                if yr: data["year"] = int(str(yr)[:4])
            except: pass
            try:
                tn = get_tag(audio, ["tracknumber"])
                if tn: data["track_number"] = int(str(tn).split("/")[0])
            except: pass

        # MP4/M4A/AAC
        elif isinstance(audio, MP4):
            tags = audio.tags
            if tags:
                data["title"] = _mp4_tag(tags, "\xa9nam")
                data["artist"] = _mp4_tag(tags, "\xa9ART")
                data["album"] = _mp4_tag(tags, "\xa9alb")
                data["album_artist"] = _mp4_tag(tags, "aART")
                data["genre"] = _mp4_tag(tags, "\xa9gen")
                try:
                    yr = _mp4_tag(tags, "\xa9day")
                    if yr: data["year"] = int(str(yr)[:4])
                except: pass
                try:
                    trkn = tags.get("trkn")
                    if trkn: data["track_number"] = trkn[0][0]
                except: pass
                bpm_val = tags.get("tmpo")
                if bpm_val:
                    try: data["bpm"] = int(bpm_val[0])
                    except: pass

        # Generic fallback
        else:
            if audio.tags:
                data["title"] = get_tag(audio, ["title", "TIT2", "\xa9nam"])
                data["artist"] = get_tag(audio, ["artist", "TPE1", "\xa9ART"])
                data["album"] = get_tag(audio, ["album", "TALB", "\xa9alb"])
                data["genre"] = get_tag(audio, ["genre", "TCON", "\xa9gen"])

        # Fallback title from filename
        if not data.get("title"):
            data["title"] = os.path.splitext(os.path.basename(file_path))[0]

        # Extract cover art
        data["cover_art_path"] = extract_cover_art(audio, file_path)

        return data

    except Exception as e:
        print(f"Error extracting metadata from {file_path}: {e}")
        return None


def _mp4_tag(tags, key):
    val = tags.get(key)
    if val and isinstance(val, list):
        return str(val[0])
    return None


def scan_directories(directories):
    """Full library scan. Finds files, extracts metadata, updates database."""
    reset_scan_state()
    scan_state["scanning"] = True

    audio_files = find_audio_files(directories)
    scan_state["total_files"] = len(audio_files)

    existing_paths = set()

    for file_path in audio_files:
        scan_state["current_file"] = os.path.basename(file_path)
        existing_paths.add(file_path)

        # Check if file needs updating
        existing = db.get_all_tracks(search=None)
        needs_update = True
        for t in existing:
            if t["file_path"] == file_path:
                if t["file_modified"] and t["file_modified"] >= os.path.getmtime(file_path):
                    needs_update = False
                break

        if needs_update:
            metadata = extract_metadata(file_path)
            if metadata:
                track_id = db.upsert_track(metadata)
                if track_id:
                    scan_state["new_tracks"] += 1
            else:
                scan_state["errors"] += 1

        scan_state["processed"] += 1

    scan_state["scanning"] = False
    scan_state["current_file"] = ""
    return scan_state.copy()


def scan_directories_fast(directories):
    """Optimized scan that checks file modification times against DB."""
    reset_scan_state()
    scan_state["scanning"] = True

    audio_files = find_audio_files(directories)
    scan_state["total_files"] = len(audio_files)

    # Build lookup of existing tracks
    all_tracks = db.get_all_tracks()
    track_lookup = {t["file_path"]: t for t in all_tracks}
    found_paths = set()

    for file_path in audio_files:
        scan_state["current_file"] = os.path.basename(file_path)
        found_paths.add(file_path)

        try:
            stat = os.stat(file_path)
            existing = track_lookup.get(file_path)

            if existing and existing.get("file_modified") and existing["file_modified"] >= stat.st_mtime:
                # File unchanged, skip
                scan_state["processed"] += 1
                continue

            metadata = extract_metadata(file_path)
            if metadata:
                db.upsert_track(metadata)
                if existing:
                    scan_state["updated_tracks"] += 1
                else:
                    scan_state["new_tracks"] += 1
            else:
                scan_state["errors"] += 1

        except Exception as e:
            print(f"Error scanning {file_path}: {e}")
            scan_state["errors"] += 1

        scan_state["processed"] += 1

    # Remove tracks for files that no longer exist
    for path in track_lookup:
        if path not in found_paths:
            with db.get_db() as conn:
                conn.execute("DELETE FROM tracks WHERE file_path=?", (path,))

    scan_state["scanning"] = False
    scan_state["current_file"] = ""
    return scan_state.copy()


def get_scan_status():
    """Return current scan progress."""
    return scan_state.copy()
