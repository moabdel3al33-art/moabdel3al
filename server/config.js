'use strict';
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const env = process.env;
const uploadDir = path.resolve(ROOT, env.UPLOAD_DIR || './data/uploads');

const config = {
  root: ROOT,
  port: Number(env.PORT) || 3000,
  prod: env.NODE_ENV === 'production',
  siteUrl: (env.SITE_URL || `http://localhost:${Number(env.PORT) || 3000}`).replace(/\/$/, ''),
  defaultLang: env.DEFAULT_LANG === 'en' ? 'en' : 'ar',
  sessionDays: Number(env.SESSION_DAYS) || 30,
  secret: env.APP_SECRET || 'dev-secret',
  uploadDir,
  privateDir: path.join(uploadDir, 'private'),
  maxUploadMb: 50,
  smtp: {
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(env.SMTP_PORT) || 465,
    user: env.SMTP_USER || '',
    pass: (env.SMTP_PASS || '').replace(/\s+/g, ''),
    from: env.MAIL_FROM || env.SMTP_USER || '',
  },
  admin: { login: (env.ADMIN_LOGIN || 'admin').toLowerCase(), password: env.ADMIN_PASSWORD || 'admin321' },
};
config.mailEnabled = !!(config.smtp.user && config.smtp.pass);

fs.mkdirSync(config.privateDir, { recursive: true });

module.exports = config;
