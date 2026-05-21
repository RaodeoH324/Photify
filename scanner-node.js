// PHOTIFY Scanner — Node.js music metadata extraction
const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');
const crypto = require('crypto');
const db = require('./db');

const SUPPORTED = new Set(['.mp3','.flac','.wav','.ogg','.m4a','.aac','.opus','.wma']);
const COVERS_DIR = path.join(__dirname, 'covers');
if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, {recursive:true});

const state = { scanning:false, total_files:0, processed:0, new_tracks:0, updated_tracks:0, errors:0, current_file:'' };

function getStatus() { return {...state}; }

function findAudioFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    (function walk(d) {
      try {
        for (const entry of fs.readdirSync(d, {withFileTypes:true})) {
          const fp = path.join(d, entry.name);
          if (entry.isDirectory()) walk(fp);
          else if (SUPPORTED.has(path.extname(entry.name).toLowerCase())) files.push(fp);
        }
      } catch(e) {}
    })(dir);
  }
  return files;
}

async function extractCover(metadata, filePath) {
  try {
    const pics = metadata.common.picture;
    if (!pics || !pics.length) return null;
    const hash = crypto.createHash('md5').update(filePath).digest('hex');
    const artPath = path.join(COVERS_DIR, hash + '.jpg');
    if (!fs.existsSync(artPath)) fs.writeFileSync(artPath, pics[0].data);
    return artPath;
  } catch(e) { return null; }
}

async function extractMetadata(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const meta = await mm.parseFile(filePath, {skipCovers:false});
    const c = meta.common;
    const coverPath = await extractCover(meta, filePath);
    return {
      file_path: filePath, file_size: stat.size, file_modified: stat.mtimeMs/1000,
      duration: meta.format.duration || 0,
      title: c.title || path.basename(filePath, path.extname(filePath)),
      artist: c.artist || null, album: c.album || null,
      album_artist: c.albumartist || null, genre: c.genre ? c.genre[0] : null,
      year: c.year || null, track_number: c.track ? c.track.no : null,
      bpm: c.bpm || null, cover_art_path: coverPath,
    };
  } catch(e) { return null; }
}

async function scan(dirs) {
  Object.assign(state, {scanning:true,total_files:0,processed:0,new_tracks:0,updated_tracks:0,errors:0,current_file:''});
  const files = findAudioFiles(dirs);
  state.total_files = files.length;

  // Build lookup of existing tracks
  const existing = {};
  db.getAllTracks().forEach(t => { existing[t.file_path] = t; });

  for (const fp of files) {
    state.current_file = path.basename(fp);
    try {
      const stat = fs.statSync(fp);
      const ex = existing[fp];
      if (ex && ex.file_modified && ex.file_modified >= stat.mtimeMs/1000) {
        state.processed++; continue;
      }
      const meta = await extractMetadata(fp);
      if (meta) {
        db.upsertTrack(meta);
        ex ? state.updated_tracks++ : state.new_tracks++;
      } else { state.errors++; }
    } catch(e) { state.errors++; }
    state.processed++;
  }

  // Remove deleted files
  const found = new Set(files);
  db.getAllTracks().forEach(t => {
    if (!found.has(t.file_path)) {
      try { db.run && db.run("DELETE FROM tracks WHERE id=?", [t.id]); } catch(e) {}
    }
  });

  state.scanning = false;
  state.current_file = '';
  return {...state};
}

module.exports = { scan, getStatus, findAudioFiles };
