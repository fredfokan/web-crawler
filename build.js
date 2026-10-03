// Builds spider.min.js, bookmarklet.txt and index.html from spider.js and page.tpl.html.
// Usage: node build.js   (requires network access for npx terser on first run)
const fs = require('fs');
const { execSync } = require('child_process');

execSync('npx -y terser spider.js -c -m --toplevel -o spider.min.js', { stdio: 'inherit' });
const min = fs.readFileSync('spider.min.js', 'utf8').trim();

const keep = { '%20': ' ', '%2C': ',', '%3B': ';', '%3D': '=', '%2F': '/', '%3A': ':', '%3F': '?' };
const bookmarklet = 'javascript:' + encodeURIComponent(min).replace(/%(20|2C|3B|3D|2F|3A|3F)/g, m => keep[m]);
fs.writeFileSync('bookmarklet.txt', bookmarklet + '\n');

const page = fs.readFileSync('page.tpl.html', 'utf8')
  .split('__BOOKMARKLET__').join(bookmarklet.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
  .split('__SPIDER__').join(min.replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync('index.html', page);
console.log(`spider.min.js ${min.length} B, bookmarklet ${bookmarklet.length} B`);
