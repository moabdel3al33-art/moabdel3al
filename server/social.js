'use strict';
const crypto = require('crypto');
const settings = require('./settings');
const { one, insert, setOne } = require('./db');
const { now } = require('./util');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const PLATFORMS = ['facebook', 'tiktok', 'youtube', 'instagram'];

function detect(url) {
  const u = String(url || '').toLowerCase();
  if (/youtube\.com|youtu\.be/.test(u)) return 'youtube';
  if (/tiktok\.com/.test(u)) return 'tiktok';
  if (/instagram\.com/.test(u)) return 'instagram';
  if (/facebook\.com|fb\.watch|fb\.com/.test(u)) return 'facebook';
  return null;
}
const decode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function fetchText(url, ms = 8000) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ar,en;q=0.8' }, signal: AbortSignal.timeout(ms), redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// Saves a remote image locally (TikTok/Instagram thumbnail links expire after a while).
async function downloadImage(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) return url;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return url;
    const ext = type.includes('png') ? '.png' : type.includes('webp') ? '.webp' : '.jpg';
    const name = crypto.randomBytes(12).toString('hex') + ext;
    await require('./storage').save(name, buf, { mime: type });
    return `/uploads/${name}`;
  } catch (e) { return url; }
}

// Try to get title + thumbnail for any post link. Fields that cannot be found are left empty for manual entry.
async function preview(url) {
  const platform = detect(url);
  const out = { platform, url, title: '', thumbnail: '', external_id: null };
  try {
    if (platform === 'youtube') {
      const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
      if (m) { out.external_id = m[1]; out.thumbnail = `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`; }
      const d = JSON.parse(await fetchText(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`));
      out.title = d.title || '';
      if (!out.thumbnail) out.thumbnail = d.thumbnail_url || '';
      return out;
    }
    if (platform === 'tiktok') {
      const m = url.match(/video\/(\d+)/);
      if (m) out.external_id = m[1];
      const d = JSON.parse(await fetchText(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`));
      out.title = d.title || '';
      if (d.thumbnail_url) out.thumbnail = await downloadImage(d.thumbnail_url);
      return out;
    }
    // Facebook / Instagram / others: read the page's preview tags (works for some public posts only).
    const html = await fetchText(url);
    const meta = (prop) => {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
      return m ? decode(m[1]) : '';
    };
    out.title = meta('og:description') || meta('og:title') || '';
    const img = meta('og:image');
    if (img) out.thumbnail = await downloadImage(img);
  } catch (e) { /* leave empty - admin fills manually */ }
  out.title = out.title.slice(0, 480);
  return out;
}

async function resolveYoutubeChannel(input) {
  const s = String(input || '').trim();
  if (/^UC[\w-]{22}$/.test(s)) return s;
  const m = s.match(/channel\/(UC[\w-]{22})/);
  if (m) return m[1];
  if (!/youtube\.com/.test(s)) return '';
  try {
    const html = await fetchText(s);
    const f = html.match(/"externalId":"(UC[\w-]{22})"/) || html.match(/"channelId":"(UC[\w-]{22})"/) || html.match(/channel\/(UC[\w-]{22})/);
    return f ? f[1] : '';
  } catch (e) { return ''; }
}

// Pulls the latest videos from the YouTube channel's public RSS feed (no API key needed).
async function syncYoutube() {
  let id = settings.get('youtube_channel_id');
  if (!id) {
    id = await resolveYoutubeChannel(settings.get('social_youtube'));
    if (id) await settings.save({ youtube_channel_id: id });
  }
  if (!id) return { added: 0, error: 'no-channel' };
  const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
  const entries = xml.split('<entry>').slice(1);
  let added = 0;
  for (const e of entries.slice(0, 15)) {
    const vid = (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1];
    if (!vid) continue;
    const title = decode((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').slice(0, 480);
    const published = Date.parse((e.match(/<published>([^<]+)<\/published>/) || [])[1] || '') || now();
    const link = (e.match(/<link rel="alternate" href="([^"]+)"/) || [])[1] || `https://www.youtube.com/watch?v=${vid}`;
    const existing = await one('social_posts', { platform: 'youtube', external_id: vid });
    if (existing) { await setOne('social_posts', { id: existing.id }, { title, updated_at: now() }); continue; }
    await insert('social_posts', {
      platform: 'youtube', url: link, external_id: vid, title, thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      posted_at: published, pinned: 0, hidden: 0, source: 'auto', created_at: now(), updated_at: now(),
    });
    added++;
  }
  return { added };
}

function scheduleSync() {
  const run = () => syncYoutube().catch((e) => console.log('YouTube sync skipped:', e.message));
  setTimeout(run, 15000).unref();
  setInterval(run, 6 * 3600e3).unref();
}

module.exports = { PLATFORMS, detect, preview, syncYoutube, resolveYoutubeChannel, scheduleSync };
