'use strict';
// File storage. Every uploaded file (images, voice notes, chat files, payment screenshots, book PDFs) is kept
// in MongoDB Atlas with GridFS, NOT on the server's disk. So nothing is lost when Railway redeploys or restarts.
// Public files are served at /uploads/<name>; private files (book PDFs) only through the download route.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { GridFSBucket } = require('mongodb');
const config = require('./config');
const db = require('./db');

let bucket = null;
const files = () => db.col('uploads.files');
function init() {
  bucket = new GridFSBucket(db.database(), { bucketName: 'uploads', chunkSizeBytes: 1024 * 1024 });
  return files().createIndex({ filename: 1 }, { unique: true });
}

const safeExt = (name) => path.extname(String(name || '')).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
const newName = (original) => crypto.randomBytes(12).toString('hex') + safeExt(original);
const cleanName = (name) => path.basename(String(name || ''));

// Saves a readable stream (or Buffer) under `name`. Resolves with the stored size.
function save(name, source, { mime = '', isPrivate = false, original = '' } = {}) {
  return new Promise((resolve, reject) => {
    const up = bucket.openUploadStream(name, { metadata: { mime, private: !!isPrivate, original } });
    up.on('error', reject);
    up.on('finish', () => resolve((up.gridFSFile && up.gridFSFile.length) ?? up.length ?? 0));
    if (Buffer.isBuffer(source)) up.end(source);
    else { source.on('error', (e) => { up.abort().catch(() => {}); reject(e); }); source.pipe(up); }
  });
}
const find = (name) => files().findOne({ filename: cleanName(name) });
async function remove(name) {
  const f = await find(name);
  if (f) await bucket.delete(f._id).catch(() => {});
}

// Multer storage engine: uploads stream straight into the database (nothing is written to disk).
function multerStorage({ isPrivate = false } = {}) {
  return {
    _handleFile(req, file, cb) {
      const filename = newName(file.originalname);
      save(filename, file.stream, { mime: file.mimetype, isPrivate, original: file.originalname })
        .then((size) => cb(null, { filename, size }))
        .catch(cb);
    },
    _removeFile(req, file, cb) { remove(file.filename).then(() => cb(null), cb); },
  };
}

// Streams a stored file to the browser. Supports Range requests (needed to seek in videos / voice notes on iPhone).
const INLINE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.mp4', '.webm', '.ogg', '.oga', '.mp3', '.m4a', '.wav', '.aac', '.mov', '.pdf']);
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.bmp': 'image/bmp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
  '.wav': 'audio/wav', '.aac': 'audio/aac', '.pdf': 'application/pdf', '.heic': 'image/heic', '.heif': 'image/heif' };
async function send(req, res, name, { isPrivate = false, downloadName = null } = {}) {
  const f = await find(name);
  if (!f || (!!(f.metadata && f.metadata.private) !== isPrivate)) return false;
  const ext = path.extname(f.filename).toLowerCase();
  const total = f.length;
  res.setHeader('Content-Type', TYPES[ext] || (f.metadata && f.metadata.mime) || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', isPrivate ? 'private, no-store' : 'public, max-age=2592000, immutable'); // names are random, so they never change
  res.setHeader('ETag', `"${f._id}"`);
  if (ext === '.svg') res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  if (downloadName) res.attachment(downloadName);
  else if (!INLINE_EXT.has(ext)) res.setHeader('Content-Disposition', 'attachment');
  if (!isPrivate && req.headers['if-none-match'] === `"${f._id}"`) { res.status(304).end(); return true; }
  let start = 0;
  let end = total - 1;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && total > 0) {
    if (m[1] === '') start = Math.max(0, total - Number(m[2]));
    else { start = Number(m[1]); if (m[2] !== '') end = Math.min(Number(m[2]), total - 1); }
    if (start > end || start >= total) { res.status(416).setHeader('Content-Range', `bytes */${total}`); res.end(); return true; }
    res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
  }
  res.setHeader('Content-Length', total ? end - start + 1 : 0);
  if (req.method === 'HEAD' || !total) { res.end(); return true; }
  const stream = bucket.openDownloadStream(f._id, { start, end: end + 1 });
  stream.on('error', () => res.destroy());
  stream.pipe(res);
  return true;
}

// One-time copy of files left on the server's disk by older versions (UPLOAD_DIR), so old links keep working.
async function importLocalFiles() {
  let n = 0;
  for (const [dir, isPrivate] of [[config.uploadDir, false], [config.privateDir, true]]) {
    let names = [];
    try { names = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name); } catch (e) { continue; }
    for (const name of names) {
      if (await find(name)) continue;
      try { await save(name, fs.createReadStream(path.join(dir, name)), { isPrivate }); n++; } catch (e) { console.warn('  ! could not import', name, e.message); }
    }
  }
  if (n) console.log(`  Storage     : copied ${n} old file(s) from the disk into the database`);
}

module.exports = { init, save, remove, find, send, multerStorage, newName, importLocalFiles };
