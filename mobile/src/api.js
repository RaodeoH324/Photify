export const GOOGLE_API_KEY = 'AIzaSyBsZji6_j3h5tGmCeRxXbanz-6jMz49OHY';
export const DRIVE_FOLDER_ID = '1YekdhqbTb0t2buDNDhzbuXH9RWo23T6R';

let cachedTracks = null;

const GENRES = [
  'Bollywood', 'Classical', 'Ghazal', 'Bhajan', 'Qawwali', 
  'Punjabi', 'Marathi', 'Tamil', 'Telugu', 'Malayalam', 'Bengali'
];

// Helper to assign a deterministic genre based on string hash
const getGenreForTrack = (title) => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GENRES[Math.abs(hash) % GENRES.length];
};

export const fetchTracksFromDrive = async (forceRefresh = false) => {
  // Check if cache was cleared from Settings
  if (global.__photifyClearCache) {
    cachedTracks = null;
    global.__photifyClearCache = false;
    forceRefresh = true;
  }
  if (cachedTracks && !forceRefresh) return cachedTracks;
  
  try {
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents&fields=files(id,name,mimeType)&key=${GOOGLE_API_KEY}&pageSize=1000`;
    const listRes = await fetch(listUrl);
    if (!listRes.ok) {
      const errorText = await listRes.text();
      console.error(`Drive API Error (${listRes.status}): ${errorText}`);
      throw new Error(`Google Drive API returned ${listRes.status}. Check your API Key and Folder permissions.`);
    }
    const listData = await listRes.json();
    
    if (!listData.files) {
      console.warn("No files found in the specified Drive folder.");
      return [];
    }

    const driveFiles = listData.files;
    
    // 1. Find and fetch library metadata if it exists
    let metadataMap = {};
    const libFile = driveFiles.find(f => f.name === 'photify-library.json');
    if (libFile) {
      try {
        const libRes = await fetch(`https://www.googleapis.com/drive/v3/files/${libFile.id}?alt=media&key=${GOOGLE_API_KEY}`);
        const libData = await libRes.json();
        if (Array.isArray(libData)) {
          libData.forEach(item => {
            metadataMap[item.filename] = item;
          });
        }
      } catch (e) {
        console.warn("Failed to load photify-library.json", e);
      }
    }

    const tracks = [];
    const images = driveFiles.filter(f => f.name.match(/\.(jpg|jpeg|png)$/i));

    const SONG_ARTISTS = {
      'shararat': 'Shashwat Sachdev',
      'ishq jala kar karwaan': 'Shashwat Sachdev, Roshan',
      'Tum Se Hi': 'Pritam',
      'Tum Tak': 'A.R. Rahman',
      'Chal Ga Sakhe': 'Abhanga Repost',
      'Jai Aadhyashakti': 'Chintan Trivedi'
    };

    driveFiles.forEach((file) => {
      const fileName = file.name || 'Untitled';
      if (fileName === 'photify-library.json') return;
      
      const isAudio = file.mimeType?.includes('audio') || /\.(mp3|wav|m4a|flac|aac)$/i.test(fileName);
      if (!isAudio) return;
      
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      
      // Automatic image matching
      const matchingImg = images.find(img => img.name.startsWith(baseName));
      const coverUrl = matchingImg 
        ? `https://www.googleapis.com/drive/v3/files/${matchingImg.id}?alt=media&key=${GOOGLE_API_KEY}`
        : null;

      // 2. Use metadata from JSON if available, otherwise fall back to manual mapping or filename
      const meta = metadataMap[fileName] || {};
      
      let artist = meta.artist || 'Unknown Artist';
      if (artist === 'Unknown Artist') {
        for (const [key, value] of Object.entries(SONG_ARTISTS)) {
          if (baseName.toLowerCase().includes(key.toLowerCase())) {
            artist = value;
            break;
          }
        }
      }

      tracks.push({
        id: file.id,
        title: meta.title || baseName,
        artist: artist,
        album: meta.album || 'Photify Collection',
        genre: meta.genre || getGenreForTrack(baseName),
        lyrics: meta.lyrics || null,
        coverUrl: coverUrl,
        streamUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${GOOGLE_API_KEY}`
      });
    });

    tracks.sort((a, b) => a.title.localeCompare(b.title));
    cachedTracks = tracks;
    return tracks;
  } catch (error) {
    console.error("Error fetching from Drive:", error);
    return [];
  }
};


export const fetchPlaylists = async () => {
  const tracks = await fetchTracksFromDrive();
  return [
    { id: 'liked', name: 'Liked Songs', track_count: 0, isLiked: true },
    { id: 1, name: 'All Songs', track_count: tracks.length },
    { id: 2, name: 'Recent Hits', track_count: Math.min(tracks.length, 5) },
    { id: 3, name: 'Party Mix', track_count: 0 },
    { id: 4, name: 'Workout', track_count: 0 },
  ];
};

export const fetchPlaylistTracks = async (id) => {
  const allTracks = await fetchTracksFromDrive();
  if (id === 'liked') return []; // Will be handled by local state
  if (id === 3 || id === 4 || id === 5) return []; 
  return allTracks;
};

export const logPlay = async (id, duration_played) => {};
export const logSkip = async (id, skip_time) => {};

