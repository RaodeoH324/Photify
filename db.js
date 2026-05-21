// PHOTIFY Database Layer (sql.js)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, 'photify.db');
let db = null;

async function init() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  db.run("PRAGMA foreign_keys=ON");
  db.run(`CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, file_path TEXT UNIQUE NOT NULL,
    title TEXT, artist TEXT, album TEXT, album_artist TEXT, genre TEXT,
    year INTEGER, track_number INTEGER, duration REAL, bpm INTEGER, vibe TEXT,
    file_size INTEGER, file_modified REAL, date_added REAL, cover_art_path TEXT,
    play_count INTEGER DEFAULT 0, skip_count INTEGER DEFAULT 0,
    last_played REAL, last_skipped REAL, rating INTEGER DEFAULT 0,
    lyrics TEXT,
    created_at REAL, updated_at REAL)`);
  db.run(`CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT,
    is_dynamic BOOLEAN DEFAULT 0, dynamic_rule TEXT, cover_art_path TEXT,
    created_at REAL, updated_at REAL)`);
  db.run(`CREATE TABLE IF NOT EXISTS playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
    position INTEGER, added_at REAL, UNIQUE(playlist_id, track_id))`);
  db.run(`CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
    played_at REAL, duration_played REAL, was_skipped BOOLEAN DEFAULT 0,
    skip_time REAL, context TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at REAL)`);
  // Indices
  const idxs = ['artist','album','genre','vibe','play_count','date_added','last_played'];
  idxs.forEach(c => db.run(`CREATE INDEX IF NOT EXISTS idx_t_${c} ON tracks(${c})`));
  
  // Migration: Add lyrics column if it doesn't exist
  try {
    db.run("ALTER TABLE tracks ADD COLUMN lyrics TEXT");
  } catch(e) {
    // Column likely already exists
  }

  save();
  return db;
}

function save() { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); }
function run(sql, params=[]) { db.run(sql, params); save(); }
function get(sql, params=[]) { const s=db.prepare(sql); s.bind(params); return s.step()?s.getAsObject():null; }
function all(sql, params=[]) {
  const s=db.prepare(sql); s.bind(params);
  const rows=[]; while(s.step()) rows.push(s.getAsObject());
  s.free(); return rows;
}
function now() { return Date.now()/1000; }

// ─── Track CRUD ────────────────────────────────────────
function upsertTrack(d) {
  const t = now();
  const ex = get("SELECT id FROM tracks WHERE file_path=?", [d.file_path]);
  if (ex) {
    run(`UPDATE tracks SET title=?,artist=?,album=?,album_artist=?,genre=?,year=?,
      track_number=?,duration=?,bpm=?,file_size=?,file_modified=?,cover_art_path=?,updated_at=?
      WHERE file_path=?`, [d.title,d.artist,d.album,d.album_artist,d.genre,d.year,
      d.track_number,d.duration,d.bpm,d.file_size,d.file_modified,d.cover_art_path,t,d.file_path]);
    return ex.id;
  }
  run(`INSERT INTO tracks (file_path,title,artist,album,album_artist,genre,year,track_number,
    duration,bpm,file_size,file_modified,date_added,cover_art_path,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [d.file_path,d.title,d.artist,d.album,
    d.album_artist,d.genre,d.year,d.track_number,d.duration,d.bpm,d.file_size,
    d.file_modified,t,d.cover_art_path,t,t]);
  return get("SELECT last_insert_rowid() as id").id;
}

function getTrack(id) { return get("SELECT * FROM tracks WHERE id=?", [id]); }

function getAllTracks(opts={}) {
  let q="SELECT * FROM tracks WHERE 1=1", p=[];
  if(opts.genre){q+=" AND genre=?";p.push(opts.genre);}
  if(opts.artist){q+=" AND artist=?";p.push(opts.artist);}
  if(opts.album){q+=" AND album=?";p.push(opts.album);}
  if(opts.vibe){q+=" AND vibe=?";p.push(opts.vibe);}
  if(opts.search){q+=" AND (title LIKE ? OR artist LIKE ? OR album LIKE ?)";
    const s=`%${opts.search}%`;p.push(s,s,s);}
  const valid=new Set(['title','artist','album','genre','year','duration','play_count','date_added','last_played','rating','bpm']);
  const sort=valid.has(opts.sort)?opts.sort:'title';
  const ord=opts.order==='DESC'?'DESC':'ASC';
  q+=` ORDER BY ${sort} ${ord}`;
  if(opts.limit){q+=" LIMIT ? OFFSET ?";p.push(opts.limit,opts.offset||0);}
  return all(q,p);
}

function updateTrack(id, u) {
  const ok=new Set(['title','artist','album','genre','vibe','rating','bpm','lyrics']);
  const fields=Object.keys(u).filter(k=>ok.has(k));
  if(!fields.length) return false;
  fields.push('updated_at');
  const vals=fields.map(f=>f==='updated_at'?now():u[f]);
  run(`UPDATE tracks SET ${fields.map(f=>f+'=?').join(',')} WHERE id=?`, [...vals,id]);
  return true;
}

function searchTracks(q) {
  const s=`%${q}%`;
  return all("SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? OR genre LIKE ? ORDER BY play_count DESC LIMIT 50",[s,s,s,s]);
}

function getAlbums() {
  return all(`SELECT album,album_artist as artist,MIN(cover_art_path) as cover_art_path,
    COUNT(*) as track_count,MIN(year) as year FROM tracks WHERE album IS NOT NULL AND album!=''
    GROUP BY album,album_artist ORDER BY album ASC`);
}
function getArtists() {
  return all(`SELECT artist,COUNT(*) as track_count,SUM(play_count) as total_plays,
    MIN(cover_art_path) as cover_art_path FROM tracks WHERE artist IS NOT NULL AND artist!=''
    GROUP BY artist ORDER BY artist ASC`);
}
function getGenres() {
  return all("SELECT genre,COUNT(*) as track_count FROM tracks WHERE genre IS NOT NULL AND genre!='' GROUP BY genre ORDER BY track_count DESC");
}
function getAlbumTracks(album,artist) {
  if(artist) return all("SELECT * FROM tracks WHERE album=? AND (album_artist=? OR artist=?) ORDER BY track_number ASC",[album,artist,artist]);
  return all("SELECT * FROM tracks WHERE album=? ORDER BY track_number ASC",[album]);
}
function getArtistTracks(artist) {
  return all("SELECT * FROM tracks WHERE artist=? OR album_artist=? ORDER BY album ASC,track_number ASC",[artist,artist]);
}

// ─── Play History ──────────────────────────────────────
function logPlay(trackId,dur,skipped=false,skipTime=null,ctx='library') {
  run("INSERT INTO play_history (track_id,played_at,duration_played,was_skipped,skip_time,context) VALUES (?,?,?,?,?,?)",
    [trackId,now(),dur,skipped?1:0,skipTime,ctx]);
  if(skipped) run("UPDATE tracks SET skip_count=skip_count+1,last_skipped=?,updated_at=? WHERE id=?",[now(),now(),trackId]);
  else run("UPDATE tracks SET play_count=play_count+1,last_played=?,updated_at=? WHERE id=?",[now(),now(),trackId]);
}
function getHistory(limit=50) {
  return all(`SELECT h.*,t.title,t.artist,t.album,t.cover_art_path,t.duration FROM play_history h
    JOIN tracks t ON h.track_id=t.id ORDER BY h.played_at DESC LIMIT ?`,[limit]);
}

// ─── Playlists ─────────────────────────────────────────
function createPlaylist(name,desc='',isDynamic=false,rule=null) {
  const t=now();
  run("INSERT INTO playlists (name,description,is_dynamic,dynamic_rule,created_at,updated_at) VALUES (?,?,?,?,?,?)",
    [name,desc,isDynamic?1:0,rule?JSON.stringify(rule):null,t,t]);
  return get("SELECT last_insert_rowid() as id").id;
}
function getPlaylists() {
  return all("SELECT p.*,COUNT(pt.id) as track_count FROM playlists p LEFT JOIN playlist_tracks pt ON p.id=pt.playlist_id GROUP BY p.id ORDER BY p.updated_at DESC");
}
function getPlaylist(id) {
  return get("SELECT p.*,COUNT(pt.id) as track_count FROM playlists p LEFT JOIN playlist_tracks pt ON p.id=pt.playlist_id WHERE p.id=? GROUP BY p.id",[id]);
}
function deletePlaylist(id) { run("DELETE FROM playlists WHERE id=?",[id]); }
function getPlaylistTracks(id) {
  return all("SELECT t.*,pt.position FROM playlist_tracks pt JOIN tracks t ON pt.track_id=t.id WHERE pt.playlist_id=? ORDER BY pt.position",[id]);
}
function addToPlaylist(pid,tid) {
  const r=get("SELECT COALESCE(MAX(position),-1)+1 as p FROM playlist_tracks WHERE playlist_id=?",[pid]);
  run("INSERT OR IGNORE INTO playlist_tracks (playlist_id,track_id,position,added_at) VALUES (?,?,?,?)",[pid,tid,r.p,now()]);
}
function removeFromPlaylist(pid,tid) { run("DELETE FROM playlist_tracks WHERE playlist_id=? AND track_id=?",[pid,tid]); }
function setPlaylistTracks(pid,tids) {
  run("DELETE FROM playlist_tracks WHERE playlist_id=?",[pid]);
  tids.forEach((id,i)=>run("INSERT INTO playlist_tracks (playlist_id,track_id,position,added_at) VALUES (?,?,?,?)",[pid,id,i,now()]));
}

// ─── Stats ─────────────────────────────────────────────
function getStats() {
  return {
    total_tracks: (get("SELECT COUNT(*) as c FROM tracks")||{}).c||0,
    total_artists: (get("SELECT COUNT(DISTINCT artist) as c FROM tracks WHERE artist IS NOT NULL")||{}).c||0,
    total_albums: (get("SELECT COUNT(DISTINCT album) as c FROM tracks WHERE album IS NOT NULL")||{}).c||0,
    total_genres: (get("SELECT COUNT(DISTINCT genre) as c FROM tracks WHERE genre IS NOT NULL")||{}).c||0,
    total_duration: (get("SELECT SUM(duration) as d FROM tracks")||{}).d||0,
    total_plays: (get("SELECT SUM(play_count) as c FROM tracks")||{}).c||0,
    recently_played: all("SELECT * FROM tracks WHERE last_played IS NOT NULL ORDER BY last_played DESC LIMIT 10"),
    top_artists: all("SELECT artist,SUM(play_count) as plays FROM tracks WHERE artist IS NOT NULL GROUP BY artist ORDER BY plays DESC LIMIT 5"),
  };
}

// ─── Settings ──────────────────────────────────────────
function getSetting(key,def=null) {
  const r=get("SELECT value FROM settings WHERE key=?",[key]);
  if(r) try{return JSON.parse(r.value)}catch{return r.value}
  return def;
}
function setSetting(key,val) {
  run("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
    [key,JSON.stringify(val),now()]);
}

function exportLibrary() {
  const tracks = all("SELECT file_path, title, artist, album, duration, genre, lyrics FROM tracks");
  return tracks.map(t => ({
    filename: path.basename(t.file_path),
    title: t.title || path.basename(t.file_path, path.extname(t.file_path)),
    artist: t.artist || 'Unknown Artist',
    album: t.album || 'Unknown Album',
    duration: t.duration || 0,
    genre: t.genre || 'None',
    lyrics: t.lyrics || null
  }));
}

module.exports = {
  init,save,upsertTrack,getTrack,getAllTracks,updateTrack,searchTracks,
  getAlbums,getArtists,getGenres,getAlbumTracks,getArtistTracks,
  logPlay,getHistory,createPlaylist,getPlaylists,getPlaylist,deletePlaylist,
  getPlaylistTracks,addToPlaylist,removeFromPlaylist,setPlaylistTracks,
  getStats,getSetting,setSetting,exportLibrary,now
};
