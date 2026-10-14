# Mohamed Abdel3al — Platform (trial version)

Website + live chat + courses + books + blog + consultations + admin panel.
Arabic by default, with an English switch. No build step and no front-end framework, so it stays light.

## Run it locally
1. `.env` already contains the MongoDB Atlas link (`MONGODB_URI`) and the database name (`MONGODB_DB=abdel3al`). Collections and indexes are created automatically.
2. Run:
   ```
   npm install
   npm start
   ```
3. Open:
   - Website: http://localhost:3000/
   - Admin panel: http://localhost:3000/admin (first login: `admin` / `admin321`, change it straight away)

On the first run, demo content is added (2 courses, 2 books, 2 articles, 2 consultation types, 3 quick replies). Edit or delete it from the admin panel.

## Email verification codes
- While `SMTP_PASS` in `.env` is empty, codes are **printed in the terminal** and shown on the page (testing only).
- To send real emails from Gmail: Google Account → Security → 2-Step Verification → **App passwords** → create one → paste it into `SMTP_PASS`.
- For the business account later, change `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` only.

## Clients, phone numbers and the chat
- **Chat without an account:** the client writes his name and phone number (with a country code picker). The phone number is unique and is his ID, so typing the same number again reopens his saved chat.
- **Linking:** when a chat-only client creates an account with the same phone number, it becomes the same client. His earlier chats stay with him, and once logged in he is never asked for his phone again.
- A number that already belongs to an account can't be used to open that chat without logging in.
- **Remember me** (login, sign-up and chat entry): ticked = stay logged in for 30 days. Unticked = logged out when the browser is closed.
- Numbers are saved in international format, e.g. `+201012345678`. Phone login works with or without the country code.
- **Admin → Clients:** totals, active/inactive (7/30/90/180 days), with account vs chat only, buyers, new this week, a per-country table (click a country to filter), and export to Excel/CSV.

## How buying works
1. The client presses **Buy** → logs in or creates an account (email verified with a code). Chat-only clients are asked to create an account (their chat is kept).
2. The checkout page shows the order and the payment instructions.
3. **Continue to payment in the chat** → the chat opens with a ready message (order and client details). The client presses send.
4. An employee replies with the payment details. Once paid, they press **Confirm payment**, either in the chat's client panel or in *Orders & payments*.
5. The client gets access immediately and is told in the chat. For consultations, staff then set the date and meeting link in *Consultation bookings*.

## Roles
| Role | Can do |
|---|---|
| **Owner** (first login `admin`) | Everything. The only one who can create, edit, block or **delete** any account (admins, employees, clients). Permanent: cannot be deleted, disabled or demoted, and it is hidden from the team list. If it is ever removed from the database, it is re-created on the next start from `ADMIN_LOGIN` / `ADMIN_PASSWORD` in `.env`. |
| Admin | Everything except accounts: chat, orders, bookings, clients, content, comments, colours, settings, memberships. Can *view* the team's performance. |
| Customer support | Chat, orders/payments, bookings, clients, comments |
| Content editor | Courses, books, blog, consultations, social posts, site texts & images, comments |

## Comments & reviews
- Anyone can comment (with optional stars) on courses, books and articles, or write a review on **/reviews**.
- Nothing appears on the site until a team member presses **Publish** in Admin → Comments. They can also reject, reply, or **feature** a comment on the home page.
- Approved comments are shown as cards. Courses and books show their average rating.
- Spam protection: a hidden field that only bots fill in, and a limit of 6 comments per hour per visitor.

## Memberships
- Plans (monthly, 3, 6 and 12 months by default) are in Admin → Membership plans. Change titles, prices and durations there.
- A membership opens **all courses and books** until its end date. It is bought like any other product: checkout, then pay in the chat, then staff press "Confirm payment".
- Renewing adds the new time on top of what is left. There is no automatic renewal.
- Members get a reminder in the chat 3 days before the end. Access stops automatically after the end date.
- Admin → Members lists active and expired members. On a client's page you can give a free membership or cancel one.

## Changing the look
- **Colours**: Admin → Colours. Click a ready palette (or pick 4 colours), see it live, then press Save. The whole site uses only 4 colours.
- **Image position**: every image field (logo, main photo, about photo, page backgrounds, covers) has **"Adjust position"**. Drag the picture and zoom with the slider; small previews show how it looks on other screens. The position is saved inside the image link (`...jpg#pos=x,y,zoom`), so nothing extra is stored.
- **Luxury look**: Black & Gold by default, elegant El Messiri headings, gold buttons and thin gold borders. All of it comes from the same 4 colours, so every palette keeps the premium feel.
- **Texts & images**: Admin → Site texts & images (name, logo, hero photo, about section, page backgrounds, payment instructions, social links).
- **Arabic wording**: `public/locales.js` (English on the left, Arabic on the right).

## Social media posts
- **YouTube**: put the channel link in *Site texts & images*. The latest videos are added automatically every 6 hours (or press *Get latest videos now*).
- **TikTok / Facebook / Instagram**: Admin → Social media → *Add a post* → paste the link → *Fetch details*. TikTok and YouTube fill in automatically. Facebook and Instagram usually block this, so add the text and picture by hand.

## Course videos
Paste the normal Vimeo (or YouTube) link of each lesson. The video player is shown only to buyers, plus anyone for lessons marked "free preview".
**Important:** in Vimeo set each video's privacy to *"Hide from Vimeo"* + *embed only on your domain*, so the link can't be shared outside the site.

## Database: MongoDB Atlas
- Connection: `MONGODB_URI` + `MONGODB_DB` in `.env`. Every record keeps a simple numeric id (order #12, chat #5…).
- The cluster is in **Singapore (AWS ap-southeast-1)**. From Egypt each database round trip takes about 190 ms, so pages take about 0.4 s locally. On the live server, put the app in the **same region as the database** and it becomes about 1 ms. Better still for Arab visitors: a cluster in **Frankfurt (eu-central-1)** with the app in **Railway EU West**.
- Atlas → Network Access must allow the server's IP. On Railway the IP changes, so allow `0.0.0.0/0`. The password protects the data.
- The previous MySQL version of the server code is kept in `_mysql-version/`.

## Deploying to Railway (later)
1. Set Variables: `MONGODB_URI`, `MONGODB_DB=abdel3al`, `NODE_ENV=production`, `SITE_URL=https://your-domain`, `APP_SECRET` (long random text), `SMTP_*`, `ADMIN_PASSWORD`.
2. Choose the Railway region closest to the MongoDB cluster (see above).
3. Add a **Volume** mounted at `/data` and set `UPLOAD_DIR=/data/uploads`. Without it, uploaded images, voice notes and book files are lost on every deploy.
4. Start command: `npm start`.

## Files
```
server/   index.js (start) · db.js (MongoDB) · auth.js (accounts, roles, codes) · chat.js (live chat)
          shop.js (orders, access) · admin.js (admin API) · pages.js + views.js (website pages)
          social.js (YouTube/TikTok fetch) · settings.js (texts, images, colours) · seed.js (demo content)
public/   site.css/js (website) · styles.css + common.js (chat UI) · chat-page.js
          admin-*.js + admin.css (admin panel) · locales.js (translations) · md.js (text formatting)
_old-chat-app/   backup of the first chat-only version
```

## Before launch (security)
Phone numbers are not verified, so anyone who knows a chat-only client's number can open that chat. Before launch, add a WhatsApp or SMS code to confirm the number (for example with Twilio).
#   m o a b d e l 3 a l  
 #   m o a b d e l 3 a l  
 