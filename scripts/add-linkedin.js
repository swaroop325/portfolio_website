#!/usr/bin/env node
// Append a LinkedIn post to src/data/linkedin-posts.json (hand-curated).
// Usage: npm run add-linkedin -- <post-url-or-urn> [note]
const fs = require('node:fs');
const path = require('node:path');
const { addLinkedInPost } = require('./lib/linkedin');

const FILE = path.join(__dirname, '..', 'src', 'data', 'linkedin-posts.json');

function main(argv) {
  const [input, ...noteParts] = argv;
  if (!input || input === '-h' || input === '--help') {
    console.error('Usage: npm run add-linkedin -- <linkedin-post-url-or-urn> [note]');
    return input ? 0 : 1;
  }

  let list = [];
  if (fs.existsSync(FILE)) {
    try {
      list = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch (e) {
      console.error(`Refused: ${path.relative(process.cwd(), FILE)} is not valid JSON (${e.message}).`);
      return 1;
    }
    if (!Array.isArray(list)) {
      console.error(`Refused: ${path.relative(process.cwd(), FILE)} must contain a JSON array.`);
      return 1;
    }
  }

  const r = addLinkedInPost(list, input, noteParts.join(' '));
  if (!r.added) {
    console.error(`Refused: ${r.reason}`);
    return 1;
  }
  fs.writeFileSync(FILE, `${JSON.stringify(r.list, null, 2)}\n`);
  console.log(`Added ${r.post.urn}`);
  console.log(`  url:   ${r.post.url}`);
  if (r.post.note) console.log(`  note:  ${r.post.note}`);
  console.log(`  total: ${r.list.length} post(s) in ${path.relative(process.cwd(), FILE)}`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
