/**
 * Build a single self-contained HTML file that works from file:// by
 * double-click: no server, no module imports, no external fetches.
 *
 *   three.js + viewer bundled into one classic script (esbuild IIFE, inlined
 *   as base64 and decoded at runtime so the HTML parser never sees the GLSL)
 *   every .glb inlined as a data: URI
 *   the eight step SVGs and the favicon inlined as data: URIs
 *
 * Usage (esbuild must be available):
 *   npm install esbuild            # once, outside the repo or in a scratch dir
 *   node scripts/standalone/make-standalone.js "C:/path/to/bundle.js" [out.html]
 *
 * The bundle itself is produced with:
 *   esbuild docs/js/viewer3d.js --bundle --format=iife --minify --target=es2020 \
 *     --alias:three=./docs/vendor/three/build/three.module.js \
 *     --alias:three/addons/controls/OrbitControls.js=./docs/vendor/three/addons/controls/OrbitControls.js \
 *     --alias:three/addons/loaders/GLTFLoader.js=./docs/vendor/three/addons/loaders/GLTFLoader.js \
 *     --alias:three/addons/renderers/CSS2DRenderer.js=./docs/vendor/three/addons/renderers/CSS2DRenderer.js \
 *     --outfile=bundle.js
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const bundlePath = process.argv[2];
const outPath = process.argv[3] || path.join(REPO, 'dist', 'Shad\'s Build Guide (3D).html');

if (!bundlePath || !fs.existsSync(bundlePath)) {
  console.error('Pass the path to the esbuild bundle as the first argument.');
  process.exit(1);
}

const html0 = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
let html = html0;
const log = [];

// ---- 1. models -> data URIs ------------------------------------------------
const modelDir = path.join(REPO, 'docs/models');
const modelFiles = fs.readdirSync(modelDir).filter((f) => f.endsWith('.glb'));
const models = {};
for (const f of modelFiles) {
  const buf = fs.readFileSync(path.join(modelDir, f));
  models['docs/models/' + f] = 'data:model/gltf-binary;base64,' + buf.toString('base64');
}
const modelsJs = 'window.BUILD_GUIDE_MODEL_DATA=' + JSON.stringify(models) + ';';
log.push(`models inlined: ${modelFiles.length}`);

// ---- 2. favicon ------------------------------------------------------------
const icon = fs.readFileSync(path.join(REPO, 'shad-drone-icon.svg')).toString('base64');
html = html.replace('href="shad-drone-icon.svg"', `href="data:image/svg+xml;base64,${icon}"`);

// ---- 3. step SVGs -> inline <img> (data: navigation is blocked; imgs work) --
let svgCount = 0;
html = html.replace(
  /<a href="(docs\/images\/build\/[^"]+)" target="_blank" rel="noopener">([\s\S]*?)<\/a>/g,
  (whole, file) => {
    const svg = fs.readFileSync(path.join(REPO, file)).toString('base64');
    svgCount += 1;
    return `<img src="data:image/svg+xml;base64,${svg}" alt="Original diagram: ${file}" `
      + 'style="display:block;width:100%;margin-top:8px;border:1px solid #e2d9c6;border-radius:10px">';
  }
);
log.push(`step SVGs inlined: ${svgCount}`);

// ---- 4. drop the import map (no module resolution needed any more) --------
const beforeImport = html.length;
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/g, '');
log.push(`importmap removed: ${beforeImport !== html.length}`);

// ---- 5. inline the bundle in place of the module script -------------------
// The bundle contains multi-line GLSL template literals, so it is embedded as
// base64 and decoded at runtime: nothing inside it can confuse the HTML parser.
const bundle = fs.readFileSync(bundlePath, 'utf8');
const bundleB64 = Buffer.from(bundle, 'utf8').toString('base64');
const moduleTag = '<script type="module" src="docs/js/viewer3d.js"></script>';
if (!html.includes(moduleTag)) throw new Error('module script tag not found in index.html');
html = html.replace(moduleTag,
  `<script>${modelsJs}</script>\n`
  + '<script>(function(){var s=atob(' + JSON.stringify(bundleB64) + '),'
  + 'a=new Uint8Array(s.length),i;for(i=0;i<s.length;i++)a[i]=s.charCodeAt(i);'
  + 'new Function(new TextDecoder().decode(a))();})();</script>');
log.push('viewer bundle inlined (base64)');

// ---- 6. inline the Guide Assistant (classic script, no imports) -----------
// It must live inside the single file: the assistant is offline-first, and a
// relative <script src> would 404 once the HTML is copied anywhere else.
const assistantTag = '<script src="docs/js/assistant.js"></script>';
if (html.includes(assistantTag)) {
  const assistant = fs.readFileSync(path.join(REPO, 'docs/js/assistant.js'), 'utf8');
  if (assistant.includes('</script')) {
    throw new Error('docs/js/assistant.js contains a </script sequence; it cannot be inlined verbatim');
  }
  html = html.replace(assistantTag, '<script>' + assistant + '</script>');
  log.push('guide assistant inlined');
} else {
  log.push('guide assistant tag not found (skipped)');
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');

console.log(log.join('\n'));
console.log('output:', outPath);
console.log('size:', (fs.statSync(outPath).size / 1024 / 1024).toFixed(2), 'MB');

const leftovers = [...html.matchAll(/(?:src|href)="((?:docs\/|shad-drone)[^"]+)"/g)].map((m) => m[1]);
console.log('remaining relative refs:', leftovers.length ? leftovers.join(', ') : 'none');
