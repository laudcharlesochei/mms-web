// Production server for Heroku (mms-web): serves the built SPA from /dist with security headers,
// generates /config.js from environment variables (so one build works for any API), and falls
// back to index.html for client-side routes.
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, 'dist');
const app = express();
const port = process.env.PORT || 5173;

// API_BASE_URL is the Heroku config var to set. VITE_API_BASE_URL is accepted too, because people often
// set that name; without either, the app would try http://localhost:8080 and show "Cannot reach the MMS server".
const apiBaseUrl = (process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:8080')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api\/v1$/, '');
if (!process.env.API_BASE_URL && !process.env.VITE_API_BASE_URL) {
  console.warn('WARNING: API_BASE_URL is not set - the web app will call http://localhost:8080. ' +
    'Run: heroku config:set API_BASE_URL=https://<your-api-app>.herokuapp.com');
}
const runtimeConfig = {
  apiBaseUrl,
  entraClientId: process.env.ENTRA_CLIENT_ID || '',
  entraTenantId: process.env.ENTRA_TENANT_ID || '',
  entraApiScope: process.env.ENTRA_API_SCOPE || '',
};

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Redirect HTTP to HTTPS behind the Heroku router
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'", apiBaseUrl, 'https://login.microsoftonline.com'],
        'frame-src': ["'self'", 'https://login.microsoftonline.com'],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'", 'https://login.microsoftonline.com'],
        'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());

app.get('/config.js', (_req, res) => {
  res.type('application/javascript').set('Cache-Control', 'no-store');
  res.send(`window.__MMS_CONFIG__ = ${JSON.stringify(runtimeConfig)};`);
});

app.get('/healthz', (_req, res) => res.json({ status: 'UP' }));

app.use(
  '/assets',
  express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }),
);
app.use(express.static(dist, { index: false, maxAge: '1h' }));

app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(dist, 'index.html'));
});

app.listen(port, () => {
  console.log(`mms-web listening on ${port} (API ${apiBaseUrl})`);
});
