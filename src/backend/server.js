import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

/** Security headers via Helmet (HSTS, CSP, X-Frame-Options) */
app.use(helmet({ contentSecurityPolicy: false }));

/** CORS — restrict in production */
const allowedOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'https://safeflow-command-center-415569814474.us-central1.run.app'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS access denied'), false);
  },
  methods: ['GET', 'POST']
}));

/** Rate limiting on API endpoints — 100 req/min */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please wait before retrying.' }
});

app.use('/api/', apiLimiter);
app.use(express.json({ limit: '10kb' }));

// Serving static files from the public folder
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

/** Request audit logger */
app.use('/api/', (req, res, next) => {
  const ts = new Date().toISOString();
  const email = req.user ? req.user.email : 'anonymous';
  console.log(`[AUDIT] ${ts} | ${req.method} ${req.path} | User: ${email} | IP: ${req.ip}`);
  next();
});

// ==========================================
// ROUTING
// ==========================================
app.use('/api', apiRouter);

// Fallback to serve the landing page on undefined frontend views
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SafeFlow running on port ${PORT}`);
});
