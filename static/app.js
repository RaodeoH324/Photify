// PHOTIFY — Core Application
const API = {
  get: (url) => fetch(url).then(r => r.json()),
  post: (url, data) => fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  patch: (url, data) => fetch(url, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  del: (url, data) => fetch(url, {method:'DELETE',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined}).then(r=>r.json()),
};

const State = {
  route:'home', tracks:[], queue:[], queueIndex:-1,
  shuffle:false, repeat:'off', volume:0.8, playing:false,
  currentTrack:null, playlists:[], searchResults:[], scanPollId:null,
  config: { music_directories: [] }
};

const audio = new Audio();
audio.volume = 0.8;

// ─── Audio Events ───────────────────────────────────────
audio.addEventListener('timeupdate', () => {
  if(!audio.duration) return;
  const pct = (audio.currentTime/audio.duration)*100;
  document.getElementById('progress-fill').style.width = pct+'%';
  document.getElementById('current-time').textContent = fmtTime(audio.currentTime);
});
audio.addEventListener('loadedmetadata', () => {
  document.getElementById('total-time').textContent = fmtTime(audio.duration);
});
audio.addEventListener('ended', () => {
  if(State.repeat==='one'){audio.currentTime=0;audio.play();return;}
  App.next();
});
audio.addEventListener('play', () => { State.playing=true; updatePlayBtn(); });
audio.addEventListener('pause', () => { State.playing=false; updatePlayBtn(); });

function fmtTime(s) {
  if(!s||isNaN(s)) return '0:00';
  const m=Math.floor(s/60), sec=Math.floor(s%60);
  return m+':'+(sec<10?'0':'')+sec;
}
function fmtDuration(s) { return fmtTime(s); }

function updatePlayBtn() {
  const icon = State.playing
    ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
    : '<polygon points="5 3 19 12 5 21 5 3"/>';
  document.getElementById('play-icon').innerHTML = icon;
}

function updatePlayerBar() {
  const t = State.currentTrack;
  document.getElementById('player-title').textContent = t ? t.title||'Unknown' : 'Not Playing';
  document.getElementById('player-artist').textContent = t ? t.artist||'Unknown Artist' : '—';
  const img = document.getElementById('player-cover-img');
  img.src = t ? `/api/tracks/${t.id}/cover` : '';
  img.onerror = () => { img.src=''; };
  document.getElementById('shuffle-btn').classList.toggle('active', State.shuffle);
  document.getElementById('repeat-btn').classList.toggle('active', State.repeat!=='off');
  document.getElementById('volume-fill').style.width = (State.volume*100)+'%';
  // Highlight playing row
  document.querySelectorAll('.track-row').forEach(r => {
    r.classList.toggle('playing', t && r.dataset.id == t.id);
  });
}

function toast(msg, type='success') {
  const el = document.createElement('div');
  el.className = 'toast '+type;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>el.remove(), 3000);
}

function coverUrl(track) {
  return track && track.id ? `/api/tracks/${track.id}/cover` : '';
}

// ─── App Controller ─────────────────────────────────────
const App = {
  async init() {
    await this.loadPlaylists();
    this.navigate('home');
    this.bindKeys();
    this.initPlayerDrag();
    // Nav clicks
    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.addEventListener('click', () => this.navigate(el.dataset.route));
    });
  },

  navigate(route, params) {
    State.route = route;
    State.routeParams = params;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const active = document.querySelector(`.nav-item[data-route="${route}"]`);
    if(active) active.classList.add('active');
    this.render();
  },

  async render() {
    const content = document.getElementById('content');
    const title = document.getElementById('page-title');
    switch(State.route) {
      case 'home': title.textContent=''; await this.renderHome(content); break;
      case 'library': title.textContent='Library'; await this.renderLibrary(content); break;
      case 'search': title.textContent='Search'; this.renderSearch(content); break;
      case 'albums': title.textContent='Albums'; await this.renderAlbums(content); break;
      case 'artists': title.textContent='Artists'; await this.renderArtists(content); break;
      case 'album': title.textContent=''; await this.renderAlbumDetail(content); break;
      case 'artist': title.textContent=''; await this.renderArtistDetail(content); break;
      case 'playlist': title.textContent=''; await this.renderPlaylistDetail(content); break;
      default: title.textContent=''; await this.renderHome(content);
    }
  },

  // ─── Home ───────────────────────────────────────────────
  async renderHome(el) {
    const stats = await API.get('/api/stats');
    const playlists = await API.get('/api/playlists');
    let html = `<div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${stats.total_tracks}</div><div class="stat-label">Tracks</div></div>
      <div class="stat-card"><div class="stat-value">${stats.total_artists}</div><div class="stat-label">Artists</div></div>
      <div class="stat-card"><div class="stat-value">${stats.total_albums}</div><div class="stat-label">Albums</div></div>
      <div class="stat-card"><div class="stat-value">${fmtDuration(stats.total_duration)}</div><div class="stat-label">Total Duration</div></div>
    </div>`;

    if(stats.total_tracks === 0) {
      html += `<div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <div class="empty-title">Your library is empty</div>
        <div class="empty-subtitle">Click "Scan Library" in the sidebar to index your music collection</div>
        <button class="empty-btn" onclick="App.triggerScan()">Scan Library</button>
      </div>`;
      el.innerHTML = html; return;
    }

    // Recently played
    if(stats.recently_played && stats.recently_played.length) {
      html += `<div class="section-header"><h2>Recently Played</h2></div><div class="card-grid">`;
      stats.recently_played.slice(0,6).forEach(t => { html += this.trackCard(t); });
      html += `</div>`;
    }

    // Dynamic playlists
    const dynamic = playlists.filter(p => p.is_dynamic && p.track_count > 0);
    if(dynamic.length) {
      html += `<div class="section-header"><h2>Made For You</h2></div><div class="card-grid">`;
      dynamic.forEach(p => {
        html += `<div class="card" onclick="App.navigate('playlist',{id:${p.id}})">
          <div class="card-img"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" fill="#1a1a1a"/>
            <text x="100" y="110" text-anchor="middle" fill="#8A2BE2" font-size="40">♫</text>
          </svg></div>
          <div class="card-title">${p.name}</div>
          <div class="card-subtitle">${p.track_count} tracks</div>
        </div>`;
      });
      html += `</div>`;
    }
    el.innerHTML = html;
  },

  trackCard(t) {
    return `<div class="card" onclick="App.playTrack(${t.id})">
      <div class="card-img"><img src="${coverUrl(t)}" onerror="this.style.display='none'" alt="">
        <button class="card-play" onclick="event.stopPropagation();App.playTrack(${t.id})">
          <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21"/></svg></button>
      </div>
      <div class="card-title">${t.title||'Unknown'}</div>
      <div class="card-subtitle">${t.artist||'Unknown Artist'}</div>
    </div>`;
  },

  // ─── Library ────────────────────────────────────────────
  async renderLibrary(el) {
    const tracks = await API.get('/api/tracks?sort=title&order=ASC');
    State.tracks = tracks;
    if(!tracks.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-title">No tracks found</div>
        <div class="empty-subtitle">Scan your music directory to get started</div>
        <button class="empty-btn" onclick="App.triggerScan()">Scan Library</button></div>`;
      return;
    }
    el.innerHTML = this.trackListHTML(tracks);
  },

  trackListHTML(tracks, showAlbum=true) {
    let html = `<div class="track-list">
      <div class="track-list-header"><span>#</span><span>Title</span><span>${showAlbum?'Album':''}</span><span>Genre</span><span>Duration</span><span></span></div>`;
    tracks.forEach((t,i) => {
      html += `<div class="track-row ${State.currentTrack&&State.currentTrack.id===t.id?'playing':''}" data-id="${t.id}"
        onclick="App.playFromList(${JSON.stringify(tracks.map(x=>x.id)).replace(/"/g,'&quot;')}, ${i})"
        oncontextmenu="App.trackContext(event,${t.id})">
        <span class="track-num">${i+1}</span>
        <span class="track-play-sm">▶</span>
        <div class="track-info">
          <div class="track-thumb"><img src="${coverUrl(t)}" onerror="this.style.display='none'" alt=""></div>
          <div class="track-meta"><div class="track-title">${t.title||'Unknown'}</div>
            <div class="track-artist-sm">${t.artist||'Unknown'}</div></div>
        </div>
        <span class="track-album">${showAlbum?(t.album||''):'--'}</span>
        <span class="track-genre">${t.genre||''}</span>
        <span class="track-duration">${fmtDuration(t.duration)}</span>
        <div class="track-actions">
          <button class="track-action-btn" onclick="event.stopPropagation(); App.openEditModal(${t.id})" title="Edit Metadata">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
      </div>`;
    });
    return html + '</div>';
  },

  // ─── Albums / Artists ───────────────────────────────────
  async renderAlbums(el) {
    const albums = await API.get('/api/albums');
    if(!albums.length){el.innerHTML='<div class="empty-state"><div class="empty-title">No albums found</div></div>';return;}
    let html = '<div class="card-grid">';
    albums.forEach(a => {
      html += `<div class="card" onclick="App.navigate('album',{name:'${encodeURIComponent(a.album)}',artist:'${encodeURIComponent(a.artist||'')}'})">
        <div class="card-img"><img src="" onerror="this.style.display='none'" alt=""></div>
        <div class="card-title">${a.album}</div>
        <div class="card-subtitle">${a.artist||'Various'} · ${a.track_count} tracks</div></div>`;
    });
    el.innerHTML = html + '</div>';
  },

  async renderArtists(el) {
    const artists = await API.get('/api/artists');
    if(!artists.length){el.innerHTML='<div class="empty-state"><div class="empty-title">No artists found</div></div>';return;}
    let html = '<div class="card-grid">';
    artists.forEach(a => {
      html += `<div class="card" onclick="App.navigate('artist',{name:'${encodeURIComponent(a.artist)}'})">
        <div class="card-img" style="border-radius:50%;overflow:hidden"><img src="" onerror="this.style.display='none'" alt=""></div>
        <div class="card-title">${a.artist}</div>
        <div class="card-subtitle">${a.track_count} tracks</div></div>`;
    });
    el.innerHTML = html + '</div>';
  },

  async renderAlbumDetail(el) {
    const p = State.routeParams;
    const name = decodeURIComponent(p.name);
    const tracks = await API.get(`/api/albums/${encodeURIComponent(name)}/tracks?artist=${p.artist||''}`);
    el.innerHTML = `<div class="section-header"><h2>${name}</h2></div>` + this.trackListHTML(tracks, false);
  },

  async renderArtistDetail(el) {
    const name = decodeURIComponent(State.routeParams.name);
    const tracks = await API.get(`/api/artists/${encodeURIComponent(name)}/tracks`);
    el.innerHTML = `<div class="section-header"><h2>${name}</h2></div>` + this.trackListHTML(tracks);
  },

  // ─── Playlist Detail ───────────────────────────────────
  async renderPlaylistDetail(el) {
    const p = await API.get(`/api/playlists/${State.routeParams.id}`);
    const tracks = await API.get(`/api/playlists/${State.routeParams.id}/tracks`);
    el.innerHTML = `<div class="section-header"><h2>${p.name}</h2>
      <span class="see-all">${p.description||''} · ${p.track_count} tracks</span></div>`
      + (tracks.length ? this.trackListHTML(tracks) : '<div class="empty-state"><div class="empty-title">Empty playlist</div></div>');
  },

  // ─── Search ─────────────────────────────────────────────
  renderSearch(el) {
    if(!State.searchResults.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-title">Search your library</div><div class="empty-subtitle">Type to find tracks, artists, and albums</div></div>';
      return;
    }
    el.innerHTML = `<div class="section-header"><h2>Results (${State.searchResults.length})</h2></div>` + this.trackListHTML(State.searchResults);
  },

  async onSearch(q) {
    if(State.route!=='search') this.navigate('search');
    if(q.length<2){State.searchResults=[];this.renderSearch(document.getElementById('content'));return;}
    State.searchResults = await API.get(`/api/search?q=${encodeURIComponent(q)}`);
    this.renderSearch(document.getElementById('content'));
  },

  // ─── Playback ───────────────────────────────────────────
  async playTrack(id) {
    const track = await API.get(`/api/tracks/${id}`);
    if(!track) return;
    State.currentTrack = track;
    audio.src = `/api/tracks/${id}/stream`;
    audio.play();
    updatePlayerBar();
    document.title = `${track.title} — PHOTIFY`;
    // Log play after 30s
    setTimeout(()=>{ if(State.currentTrack&&State.currentTrack.id===id&&audio.currentTime>30)
      API.post(`/api/tracks/${id}/play`,{duration_played:audio.currentTime}); }, 30000);
  },

  playFromList(ids, index) {
    State.queue = ids;
    State.queueIndex = index;
    this.playTrack(ids[index]);
  },

  togglePlay() {
    if(!State.currentTrack){
      if(State.queue.length) this.playTrack(State.queue[0]);
      return;
    }
    audio.paused ? audio.play() : audio.pause();
  },

  async next() {
    if(!State.queue.length) return;
    // Log skip if played < 80%
    if(State.currentTrack && audio.duration && audio.currentTime < audio.duration*0.8)
      API.post(`/api/tracks/${State.currentTrack.id}/skip`,{skip_time:audio.currentTime});

    if(State.shuffle) {
      const ids = await API.post('/api/shuffle',{track_ids:State.queue});
      if(ids.length) { State.queue=ids; State.queueIndex=0; this.playTrack(ids[0]); return; }
    }
    State.queueIndex++;
    if(State.queueIndex >= State.queue.length) {
      if(State.repeat==='all') State.queueIndex=0; else { audio.pause(); return; }
    }
    this.playTrack(State.queue[State.queueIndex]);
  },

  prev() {
    if(audio.currentTime > 3) { audio.currentTime=0; return; }
    if(!State.queue.length) return;
    State.queueIndex = Math.max(0, State.queueIndex-1);
    this.playTrack(State.queue[State.queueIndex]);
  },

  seek(e) {
    if(!audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX-rect.left)/rect.width));
    audio.currentTime = pct*audio.duration;
  },

  initPlayerDrag() {
    const track = document.getElementById('progress-track');
    let isDragging = false;
    track.addEventListener('mousedown', (e) => {
      isDragging = true;
      App.seek(e);
    });
    window.addEventListener('mousemove', (e) => {
      if(isDragging) App.seek({currentTarget: track, clientX: e.clientX});
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  },

  setVolume(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    State.volume = Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
    audio.volume = State.volume;
    document.getElementById('volume-fill').style.width = (State.volume*100)+'%';
  },

  toggleMute() {
    audio.muted = !audio.muted;
    document.getElementById('volume-fill').style.width = audio.muted?'0%':(State.volume*100)+'%';
  },

  toggleShuffle() { State.shuffle=!State.shuffle; updatePlayerBar(); toast(State.shuffle?'Shuffle on':'Shuffle off'); },
  toggleRepeat() {
    const modes=['off','all','one'];
    State.repeat=modes[(modes.indexOf(State.repeat)+1)%3];
    updatePlayerBar();
    toast('Repeat: '+State.repeat);
  },
  toggleLike() { toast('Rating saved'); },

  // ─── Context Menu ───────────────────────────────────────
  trackContext(e, id) {
    e.preventDefault();
    document.querySelectorAll('.context-menu').forEach(m=>m.remove());
    const menu = document.createElement('div');
    menu.className='context-menu';
    menu.style.left=e.clientX+'px';
    menu.style.top=e.clientY+'px';
    let items = `<div class="context-item" onclick="App.playTrack(${id});this.parentElement.remove()">▶ Play</div>
      <div class="context-item" onclick="App.addToQueue(${id});this.parentElement.remove()">+ Add to Queue</div>
      <div class="context-sep"></div>`;
    State.playlists.filter(p=>!p.is_dynamic).forEach(p=>{
      items+=`<div class="context-item" onclick="App.addToPlaylist(${p.id},${id});this.parentElement.remove()">+ ${p.name}</div>`;
    });
    menu.innerHTML=items;
    document.body.appendChild(menu);
    setTimeout(()=>document.addEventListener('click',()=>menu.remove(),{once:true}),10);
  },

  addToQueue(id) { State.queue.push(id); toast('Added to queue'); },
  async addToPlaylist(pid,tid) { await API.post(`/api/playlists/${pid}/tracks`,{track_id:tid}); toast('Added to playlist'); },

  // ─── Playlists ──────────────────────────────────────────
  async loadPlaylists() {
    State.playlists = await API.get('/api/playlists');
    const nav = document.getElementById('playlist-nav');
    nav.innerHTML = State.playlists.map(p =>
      `<div class="nav-item" onclick="App.navigate('playlist',{id:${p.id}})">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        ${p.name} ${p.track_count?`<span class="badge">${p.track_count}</span>`:''}</div>`
    ).join('');
  },

  // ─── Scan ───────────────────────────────────────────────
  async triggerScan() {
    const btn = document.getElementById('scan-btn');
    btn.disabled=true; btn.textContent='Scanning...';
    await API.post('/api/scan',{});
    this.pollScan();
  },

  pollScan() {
    if(State.scanPollId) clearInterval(State.scanPollId);
    State.scanPollId = setInterval(async()=>{
      const s = await API.get('/api/scan/status');
      const btn = document.getElementById('scan-btn');
      if(!s.scanning) {
        clearInterval(State.scanPollId);
        btn.disabled=false; btn.textContent='⟳ Scan Library';
        toast(`Scan complete: ${s.new_tracks} new tracks`);
        await this.loadPlaylists();
        this.render();
        return;
      }
      const pct = s.total_files?Math.round(s.processed/s.total_files*100):0;
      btn.textContent=`Scanning ${pct}%...`;
    }, 1000);
  },

  // ─── Keyboard Shortcuts ─────────────────────────────────
  bindKeys() {
    document.addEventListener('keydown', e => {
      if(e.target.tagName==='INPUT') return;
      switch(e.code) {
        case 'Space': e.preventDefault(); this.togglePlay(); break;
        case 'ArrowRight': if(audio.duration) audio.currentTime=Math.min(audio.duration,audio.currentTime+10); break;
        case 'ArrowLeft': audio.currentTime=Math.max(0,audio.currentTime-10); break;
        case 'KeyN': this.next(); break;
        case 'KeyP': this.prev(); break;
        case 'KeyS': this.toggleShuffle(); break;
        case 'KeyR': this.toggleRepeat(); break;
        case 'KeyM': this.toggleMute(); break;
        case 'ArrowUp': e.preventDefault(); State.volume=Math.min(1,State.volume+0.05); audio.volume=State.volume; document.getElementById('volume-fill').style.width=(State.volume*100)+'%'; break;
        case 'ArrowDown': e.preventDefault(); State.volume=Math.max(0,State.volume-0.05); audio.volume=State.volume; document.getElementById('volume-fill').style.width=(State.volume*100)+'%'; break;
        case 'Slash': case 'KeyK': if(e.ctrlKey||e.code==='Slash'){e.preventDefault();document.getElementById('search-input').focus();} break;
      }
    });
  },

  // ─── Settings ───────────────────────────────────────────
  async openSettings() {
    const config = await API.get('/api/config');
    State.config = config;
    this.renderDirectories();
    document.getElementById('settings-modal').style.display = 'flex';
  },

  closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
  },

  renderDirectories() {
    const list = document.getElementById('dir-list');
    list.innerHTML = State.config.music_directories.map((dir, i) => `
      <div class="dir-item">
        <span>${dir}</span>
        <button onclick="App.removeDirectory(${i})" title="Remove">×</button>
      </div>
    `).join('');
  },

  addDirectory() {
    const input = document.getElementById('new-dir-input');
    const val = input.value.trim();
    if (val && !State.config.music_directories.includes(val)) {
      State.config.music_directories.push(val);
      input.value = '';
      this.renderDirectories();
    }
  },

  removeDirectory(index) {
    State.config.music_directories.splice(index, 1);
    this.renderDirectories();
  },

  async saveSettings() {
    await API.post('/api/config', { music_directories: State.config.music_directories });
    this.closeSettings();
    toast('Settings saved');
    this.triggerScan(); // Automatically scan when settings are saved
  },

  // ─── Metadata Editor ────────────────────────────────────
  async openEditModal(trackId) {
    const track = await API.get(`/api/tracks/${trackId}`);
    if (!track) return;
    
    document.getElementById('edit-track-id').value = track.id;
    document.getElementById('edit-track-filename').textContent = track.file_path.split(/[\\/]/).pop();
    document.getElementById('edit-title').value = track.title || '';
    document.getElementById('edit-artist').value = track.artist || '';
    document.getElementById('edit-album').value = track.album || '';
    document.getElementById('edit-genre').value = track.genre || '';
    document.getElementById('edit-lyrics').value = track.lyrics || '';
    
    document.getElementById('edit-modal').style.display = 'flex';
  },

  closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
  },

  async saveTrackMetadata() {
    const id = document.getElementById('edit-track-id').value;
    const data = {
      title: document.getElementById('edit-title').value.trim(),
      artist: document.getElementById('edit-artist').value.trim(),
      album: document.getElementById('edit-album').value.trim(),
      genre: document.getElementById('edit-genre').value,
      lyrics: document.getElementById('edit-lyrics').value.trim()
    };

    const btn = document.querySelector('#edit-modal .modal-btn.primary');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await API.patch(`/api/tracks/${id}`, data);
      toast('Metadata updated successfully');
      this.closeEditModal();
      this.render(); // Refresh the list
      if (State.currentTrack && State.currentTrack.id == id) {
        State.currentTrack = { ...State.currentTrack, ...data };
        updatePlayerBar();
      }
    } catch (e) {
      toast('Failed to update metadata', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
