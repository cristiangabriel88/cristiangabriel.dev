'use strict';
// RSS feed (rec 6.7): generate feed.xml from the changelog in site-content.js.
//
// site-content.js is a browser file (`window.SITE_CONTENT = {...}`), not a
// module, so we run it in a tiny `window` sandbox and read the result back.
// Keeping the changelog as the single source means the feed never drifts from
// what the site shows — as long as the build runs (same contract as the
// cache-busting step). Called from scripts/build.js; also runnable standalone:
//   node scripts/build-feed.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://cristiangabriel.dev/';
const FEED_URL = SITE + 'feed.xml';

function loadChangelog() {
  const code = fs.readFileSync(path.join(ROOT, 'site-content.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: 'site-content.js' });
  const content = sandbox.window.SITE_CONTENT || {};
  return Array.isArray(content.changelog) ? content.changelog : [];
}

const escapeXml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Changelog dates are YYYY-MM-DD with no time; pin to midday UTC so the RFC-822
// pubDate is stable and lands on the right calendar day in every timezone.
const rfc822 = (date) => new Date(date + 'T12:00:00Z').toUTCString();

function buildFeed() {
  const items = loadChangelog();
  const lastBuild = items.length ? rfc822(items[0].date) : new Date().toUTCString();
  const entries = items
    .map((it) => {
      const guid = SITE + '#changelog-' + it.date;
      return [
        '    <item>',
        `      <title>${escapeXml(it.text)}</title>`,
        `      <link>${escapeXml(SITE)}</link>`,
        `      <guid isPermaLink="false">${escapeXml(guid)}</guid>`,
        `      <pubDate>${rfc822(it.date)}</pubDate>`,
        `      <description>${escapeXml(it.text)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Cristian Gabriel · Changelog</title>
    <link>${SITE}</link>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
    <description>Small updates to cristiangabriel.dev.</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${entries}
  </channel>
</rss>
`;
  return xml.replace(/\r\n/g, '\n');
}

function writeFeed() {
  const xml = buildFeed();
  fs.writeFileSync(path.join(ROOT, 'feed.xml'), xml);
  return xml;
}

module.exports = { buildFeed, writeFeed };

if (require.main === module) {
  writeFeed();
  console.log('built feed.xml');
}
