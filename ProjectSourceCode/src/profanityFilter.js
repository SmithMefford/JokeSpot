const fs   = require('fs');
const path = require('path');

let _regex  = null;
let _loaded = false;

function loadWordList() {
  if (_loaded) return;

  const filePath = path.join(__dirname, 'resources', 'filters', 'profanity_censor.csv');
  const raw      = fs.readFileSync(filePath, 'utf8');
  const records = raw
  .split('\n')
  .slice(1)                          // skip the "word" header row
  .map(line => ({ word: line.trim().replace(/\r/g, '') }))
  .filter(r => r.word);

  // Sort longest-first so multi-word phrases match before their parts
  const words = records
    .map(r => r.word?.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const parts = words.map(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefix  = /\w/.test(word[0])           ? '(?<!\\w)' : '';
    const suffix  = /\w/.test(word[word.length - 1]) ? '(?!\\w)'  : '';
    return `${prefix}${escaped}${suffix}`;
  });

  _regex  = new RegExp(parts.join('|'), 'gi');
  _loaded = true;
}

/**
 * Returns true if the text contains any profanity.
 */
function hasProfanity(text) {
  loadWordList();
  _regex.lastIndex = 0;
  return _regex.test(text);
}

/**
 * Replaces every flagged word with asterisks of the same length.
 */
function censorText(text) {
  loadWordList();
  _regex.lastIndex = 0;
  return text.replace(_regex, match => '*'.repeat(match.length));
}

module.exports = { hasProfanity, censorText };