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

## Email is optional
- Nothing on the site needs an email. Sign-up asks for name, phone and password; email is an optional field (also editable in *My details*).
- There is no email code step any more: the account is ready straight away. Log in with phone or email.
- The email is only used for "Forgot password" codes and receipts. Clients without an email who forget their password message the team in the chat.
- To send real emails from Gmail: Google Account → Security → 2-Step Verification → **App passwords** → paste it into `SMTP_PASS`.

## Clients, phone numbers and the chat
- **Chat without an account:** the client writes his name and phone number (with a country code picker). The phone number is unique and is his ID, so typing the same number again reopens his saved chat.
- **Linking:** when a chat-only client creates an account with the same phone number, it becomes the same client. His earlier chats stay with him, and once logged in he is never asked for his phone again.
- A number that already belongs to an account can't be used to open that chat without logging in.
- **Remember me** (login, sign-up and chat entry): ticked = stay logged in for 30 days. Unticked = logged out when the browser is closed.
- Numbers are saved in international format, e.g. `+201012345678`. Phone login works with or without the country code.
- **Admin → Clients:** totals, active/inactive (7/30/90/180 days), with account vs chat only, buyers, new this week, a per-country table (click a country to filter), and export to Excel/CSV.

## How buying works
Prices are in **US dollars** by default (Admin → Payments → Currency).

1. The client presses **Buy** → logs in or creates an account. Chat-only clients are asked to create an account (their chat is kept).
2. The checkout page shows the order → **Continue to payment**.
3. The client pays with one of the methods you allowed for that kind of product (**Admin → Payments**). You choose separately for courses, books, membership plans and consultations; tick one or more. With several, the client picks on the payment page `/pay/<order>`.
   - **Chat**: the chat opens with a ready message. Your team replies with payment details and presses **Confirm payment**.
   - **PayPal + screenshot**: the payment page walks the client through it step by step:
     1. "Pay $X with PayPal" opens your PayPal.me link with the exact amount (or shows your PayPal email with a Copy button).
     2. They send the payment and write the order number in the PayPal note.
     3. They take a screenshot of PayPal's success screen (the page shows the keys for Android, iPhone, Windows and Mac).
     4. They upload the screenshot (plus an optional transaction ID) on the payment page.
     5. The screenshot appears in your **Inbox** and in **Orders & payments** marked *Screenshot received*. Check the money is in your PayPal, then press **Confirm payment**.
   - **Online payment (automatic)**: PayPal Checkout (card or PayPal account). The order is activated by itself after paying. Needs `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` and `PAYPAL_MODE=live` (see `.env.example`). Until those are set it is hidden from clients.
4. The client gets access immediately and is told in the chat. For consultations, staff then set the date and meeting link in *Consultation bookings*.

PayPal setup: Admin → Payments → enter your **PayPal.me** link (e.g. `paypal.me/YourName`) and/or PayPal email. PayPal does not support EGP, so keep the currency in USD/EUR/GBP when using PayPal.

## Consultations
- Every consultation type has **3 booking options**, each with its own price (Admin → Consultations): **Book for today**, **Within 2 days**, **Within 4 days**. Leave a price empty to hide that option.
- No calendar: the client picks the option, confirms their **WhatsApp number** (required) and pays. Staff see the option, the WhatsApp number (one click opens WhatsApp) and the "contact by" date in *Consultation bookings*; overdue ones are shown in red.
- The consultations page highlights the **open session** (no time limit, no ending hour). Edit its title and text in *Site texts & images → Consultations - open session*.

## Chat labels
In the Inbox, the label button in a chat's header lets any team member tick labels (e.g. VIP, Paid, Follow up), create new ones with a colour, rename or delete them. Labels show on every chat in the list and can be used as filters.

## Books: view-only reader
Buyers read books on the site in a reader (zoom, full screen, page counter). There is no download or print button, and each page carries a faint watermark with the reader's name and phone. Upload the PDF, or (to save database space) paste a **PDF link** instead: Google Drive (shared as "Anyone with the link"), Dropbox or any direct PDF link. The server fetches it, so buyers never see the link.

## Followers counter
Admin → Social media → *Followers counter*: type each platform's followers. One total is shown in a thin bar at the top of every page. With *Count automatically* on, the server also tries to read the real numbers every 12 hours (YouTube and TikTok usually work; Instagram and Facebook often block it, so the typed number is used for them).

## Coming soon courses & books
Tick **Coming soon** on a course or book. Its page then says *"Stay tuned! This content will be available soon."* and shows a **Book your seat** form (name, phone, optional email, note). There is no account and no payment. Bookings are in **Admin → Seat bookings** (filter, mark as contacted, WhatsApp button, export to Excel). Untick *Coming soon* when it is ready to sell.

## Link page (link in bio)
**Admin → Link page** builds a Linktree-style page: a big photo whose bottom fades into the page, your name, a short text, social media icons and a list of buttons (each with a round picture). Buttons can open any page of the site (pick it from the list, course and book covers are used as pictures) or any other link; reorder, hide or highlight them.
The page lives at a **secret link** `/p/<link>`. It is not linked anywhere on the website and is hidden from Google, so only people with the link can open it. You can change the link at any time (the old one stops working) or switch the page off.

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

## Where files are stored
Every uploaded file (images, logo, covers, chat photos / voice notes / files, payment screenshots, book PDFs) is saved **inside MongoDB Atlas** (GridFS, collections `uploads.files` and `uploads.chunks`), not on the Railway server. Deploys, restarts and updates never delete them.
- Links stay the same: `/uploads/<name>`. Book PDFs are private and only downloadable by buyers.
- Files that older versions left on the disk are copied into the database automatically on start-up.
- Space: the free Atlas plan (M0) has 512 MB for everything. Watch it in Atlas → *Metrics / Collections*. If it fills up (many videos or big PDFs), upgrade the cluster in Atlas (M10+); nothing in the code changes.

## Deploying to Railway (later)
1. Set Variables: `MONGODB_URI`, `MONGODB_DB=abdel3al`, `NODE_ENV=production`, `SITE_URL=https://your-domain`, `APP_SECRET` (long random text), `SMTP_*`, `ADMIN_PASSWORD`.
2. Choose the Railway region closest to the MongoDB cluster (see above).
3. No Volume is needed: nothing is stored on Railway (see *Where files are stored*).
4. Start command: `npm start`.

## Files
```
server/   index.js (start) · db.js (MongoDB) · auth.js (accounts, roles, codes) · chat.js (live chat)
          shop.js (orders, access, seat bookings) · payments.js (chat / PayPal / PayPal Checkout) · linkpage.js (link in bio) · admin.js (admin API) · pages.js + views.js (website pages)
          social.js (YouTube/TikTok fetch) · settings.js (texts, images, colours) · seed.js (demo content)
public/   site.css/js (website) · link.css (link page) · styles.css + common.js (chat UI) · chat-page.js
          admin-*.js + admin.css (admin panel) · locales.js (translations) · md.js (text formatting)
_old-chat-app/   backup of the first chat-only version
```

## Before launch (security)
Phone numbers are not verified, so anyone who knows a chat-only client's number can open that chat. Before launch, add a WhatsApp or SMS code to confirm the number (for example with Twilio).
