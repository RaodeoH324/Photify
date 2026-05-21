const fs = require('fs');
const path = require('path');
const readline = require('readline');

const LIB_PATH = path.join(__dirname, 'photify-library.json');

if (!fs.existsSync(LIB_PATH)) {
  console.error('Error: photify-library.json not found. Run drive_scanner.js first.');
  process.exit(1);
}

const library = JSON.parse(fs.readFileSync(LIB_PATH, 'utf8'));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('--- PHOTIFY Metadata Editor ---');
  console.log(`Loaded ${library.length} tracks.`);
  
  while (true) {
    const search = await question('\nSearch for a song (or "exit" to save & quit): ');
    if (search.toLowerCase() === 'exit') break;

    const matches = library.filter(t => 
      t.title.toLowerCase().includes(search.toLowerCase()) || 
      t.filename.toLowerCase().includes(search.toLowerCase())
    );

    if (matches.length === 0) {
      console.log('No matches found.');
      continue;
    }

    if (matches.length > 1) {
      console.log(`Found ${matches.length} matches:`);
      matches.forEach((m, i) => console.log(`  ${i + 1}. ${m.title} (${m.artist})`));
      const choice = await question('Select track number (or 0 to cancel): ');
      const idx = parseInt(choice) - 1;
      if (idx < 0 || idx >= matches.length) continue;
      editTrack(matches[idx]);
    } else {
      await editTrack(matches[0]);
    }
  }

  fs.writeFileSync(LIB_PATH, JSON.stringify(library, null, 2));
  console.log('\n✅ Library saved. Upload photify-library.json to Google Drive now!');
  rl.close();
}

async function editTrack(track) {
  console.log(`\nEditing: ${track.title}`);
  
  const newTitle = await question(`New Title (press enter to keep "${track.title}"): `);
  if (newTitle) track.title = newTitle;

  console.log(`Current Artist: ${track.artist}`);
  const newArtist = await question(`New Artist (press enter to keep "${track.artist}"): `);
  if (newArtist) track.artist = newArtist;

  const GENRES = ['Bollywood', 'Classical', 'Ghazal', 'Bhajan', 'Qawwali', 'Punjabi', 'Marathi', 'Tamil', 'Telugu', 'Malayalam', 'Bengali'];
  console.log(`Current Genre: ${track.genre || 'None'}`);
  console.log('Available Genres: ' + GENRES.join(', '));
  const newGenre = await question(`New Genre (press enter to keep): `);
  if (newGenre) track.genre = newGenre;

  console.log(`Current Lyrics: ${track.lyrics ? (track.lyrics.substring(0, 50) + '...') : 'None'}`);
  const changeLyrics = await question('Change lyrics? (y/n): ');
  
  if (changeLyrics.toLowerCase() === 'y') {
    console.log('Enter lyrics (Type "END" on a new line when finished):');
    let lines = [];
    while (true) {
      const line = await question('');
      if (line === 'END') break;
      lines.push(line);
    }
    track.lyrics = lines.join('\n');
  }
}

main().catch(console.error);
