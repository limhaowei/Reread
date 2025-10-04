const { build } = require('esbuild');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    await build({
      entryPoints: ['src/popup.ts'],
      bundle: true,
      minify: true,
      outfile: 'dist/popup.js',
      platform: 'browser',
      target: ['es2020'],
    });

    if (!fs.existsSync('dist')) fs.mkdirSync('dist');
    fs.copyFileSync('popup.html', path.join('dist', 'popup.html'));
    // copy manifest and popup.css
    if (fs.existsSync('manifest.json')) {
      fs.copyFileSync('manifest.json', path.join('dist', 'manifest.json'));
    }
    if (fs.existsSync('popup.css')) {
      fs.copyFileSync('popup.css', path.join('dist', 'popup.css'));
    }

    // copy icons dir
    const iconsSrc = path.join(__dirname, '..', 'icons');
    const iconsDest = path.join('dist', 'icons');
    if (fs.existsSync(iconsSrc)) {
      if (!fs.existsSync(iconsDest)) fs.mkdirSync(iconsDest, { recursive: true });
      for (const file of fs.readdirSync(iconsSrc)) {
        fs.copyFileSync(path.join(iconsSrc, file), path.join(iconsDest, file));
      }
    }

    console.log('Build complete');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
