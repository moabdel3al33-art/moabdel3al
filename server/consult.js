'use strict';
// Consultations are just 3 fixed options, each with its own price (Admin > Consultations):
//   today / within 2 days / within 4 days.
// There is no calendar: the team contacts the client on WhatsApp within the chosen time.
// Every session is open (no time limit). Leave a price empty to hide that option.
const settings = require('./settings');

const TIERS = [
  { k: 'today', field: 'consult_price_today', days: 0, icon: 'bolt', label: 'Book for today', sub: 'We contact you today' },
  { k: '2d', field: 'consult_price_2d', days: 2, icon: 'calendar', label: 'Book within 2 days', sub: 'We contact you within 2 days' },
  { k: '4d', field: 'consult_price_4d', days: 4, icon: 'clock', label: 'Book within 4 days', sub: 'We contact you within 4 days' },
];
const has = (v) => v != null && v !== '' && Number(v) > 0;

// The options on offer right now, with their prices.
const tiers = () => TIERS.filter((x) => has(settings.get(x.field))).map((x) => ({ ...x, price: Number(settings.get(x.field)) }));
const tier = (k) => TIERS.find((x) => x.k === k) || null;
// Last day the team should contact the client (end of that day).
function contactBy(days, from = Date.now()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return d.getTime();
}

module.exports = { TIERS, tiers, tier, contactBy };
