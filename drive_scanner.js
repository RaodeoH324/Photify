const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');

const MUSIC_DIRS = [path.join(require('os').homedir(), 'Music'), 'D:\\Music', 'D:\\Songs'];
const SUPPORTED = new Set(['.mp3','.flac','.wav','.m4a']);

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

async function scan() {
  console.log('Scanning local directories for metadata...');
  const files = findAudioFiles(MUSIC_DIRS);
  const library = [];

  for (let i = 0; i < files.length; i++) {
    const fp = files[i];
    try {
      const meta = await mm.parseFile(fp, {skipCovers: true});
      const common = meta.common;
      
      // Try to find lyrics in metadata
      let lyrics = common.lyrics ? common.lyrics[0] : null;
      
      // If no lyrics in metadata, check for .lrc or .txt files with same name
      if (!lyrics) {
        const base = fp.substring(0, fp.lastIndexOf('.'));
        const lrcPath = base + '.lrc';
        const txtPath = base + '.txt';
        if (fs.existsSync(lrcPath)) {
          lyrics = fs.readFileSync(lrcPath, 'utf8');
        } else if (fs.existsSync(txtPath)) {
          lyrics = fs.readFileSync(txtPath, 'utf8');
        }
      }

      library.push({
        filename: path.basename(fp),
        title: common.title || path.basename(fp, path.extname(fp)),
        artist: common.artist || common.albumartist || 'Unknown Artist',
        album: common.album || 'Unknown Album',
        duration: meta.format.duration || 0,
        lyrics: lyrics
      });
      process.stdout.write(`\rProcessed ${i+1}/${files.length} files...`);
    } catch(e) {
      // Ignore parse errors
    }
  }

  const outPath = path.join(__dirname, 'photify-library.json');
  fs.writeFileSync(outPath, JSON.stringify(library, null, 2));
  console.log(`\n\n✅ Done! Extracted metadata for ${library.length} tracks.`);
  console.log(`📁 Saved to: ${outPath}`);
  console.log(`\nNext Step: Upload 'photify-library.json' to your Google Drive PHOTIFY_MUSIC folder!`);
}

scan().catch(console.error);
