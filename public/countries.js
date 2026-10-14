/* Countries & phone numbers (shared by the server and the browser).
 * Phones are stored in international format: +<country code><number>, e.g. +201012345678 */
(function (root) {
  'use strict';
  // ISO code + dialling code. Arab countries are listed first in pickers.
  const RAW = 'EG20 SA966 AE971 KW965 QA974 BH973 OM968 JO962 LB961 IQ964 SY963 PS970 YE967 LY218 TN216 DZ213 MA212 SD249 MR222 SO252 DJ253 KM269 '
    + 'AF93 AL355 AD376 AO244 AG1 AR54 AM374 AW297 AU61 AT43 AZ994 BS1 BD880 BB1 BY375 BE32 BZ501 BJ229 BM1 BT975 BO591 BA387 BW267 BR55 BN673 BG359 '
    + 'BF226 BI257 KH855 CM237 CA1 CV238 KY1 CF236 TD235 CL56 CN86 CO57 CG242 CD243 CR506 CI225 HR385 CU53 CY357 CZ420 DK45 DM1 DO1 EC593 SV503 GQ240 '
    + 'ER291 EE372 SZ268 ET251 FJ679 FI358 FR33 GF594 PF689 GA241 GM220 GE995 DE49 GH233 GI350 GR30 GL299 GD1 GP590 GU1 GT502 GN224 GW245 GY592 HT509 '
    + 'HN504 HK852 HU36 IS354 IN91 ID62 IR98 IE353 IL972 IT39 JM1 JP81 KZ7 KE254 KI686 KR82 KP850 XK383 KG996 LA856 LV371 LS266 LR231 LI423 LT370 LU352 '
    + 'MO853 MG261 MW265 MY60 MV960 ML223 MT356 MH692 MQ596 MU230 YT262 MX52 FM691 MD373 MC377 MN976 ME382 MZ258 MM95 NA264 NR674 NP977 NL31 NC687 NZ64 '
    + 'NI505 NE227 NG234 MK389 NO47 PK92 PW680 PA507 PG675 PY595 PE51 PH63 PL48 PT351 PR1 RE262 RO40 RU7 RW250 KN1 LC1 VC1 WS685 SM378 ST239 SN221 RS381 '
    + 'SC248 SL232 SG65 SK421 SI386 SB677 ZA27 SS211 ES34 LK94 SR597 SE46 CH41 TW886 TJ992 TZ255 TH66 TL670 TG228 TO676 TT1 TR90 TM993 TC1 TV688 UG256 '
    + 'UA380 GB44 US1 UY598 UZ998 VU678 VA39 VE58 VN84 VG1 VI1 ZM260 ZW263';
  const LIST = RAW.trim().split(/\s+/).map((s) => [s.slice(0, 2), s.slice(2)]);
  const ARAB = new Set(LIST.slice(0, 22).map((c) => c[0]));
  const BY_ISO = Object.fromEntries(LIST);
  const DEFAULT = 'EG';

  const flag = (iso) => (iso && /^[A-Z]{2}$/.test(iso) ? String.fromCodePoint(...[...iso].map((c) => 127397 + c.charCodeAt(0))) : '🌐');
  const namers = {};
  function name(iso, lang) {
    if (!iso) return '';
    try {
      namers[lang] = namers[lang] || new Intl.DisplayNames([lang === 'ar' ? 'ar' : 'en'], { type: 'region' });
      return namers[lang].of(iso) || iso;
    } catch (e) { return iso; }
  }

  // Sorted list for a picker: Arab countries first, then the rest by name.
  function sorted(lang) {
    const arab = LIST.filter(([iso]) => ARAB.has(iso));
    const rest = LIST.filter(([iso]) => !ARAB.has(iso)).sort((a, b) => name(a[0], lang).localeCompare(name(b[0], lang), lang));
    return [...arab, ...rest];
  }

  // Turns (country, typed number) into { e164: '+20...', country: 'EG' } or null if invalid.
  function normalize(country, input) {
    let iso = BY_ISO[String(country || '').toUpperCase()] ? String(country).toUpperCase() : DEFAULT;
    const raw = String(input || '').trim();
    let digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (/^(\+|00)/.test(raw)) {
      // Full international number typed: work out the country from the code.
      if (raw.startsWith('00')) digits = digits.slice(2);
      const dial = BY_ISO[iso];
      if (!digits.startsWith(dial)) {
        const hit = LIST.filter(([, d]) => digits.startsWith(d)).sort((a, b) => b[1].length - a[1].length)[0];
        if (!hit) return null;
        iso = hit[0];
      }
      digits = digits.slice(BY_ISO[iso].length);
    } else {
      const dial = BY_ISO[iso];
      if (digits.startsWith(dial) && digits.length >= 11 && digits.length - dial.length >= 7) digits = digits.slice(dial.length);
    }
    digits = digits.replace(/^0+/, '');
    const total = BY_ISO[iso].length + digits.length;
    if (digits.length < 6 || digits.length > 13 || total > 15) return null;
    return { e164: `+${BY_ISO[iso]}${digits}`, country: iso };
  }

  // "+201012345678" (EG) -> "+20 1012345678"
  function format(e164, iso) {
    const s = String(e164 || '');
    if (!s.startsWith('+')) return s;
    const dial = BY_ISO[iso] && s.slice(1).startsWith(BY_ISO[iso]) ? BY_ISO[iso]
      : (LIST.filter(([, d]) => s.slice(1).startsWith(d)).sort((a, b) => b[1].length - a[1].length)[0] || [, ''])[1];
    return dial ? `+${dial} ${s.slice(1 + dial.length)}` : s;
  }

  // Guess the visitor's country from a language tag like "ar-SA".
  function guess(langTag) {
    const m = String(langTag || '').match(/[-_]([A-Za-z]{2})\b/);
    const iso = m && m[1].toUpperCase();
    return iso && BY_ISO[iso] ? iso : DEFAULT;
  }

  function options(lang, selected) {
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return sorted(lang).map(([iso, dial]) => `<option value="${iso}"${iso === selected ? ' selected' : ''}>+${dial} ${esc(name(iso, lang))}</option>`).join('');
  }

  const api = { LIST, BY_ISO, ARAB, DEFAULT, flag, name, sorted, normalize, format, guess, options };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Countries = api;
})(typeof window !== 'undefined' ? window : globalThis);
