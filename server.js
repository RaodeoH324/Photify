// PHOTIFY Server — Express REST API
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const scanner = require('./scanner-node');

const app = express();
const PORT = 5001;
const STATIC = path.join(__dirname, 'static');
const MUSIC_DIRS_DEFAULT = [path.join(require('os').homedir(), 'Music'), 'D:\\Music'];
const MIME = {
  '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.opus': 'audio/opus', '.wma': 'audio/x-ms-wma'
};
const VIBES = ['chill', 'hype', 'melancholy', 'romantic', 'aggressive', 'peaceful', 'dark',
  'uplifting', 'dreamy', 'intense', 'groovy', 'ethereal', 'raw', 'nostalgic', 'triumphant'];

app.use(express.json());
app.use('/static', express.static(STATIC));
app.get('/', (req, res) => res.sendFile(path.join(STATIC, 'index.html')));

const exportLibraryToJson = () => {
  try {
    const lib = db.exportLibrary();
    fs.writeFileSync(path.join(__dirname, 'photify-library.json'), JSON.stringify(lib, null, 2));
    console.log('✅ photify-library.json updated automatically.');
  } catch (e) {
    console.error('Failed to export library:', e);
  }
};

// ─── Scan ──────────────────────────────────────────────
app.post('/api/scan', (req, res) => {
  const dirs = (req.body && req.body.directories) || db.getSetting('music_directories', MUSIC_DIRS_DEFAULT);
  db.setSetting('music_directories', dirs);
  scanner.scan(dirs).then(() => initDynamicPlaylists());
  res.json({ status: 'scanning', directories: dirs });
});
app.get('/api/scan/status', (req, res) => res.json(scanner.getStatus()));

// ─── Tracks ────────────────────────────────────────────
app.get('/api/tracks', (req, res) => {
  res.json(db.getAllTracks({
    sort: req.query.sort, order: req.query.order,
    limit: req.query.limit ? +req.query.limit : undefined, offset: +(req.query.offset || 0),
    genre: req.query.genre, artist: req.query.artist, album: req.query.album,
    vibe: req.query.vibe, search: req.query.search
  }));
});
app.get('/api/tracks/:id', (req, res) => {
  const t = db.getTrack(+req.params.id); t ? res.json(t) : res.status(404).json({ error: 'Not found' });
});
app.patch('/api/tracks/:id', (req, res) => {
  db.updateTrack(+req.params.id, req.body);
  const updated = db.getTrack(+req.params.id);
  exportLibraryToJson();
  res.json(updated);
});

// Stream with Range support
app.get('/api/tracks/:id/stream', (req, res) => {
  const t = db.getTrack(+req.params.id);
  if (!t || !fs.existsSync(t.file_path)) return res.status(404).json({ error: 'Not found' });
  const ext = path.extname(t.file_path).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const stat = fs.statSync(t.file_path), size = stat.size;
  const range = req.headers.range;
  if (range) {
    const [, s, e] = range.match(/bytes=(\d+)-(\d*)/) || [];
    const start = +s, end = e ? +e : size - 1, len = end - start + 1;
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': len, 'Content-Type': mime });
    fs.createReadStream(t.file_path, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': size, 'Content-Type': mime });
    fs.createReadStream(t.file_path).pipe(res);
  }
});

app.get('/api/tracks/:id/cover', (req, res) => {
  const t = db.getTrack(+req.params.id);
  if (t && t.cover_art_path && fs.existsSync(t.cover_art_path)) return res.sendFile(t.cover_art_path);
  res.sendFile(path.join(STATIC, 'default-cover.svg'));
});
app.post('/api/tracks/:id/play', (req, res) => {
  db.logPlay(+req.params.id, req.body.duration_played || 0, false, null, req.body.context || 'library');
  res.json({ ok: true });
});
app.post('/api/tracks/:id/skip', (req, res) => {
  const id = +req.params.id, t = db.getTrack(id);
  const skipTime = req.body.skip_time || 0;
  const isReal = t && t.duration && skipTime < t.duration * 0.8;
  db.logPlay(id, skipTime, isReal, skipTime, req.body.context || 'library');
  res.json({ ok: true });
});

// ─── Search / Browse ───────────────────────────────────
app.get('/api/search', (req, res) => {
  const q = req.query.q || ''; res.json(q.length < 2 ? [] : db.searchTracks(q));
});
app.get('/api/albums', (req, res) => res.json(db.getAlbums()));
app.get('/api/albums/:name/tracks', (req, res) => res.json(db.getAlbumTracks(req.params.name, req.query.artist)));
app.get('/api/artists', (req, res) => res.json(db.getArtists()));
app.get('/api/artists/:name/tracks', (req, res) => res.json(db.getArtistTracks(req.params.name)));
app.get('/api/genres', (req, res) => res.json(db.getGenres()));

// ─── Playlists ─────────────────────────────────────────
app.get('/api/playlists', (req, res) => res.json(db.getPlaylists()));
app.post('/api/playlists', (req, res) => {
  const id = db.createPlaylist(req.body.name || 'Untitled', req.body.description || '');
  res.status(201).json(db.getPlaylist(id));
});
app.get('/api/playlists/:id', (req, res) => {
  const p = db.getPlaylist(+req.params.id); p ? res.json(p) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/playlists/:id', (req, res) => { db.deletePlaylist(+req.params.id); res.json({ ok: true }); });
app.get('/api/playlists/:id/tracks', (req, res) => res.json(db.getPlaylistTracks(+req.params.id)));
app.post('/api/playlists/:id/tracks', (req, res) => {
  db.addToPlaylist(+req.params.id, req.body.track_id); res.json({ ok: true });
});
app.delete('/api/playlists/:id/tracks', (req, res) => {
  db.removeFromPlaylist(+req.params.id, req.body.track_id); res.json({ ok: true });
});
app.post('/api/playlists/:id/refresh', (req, res) => { refreshPlaylist(+req.params.id); res.json({ ok: true }); });

// ─── Shuffle ───────────────────────────────────────────
app.post('/api/shuffle', (req, res) => {
  let tracks;
  if (req.body.track_ids) tracks = req.body.track_ids.map(id => db.getTrack(id)).filter(Boolean);
  else tracks = db.getAllTracks({ genre: req.body.genre, vibe: req.body.vibe, artist: req.body.artist });
  res.json(smartShuffle(tracks));
});

// ─── Stats & Config ────────────────────────────────────
app.get('/api/stats', (req, res) => res.json(db.getStats()));
app.get('/api/config', (req, res) => res.json({ music_directories: db.getSetting('music_directories', MUSIC_DIRS_DEFAULT), vibe_options: VIBES }));
app.post('/api/config', (req, res) => {
  if (req.body.music_directories) db.setSetting('music_directories', req.body.music_directories);
  res.json({ ok: true });
});
app.get('/api/history', (req, res) => res.json(db.getHistory(+(req.query.limit || 50))));

// ─── Smart Shuffle Engine ──────────────────────────────
function smartShuffle(tracks) {
  if (!tracks.length) return [];
  // Weighted shuffle
  const weighted = tracks.map(t => {
    let w = 1.0;
    if ((t.play_count || 0) === 0) w *= 1.5;
    const total = (t.play_count || 0) + (t.skip_count || 0);
    if (total > 2) { const sr = (t.skip_count || 0) / total; if (sr > 0.7) w *= 0.1; else if (sr > 0.4) w *= 0.5; }
    if (t.last_played) { const h = (Date.now() / 1000 - t.last_played) / 3600; if (h < 2) w *= 0.3; else if (h < 24) w *= 0.7; }
    if ((t.rating || 0) >= 4) w *= 1.3; else if ((t.rating || 0) >= 3) w *= 1.1;
    return { track: t, weight: w };
  });
  // Weighted random sampling
  const result = [];
  while (weighted.length) {
    const total = weighted.reduce((s, x) => s + x.weight, 0);
    if (total <= 0) { weighted.forEach(x => result.push(x.track)); break; }
    let r = Math.random() * total, cum = 0;
    for (let i = 0; i < weighted.length; i++) {
      cum += weighted[i].weight;
      if (cum >= r) { result.push(weighted[i].track); weighted.splice(i, 1); break; }
    }
  }
  // Constraint: no same artist back-to-back
  for (let i = 1; i < result.length; i++) {
    if (result[i].artist && result[i].artist === result[i - 1].artist) {
      for (let j = i + 1; j < Math.min(i + 15, result.length); j++) {
        if (!result[j].artist || result[j].artist !== result[i - 1].artist) {
          [result[i], result[j]] = [result[j], result[i]]; break;
        }
      }
    }
  }
  return result.map(t => t.id);
}

// ─── Dynamic Playlists ─────────────────────────────────
const DYNAMIC_DEFS = [
  { name: 'Recently Added', desc: 'Fresh tracks from the last 2 weeks', rule: { type: 'recently_added', days: 14, limit: 50 } },
  { name: 'Heavy Rotation', desc: 'Your most played this week', rule: { type: 'heavy_rotation', min_plays: 5, days: 7, limit: 30 } },
  { name: 'Skip-Free Zone', desc: 'Tracks you never skip', rule: { type: 'skip_free', max_ratio: 0.1, min_plays: 3, limit: 50 } },
  { name: 'New Discoveries', desc: "Tracks you haven't explored yet", rule: { type: 'new_discoveries', max_plays: 2, days: 30, limit: 40 } },
  { name: 'Top Rated', desc: 'Your highest rated tracks', rule: { type: 'top_rated', min_rating: 4, limit: 50 } },
];

function initDynamicPlaylists() {
  const existing = new Set(db.getPlaylists().map(p => p.name));
  for (const d of DYNAMIC_DEFS) {
    if (!existing.has(d.name)) db.createPlaylist(d.name, d.desc, true, d.rule);
  }
  db.getPlaylists().filter(p => p.is_dynamic).forEach(p => refreshPlaylist(p.id));
}

function refreshPlaylist(id) {
  const p = db.getPlaylist(id);
  if (!p || !p.is_dynamic || !p.dynamic_rule) return;
  let rule; try { rule = JSON.parse(p.dynamic_rule) } catch { return; }
  const n = Date.now() / 1000, lim = rule.limit || 50;
  let ids = [];
  const tracks = db.getAllTracks({ sort: 'date_added', order: 'DESC' });
  if (rule.type === 'recently_added') {
    const cut = n - (rule.days || 14) * 86400;
    ids = tracks.filter(t => t.date_added && t.date_added > cut).map(t => t.id).slice(0, lim);
  } else if (rule.type === 'heavy_rotation') {
    const cut = n - (rule.days || 7) * 86400;
    ids = db.getAllTracks({ sort: 'play_count', order: 'DESC' }).filter(t => (t.play_count || 0) >= (rule.min_plays || 5) && t.last_played && t.last_played > cut).map(t => t.id).slice(0, lim);
  } else if (rule.type === 'skip_free') {
    ids = db.getAllTracks({ sort: 'play_count', order: 'DESC' }).filter(t => {
      const tot = (t.play_count || 0) + (t.skip_count || 0);
      return tot >= (rule.min_plays || 3) && (tot > 0 ? (t.skip_count || 0) / tot : 0) <= (rule.max_ratio || 0.1);
    }).map(t => t.id).slice(0, lim);
  } else if (rule.type === 'new_discoveries') {
    const cut = n - (rule.days || 30) * 86400;
    ids = tracks.filter(t => (t.play_count || 0) <= (rule.max_plays || 2) && t.date_added && t.date_added > cut).map(t => t.id).slice(0, lim);
  } else if (rule.type === 'top_rated') {
    ids = db.getAllTracks({ sort: 'rating', order: 'DESC' }).filter(t => (t.rating || 0) >= (rule.min_rating || 4)).map(t => t.id).slice(0, lim);
  }
  db.setPlaylistTracks(id, ids);
}

// ─── Start ─────────────────────────────────────────────
async function start() {
  await db.init();
  initDynamicPlaylists();
  app.listen(PORT, () => {
    console.log(`\n  ● PHOTIFY Music Player`);
    console.log(`  🎵 http://localhost:${PORT}`);
    console.log(`  🎨 Press Ctrl+C to stop\n`);
  });
}

start().catch(console.error);
