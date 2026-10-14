'use strict';
// The 3 ways to book a consultation. Each consultation type has its own price for each one
// (leave a price empty in the admin to not offer that option). There is no calendar: the team
// contacts the client on WhatsApp within the chosen time. Every session is open (no time limit).
const TIERS = [
  { k: 'today', field: 'price_today', days: 0, icon: 'bolt', label: 'Book for today', sub: 'We contact you today' },
  { k: '2d', field: 'price_2d', days: 2, icon: 'calendar', label: 'Book within 2 days', sub: 'We contact you within 2 days' },
  { k: '4d', field: 'price_4d', days: 4, icon: 'clock', label: 'Book within 4 days', sub: 'We contact you within 4 days' },
];
const has = (v) => v != null && v !== '' && Number(v) > 0;

// Options offered by a consultation type, with their prices. Older types with only "price" offer "within 4 days".
function tiersOf(c) {
  const list = TIERS.filter((x) => has(c[x.field])).map((x) => ({ ...x, price: Number(c[x.field]) }));
  if (!list.length && has(c.price)) list.push({ ...TIERS[2], price: Number(c.price) });
  return list;
}
const tier = (k) => TIERS.find((x) => x.k === k) || null;
const fromPrice = (c) => { const l = tiersOf(c); return l.length ? Math.min(...l.map((x) => x.price)) : 0; };
// Last day the team should contact the client (end of that day).
function contactBy(days, from = Date.now()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return d.getTime();
}

module.exports = { TIERS, tiersOf, tier, fromPrice, contactBy };
