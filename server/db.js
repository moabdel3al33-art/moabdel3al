'use strict';
// MongoDB data layer. Every document keeps a simple numeric "id" (1, 2, 3...) so order numbers,
// chat numbers and links stay short and readable. MongoDB's own _id is never sent to the browser.
const { MongoClient } = require('mongodb');

let client = null;
let db = null;

const uri = () => process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL || '';
const dbName = () => process.env.MONGODB_DB || 'abdel3al';

const col = (name) => db.collection(name);
const NO_ID = { _id: 0 };

async function nextId(name) {
  const r = await col('counters').findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return (r && r.seq) || (r && r.value && r.value.seq);
}
// Inserts a document and returns its new numeric id.
async function insert(name, doc) {
  const id = await nextId(name);
  const clean = {};
  for (const [k, v] of Object.entries(doc)) clean[k] = v === undefined ? null : v;
  await col(name).insertOne({ id, ...clean });
  return id;
}
const find = (name, filter = {}, { sort, limit, skip, projection } = {}) => {
  let c = col(name).find(filter, { projection: { ...NO_ID, ...(projection || {}) } });
  if (sort) c = c.sort(sort);
  if (skip) c = c.skip(skip);
  if (limit) c = c.limit(limit);
  return c.toArray();
};
const one = (name, filter = {}, { sort, projection } = {}) => col(name).findOne(filter, { projection: { ...NO_ID, ...(projection || {}) }, sort });
const byId = (name, id) => one(name, { id: Number(id) });
const set = (name, filter, values) => col(name).updateMany(filter, { $set: values });
const setOne = (name, filter, values) => col(name).updateOne(filter, { $set: values });
const remove = (name, filter) => col(name).deleteMany(filter);
const count = (name, filter = {}) => col(name).countDocuments(filter);
const aggregate = (name, pipeline) => col(name).aggregate(pipeline).toArray();
const distinct = (name, field, filter = {}) => col(name).distinct(field, filter);
// Map of documents by id, for joining in JavaScript.
async function mapById(name, ids, projection) {
  const list = [...new Set(ids.filter((x) => x != null).map(Number))];
  if (!list.length) return new Map();
  const rows = await find(name, { id: { $in: list } }, { projection });
  return new Map(rows.map((r) => [r.id, r]));
}
const isDup = (e) => e && e.code === 11000;
const dupKey = (e) => (e && e.keyPattern ? Object.keys(e.keyPattern)[0] : '');
const rx = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const STRING = { $type: 'string' };
const INDEXES = {
  users: [[{ id: 1 }, { unique: true }], [{ email: 1 }, { unique: true, partialFilterExpression: { email: STRING } }],
    [{ phone: 1 }, { unique: true, partialFilterExpression: { phone: STRING } }], [{ login: 1 }, { unique: true, partialFilterExpression: { login: STRING } }],
    [{ role: 1 }]],
  sessions: [[{ token: 1 }, { unique: true }], [{ user_id: 1 }]],
  email_codes: [[{ user_id: 1, purpose: 1 }]],
  conversations: [[{ id: 1 }, { unique: true }], [{ client_id: 1, id: -1 }], [{ closed_by: 1 }]],
  messages: [[{ id: 1 }, { unique: true }], [{ client_id: 1, id: -1 }], [{ sender_type: 1, sender_id: 1 }], [{ order_id: 1 }]],
  quick_replies: [[{ id: 1 }, { unique: true }]],
  chat_labels: [[{ id: 1 }, { unique: true }]],
  courses: [[{ id: 1 }, { unique: true }], [{ slug: 1 }, { unique: true }]],
  lessons: [[{ id: 1 }, { unique: true }], [{ course_id: 1 }]],
  books: [[{ id: 1 }, { unique: true }], [{ slug: 1 }, { unique: true }]],
  posts: [[{ id: 1 }, { unique: true }], [{ slug: 1 }, { unique: true }]],
  consult_types: [[{ id: 1 }, { unique: true }]],
  orders: [[{ id: 1 }, { unique: true }], [{ user_id: 1 }], [{ status: 1 }]],
  bookings: [[{ id: 1 }, { unique: true }], [{ user_id: 1 }], [{ order_id: 1 }]],
  entitlements: [[{ user_id: 1, item_type: 1, item_id: 1 }, { unique: true }]],
  social_posts: [[{ id: 1 }, { unique: true }], [{ platform: 1, external_id: 1 }, { unique: true, partialFilterExpression: { external_id: STRING } }]],
  settings: [[{ k: 1 }, { unique: true }]],
  media: [[{ id: 1 }, { unique: true }]],
  comments: [[{ id: 1 }, { unique: true }], [{ target_type: 1, target_id: 1, status: 1 }], [{ status: 1 }]],
  plans: [[{ id: 1 }, { unique: true }]],
  subscriptions: [[{ id: 1 }, { unique: true }], [{ user_id: 1, ends_at: -1 }]],
  reservations: [[{ id: 1 }, { unique: true }], [{ item_type: 1, item_id: 1, phone: 1 }], [{ status: 1 }]],
};

async function init() {
  if (!uri()) throw new Error('MONGODB_URI is missing in the .env file');
  client = new MongoClient(uri(), { serverSelectionTimeoutMS: 15000, maxPoolSize: 10 });
  await client.connect();
  db = client.db(dbName());
  await db.command({ ping: 1 });
  for (const [name, list] of Object.entries(INDEXES)) {
    for (const [keys, opts] of list) {
      try { await col(name).createIndex(keys, opts || {}); } catch (e) { console.warn(`  ! index ${name}:`, e.message); }
    }
  }
  const host = (uri().match(/@([^/?]+)/) || [])[1] || 'mongodb';
  return { host, database: dbName() };
}

module.exports = { init, database: () => db, col, insert, find, one, byId, set, setOne, remove, count, aggregate, distinct, mapById, nextId, isDup, dupKey, rx };
