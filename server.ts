import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  getD1Store,
  saveD1Store,
  getMediaUsagesInD1,
  saveMediaSlotDraftInD1,
  publishMediaSlotInD1,
  publishAllMediaSlotsInD1
} from './server/d1Store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuidV4(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function turnstileEnabledDev(): boolean {
  return process.env.TURNSTILE_ENABLED === 'true';
}

async function verifyTurnstileDev(
  token: unknown,
  remoteIp: string,
  expectedAction: string
): Promise<boolean> {
  if (!turnstileEnabledDev()) {
    return true;
  }
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secretKey) {
    return false;
  }
  if (typeof token !== 'string') {
    return false;
  }
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.length > 2048) {
    return false;
  }

  const isTestSecret = secretKey.startsWith('1x0000000000000000000000000000000AA');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret: secretKey,
        response: cleanToken,
        remoteip: remoteIp || undefined,
        idempotency_key: crypto.randomUUID()
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      return false;
    }

    const result = (await resp.json().catch(() => ({}))) as any;
    if (!result.success) {
      return false;
    }

    if (result.action && result.action !== expectedAction) {
      return false;
    }

    if (!isTestSecret && process.env.TURNSTILE_ALLOWED_HOSTNAMES && process.env.TURNSTILE_ALLOWED_HOSTNAMES.trim()) {
      const allowedHostnames = process.env.TURNSTILE_ALLOWED_HOSTNAMES
        .split(',')
        .map(h => h.trim().toLowerCase())
        .filter(Boolean);
      if (allowedHostnames.length > 0) {
        const resultHostname = (result.hostname || '').toLowerCase().trim();
        if (!resultHostname || !allowedHostnames.includes(resultHostname)) {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function writeNotificationLogDev(data: {
  eventType: string;
  entityId: string;
  recipient?: string;
  status: 'sent' | 'failed' | 'skipped';
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}) {
  try {
    const store = getD1Store();
    if (!store.notification_delivery_logs) store.notification_delivery_logs = [];
    const logItem = {
      id: crypto.randomUUID(),
      channel: 'email',
      provider: 'resend',
      event_type: data.eventType,
      entity_id: data.entityId,
      recipient: data.recipient || null,
      status: data.status,
      provider_message_id: data.providerMessageId || null,
      error_code: data.errorCode || null,
      error_message: data.errorMessage ? String(data.errorMessage).substring(0, 500) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.notification_delivery_logs.unshift(logItem);
    saveD1Store({ notification_delivery_logs: store.notification_delivery_logs });
  } catch (err) {
    console.warn('Dev notification log warning:', err);
  }
}

async function sendStaffNotificationDev(options: {
  formKey: 'appointmentForm' | 'contactForm' | 'secondOpinionForm';
  eventType: 'appointment' | 'contact' | 'second_opinion';
  entityId: string;
}) {
  try {
    const enabled = process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';
    if (!enabled) {
      writeNotificationLogDev({
        eventType: options.eventType,
        entityId: options.entityId,
        status: 'skipped',
        errorMessage: 'Email notifications disabled (EMAIL_NOTIFICATIONS_ENABLED !== true)'
      });
      return { success: false, error: 'Email notifications disabled' };
    }

    const store = getD1Store();
    const config = store.site_settings?.formBuilderConfig;
    const recipient = config?.[options.formKey]?.notificationEmail;
    if (!recipient || !isValidEmailAddress(recipient)) {
      writeNotificationLogDev({
        eventType: options.eventType,
        entityId: options.entityId,
        status: 'skipped',
        errorMessage: `No valid notificationEmail configured for form ${options.formKey}`
      });
      return { success: false, error: 'No recipient email configured' };
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const fromAddress = process.env.NOTIFICATION_FROM_EMAIL?.trim();

    if (!resendApiKey || !fromAddress) {
      writeNotificationLogDev({
        eventType: options.eventType,
        entityId: options.entityId,
        recipient,
        status: 'skipped',
        errorMessage: 'Missing RESEND_API_KEY or NOTIFICATION_FROM_EMAIL'
      });
      return { success: false, error: 'Server Resend credentials not configured' };
    }

    const adminUrl = process.env.ADMIN_APP_URL?.trim() || '';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    let subject = '';
    let categoryTitle = '';
    let extraNotice = '';

    if (options.eventType === 'appointment') {
      subject = 'New appointment request received';
      categoryTitle = 'Appointment Request';
    } else if (options.eventType === 'second_opinion') {
      subject = 'New second opinion request received';
      categoryTitle = 'Second Opinion Request';
      extraNotice = 'Secure reports, if submitted, are available only inside the authenticated admin workflow.';
    } else {
      subject = 'New website enquiry received';
      categoryTitle = 'Website Enquiry';
    }

    const textLines = [
      `A new ${categoryTitle.toLowerCase()} has been received through the website.`,
      '',
      `Request ID: ${options.entityId}`,
      `Received: ${timestamp}`
    ];
    if (extraNotice) textLines.push('', extraNotice);
    if (adminUrl) textLines.push('', 'Sign in to the secure admin panel to review the submission:', adminUrl);
    const textBody = textLines.join('\n');

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="display: inline-block; padding: 4px 12px; background: #f0fdfa; border: 1px solid #ccfbf1; color: #0f766e; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
      ${escapeHtml(categoryTitle)}
    </div>
    <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">New ${escapeHtml(categoryTitle.toLowerCase())} has been received.</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
      A submission was received through the official website. For privacy, full patient details are accessible strictly within the secure admin dashboard.
    </p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
      <div style="margin-bottom: 6px;"><strong style="color: #0f172a;">Submission ID:</strong> <code style="font-family: monospace; color: #0f766e;">${escapeHtml(options.entityId)}</code></div>
      <div><strong style="color: #0f172a;">Received At:</strong> ${escapeHtml(timestamp)}</div>
    </div>
    ${extraNotice ? `<p style="font-size: 13px; color: #64748b; font-style: italic; margin-bottom: 20px;">${escapeHtml(extraNotice)}</p>` : ''}
    ${adminUrl ? `
    <div style="text-align: left; margin-top: 24px;">
      <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #073F3D; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 10px;">
        Review in Admin Panel &rarr;
      </a>
    </div>` : ''}
  </div>
</body>
</html>`;

    const idempotencyKey = `website-notification/${options.eventType}/${options.entityId}`;
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        from: `Dr. Bhushan Website <${fromAddress}>`,
        to: [recipient],
        subject,
        text: textBody,
        html: htmlBody
      })
    });

    if (!resendRes.ok) {
      const errJson = await resendRes.json().catch(() => ({})) as any;
      const errorMsg = errJson?.message || errJson?.error || `HTTP ${resendRes.status}`;
      writeNotificationLogDev({
        eventType: options.eventType,
        entityId: options.entityId,
        recipient,
        status: 'failed',
        errorCode: String(resendRes.status),
        errorMessage: errorMsg
      });
      return { success: false, error: errorMsg };
    }

    const resJson = await resendRes.json().catch(() => ({})) as any;
    writeNotificationLogDev({
      eventType: options.eventType,
      entityId: options.entityId,
      recipient,
      status: 'sent',
      providerMessageId: resJson?.id
    });
    return { success: true };
  } catch (err: any) {
    writeNotificationLogDev({
      eventType: options.eventType,
      entityId: options.entityId,
      status: 'failed',
      errorMessage: err.message
    });
    return { success: false, error: err.message };
  }
}

// Ensure public uploads directories exist for simulated Cloudflare R2 public bucket
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure private reports directory exists for simulated Cloudflare R2 private bucket
// CRITICAL: This directory is inside data/ and NOT exposed statically, ensuring zero unauthorized public access
const privateReportsDir = path.join(process.cwd(), 'data', 'private_reports');
if (!fs.existsSync(privateReportsDir)) {
  fs.mkdirSync(privateReportsDir, { recursive: true });
}

// Multer storage setup for local PC direct uploads to R2 public bucket simulation
const publicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = (req.body.category || 'doctor').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const catDir = path.join(uploadsDir, 'website', category);
    if (!fs.existsSync(catDir)) {
      fs.mkdirSync(catDir, { recursive: true });
    }
    cb(null, catDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.webp';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    cb(null, `${timestamp}-${random}${ext}`);
  }
});

const publicUpload = multer({
  storage: publicStorage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Multer storage setup for private patient records (biopsies, scans) to R2 private bucket simulation
const privateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const reqId = (req.body.requestId || req.body.request_id || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = path.join(privateReportsDir, reqId);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${cleanName}${ext}`);
  }
});

const privateUpload = multer({
  storage: privateStorage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB max
});

function normalizeHomepageSection(row: any) {
  return {
    id: row.id || row.section_key || '',
    name: row.title || row.section_key || '',
    visible: Boolean(row.is_visible),
    order: Number(row.display_order || 0),
    customTitle: row.title || '',
    customSubtitle: row.subtitle || ''
  };
}

function normalizeNavigationItem(row: any) {
  return {
    id: row.id,
    label: row.label || '',
    url: row.url || '',
    order: Number(row.display_order || 0),
    isVisible: Boolean(row.is_visible),
    isExternal: Boolean(row.is_external),
    openInNewTab: Boolean(row.open_in_new_tab)
  };
}

function safeJsonParse(value: any, fallback: any) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeFooterRow(row: any) {
  if (!row) return {};
  return {
    doctorDescription: row.about_text || row.doctorDescription || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    address: row.address || '',
    copyright: row.copyright_text || row.copyright || '',
    medicalDisclaimer: row.medical_disclaimer || row.medicalDisclaimer || '',
    privacyPolicyLink: row.privacy_policy_link || row.privacyPolicyLink || '',
    socialLinks: safeJsonParse(row.social_links || row.socialLinks, {}),
    footerCta: safeJsonParse(row.footer_cta || row.footerCta, {})
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // CORS configuration (Enforcing ALLOWED_ORIGIN and secure credentials)
  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin || '';
    const configuredOrigin = process.env.ALLOWED_ORIGIN || 'https://drbhushanparmar.com';

    const isAllowed =
      requestOrigin === configuredOrigin ||
      requestOrigin.startsWith('http://localhost:') ||
      requestOrigin.startsWith('http://127.0.0.1:') ||
      requestOrigin.endsWith('.run.app');

    const allowOrigin = isAllowed ? requestOrigin : configuredOrigin;

    res.header('Access-Control-Allow-Origin', allowOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // -------------------------------------------------------------
  // AUTHENTICATION & SESSION MANAGEMENT HELPERS (PBKDF2-SHA256)
  // -------------------------------------------------------------
  function hashPasswordPBKDF2Sync(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 210000, 32, 'sha256').toString('hex');
  }

  function verifyPasswordPBKDF2Sync(password: string, salt: string, storedHash: string): boolean {
    const computed = hashPasswordPBKDF2Sync(password, salt);
    if (computed.length !== storedHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computed, 'utf-8'), Buffer.from(storedHash, 'utf-8'));
  }

  function generateSessionTokenNode(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  function hashSessionTokenNode(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  const COOKIE_NAME = 'dr_bhushan_admin_session';

  function getSessionTokenFromExpressReq(req: express.Request): string | null {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
      if (match) return decodeURIComponent(match[1].trim());
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    return null;
  }

  function getSessionUserNode(req: express.Request): any | null {
    const token = getSessionTokenFromExpressReq(req);
    if (!token) return null;

    const store = getD1Store();
    const tokenHash = hashSessionTokenNode(token);
    const nowIso = new Date().toISOString();

    const session = (store.admin_sessions || []).find(
      (s: any) => s.token_hash === tokenHash && s.expires_at > nowIso
    );
    if (!session) return null;

    const user = (store.admin_users || []).find(
      (u: any) => u.id === session.user_id && u.status === 'active'
    );
    if (!user) return null;

    session.last_used_at = new Date().toISOString();
    saveD1Store({ admin_sessions: store.admin_sessions });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin || user.last_login
    };
  }

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const user = getSessionUserNode(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Valid administrator session required' });
    }
    (req as any).adminUser = user;
    next();
  }

  function requireRole(allowedRoles: string[]) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = (req as any).adminUser || getSessionUserNode(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Administrator session required' });
      }
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient privileges for this operation' });
      }
      (req as any).adminUser = user;
      next();
    };
  }

  // -------------------------------------------------------------
  // AUTHENTICATION API ROUTES (/api/admin/auth/*)
  // -------------------------------------------------------------

  app.post('/api/admin/auth/login', (req, res) => {
    try {
      const { email, password, rememberMe } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const store = getD1Store();
      const trimmedEmail = String(email).trim().toLowerCase();
      const user = (store.admin_users || []).find(
        (u: any) => u.email.toLowerCase() === trimmedEmail && u.status === 'active'
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValid = verifyPasswordPBKDF2Sync(password, user.salt, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const rawToken = generateSessionTokenNode();
      const tokenHash = hashSessionTokenNode(rawToken);
      const maxAgeSeconds = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
      const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();

      const newSession = {
        id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString()
      };

      store.admin_sessions = [newSession, ...(store.admin_sessions || []).slice(0, 50)];
      user.last_login = new Date().toISOString();
      saveD1Store({ admin_sessions: store.admin_sessions, admin_users: store.admin_users });

      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
      res.setHeader(
        'Set-Cookie',
        `${COOKIE_NAME}=${rawToken}; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          lastLogin: user.last_login
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Authentication processing error' });
    }
  });

  app.get('/api/admin/auth/session', (req, res) => {
    const user = getSessionUserNode(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
    }
    res.json({ success: true, user });
  });

  app.post('/api/admin/auth/logout', (req, res) => {
    const token = getSessionTokenFromExpressReq(req);
    if (token) {
      const store = getD1Store();
      const tokenHash = hashSessionTokenNode(token);
      store.admin_sessions = (store.admin_sessions || []).filter((s: any) => s.token_hash !== tokenHash);
      saveD1Store({ admin_sessions: store.admin_sessions });
    }
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=0`
    );
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Serve uploads folder as public R2 simulation endpoint
  app.use('/uploads', express.static(uploadsDir));
  app.use('/api/public/media', express.static(uploadsDir));

  // Initialize Cloudflare D1 Store
  getD1Store();

  // -------------------------------------------------------------
  // SYSTEM & HEALTH API ROUTES
  // -------------------------------------------------------------

  // GET /api/health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Cloudflare Worker & R2 / D1 Backend API Layer (dr-bhushan-api)',
      r2_public_bucket: 'dr-bhushan-public-media',
      r2_private_bucket: 'dr-bhushan-private-reports',
      d1_database: 'dr-bhushan-cms',
      timestamp: new Date().toISOString()
    });
  });

  // GET /api/test-db
  app.get('/api/test-db', (req, res) => {
    const store = getD1Store();
    res.json({
      status: 'ok',
      connected: true,
      database: 'dr-bhushan-cms',
      mediaCount: store.media?.length || 0,
      slotsCount: Object.keys(store.media_slots || {}).length,
      cancersCount: store.cancers?.length || 0,
      treatmentsCount: store.treatments?.length || 0,
      blogsCount: store.blogs?.length || 0,
      enquiriesCount: store.enquiries?.length || 0
    });
  });

  // -------------------------------------------------------------
  // PUBLIC WEBSITE API ROUTES
  // -------------------------------------------------------------

  // GET /api/public/site - Aggregated payload for public website (1 fast request)
  app.get('/api/public/site', (req, res) => {
    try {
      const store = getD1Store();
      const isPreview = req.query.preview === 'draft' || req.query.preview === 'true';

      if (isPreview) {
        const sessionUser = getSessionUserNode(req);
        if (!sessionUser) {
          return res.status(401).json({ error: 'Unauthorized: Draft preview requires an active administrator session.' });
        }
      }

      let siteSettings = { ...store.site_settings };
      let doctorProfile = { ...store.doctor_profile };
      let heroContent = { ...(store.homepage?.hero || {}) };
      let aboutDoctorContent = { ...(store.homepage?.about || {}) };
      let secondOpinionContent = { ...(store.homepage?.second_opinion || {}) };
      let finalCtaContent = { ...(store.homepage?.final_cta || {}) };
      let howCanWeHelp = Array.isArray(store.homepage?.how_can_help) ? [...store.homepage.how_can_help] : [];
      let cancers = Array.isArray(store.cancers) ? [...store.cancers] : [];
      let cancerCategories = Array.isArray(store.cancer_categories) ? [...store.cancer_categories] : [];
      let treatments = Array.isArray(store.treatments) ? [...store.treatments] : [];

      if (isPreview && store.media_slots) {
        const slots = store.media_slots;
        if (slots['slot-hero-doc']) {
          heroContent.doctorHeroImage = slots['slot-hero-doc'].draftValue;
          doctorProfile.photoUrl = slots['slot-hero-doc'].draftValue;
        }
        if (slots['slot-hero-bg']) heroContent.heroBackgroundImage = slots['slot-hero-bg'].draftValue;
        if (slots['slot-about-doc']) aboutDoctorContent.aboutDoctorImage = slots['slot-about-doc'].draftValue;
        if (slots['slot-second-opinion'] || slots['slot-second-opinion-doctor']) {
          const draftVal = slots['slot-second-opinion-doctor']?.draftValue || slots['slot-second-opinion']?.draftValue;
          if (draftVal) secondOpinionContent.secondOpinionImage = draftVal;
        }
        if (slots['slot-second-opinion-banner']) siteSettings.secondOpinionBannerImage = slots['slot-second-opinion-banner'].draftValue;
        if (slots['slot-final-cta-doc']) {
          finalCtaContent.finalCtaImage = slots['slot-final-cta-doc'].draftValue;
          siteSettings.finalCtaDoctorImage = slots['slot-final-cta-doc'].draftValue;
        }
        if (slots['slot-branding-logo']) siteSettings.logoUrl = slots['slot-branding-logo'].draftValue;
        if (slots['slot-favicon']) siteSettings.favicon = slots['slot-favicon'].draftValue;
        if (slots['slot-og-social']) siteSettings.defaultSocialImage = slots['slot-og-social'].draftValue;

        if (slots['slot-pathway-consultation'] && howCanWeHelp[0]) howCanWeHelp[0].image_id = slots['slot-pathway-consultation'].draftValue;
        if (slots['slot-pathway-systemic'] && howCanWeHelp[1]) howCanWeHelp[1].image_id = slots['slot-pathway-systemic'].draftValue;
        if (slots['slot-pathway-second-opinion'] && howCanWeHelp[2]) howCanWeHelp[2].image_id = slots['slot-pathway-second-opinion'].draftValue;

        if (slots['slot-cancer-solid-tumors']) {
          const cat = cancerCategories.find((c: any) => c.slug === 'solid-tumors');
          if (cat) cat.image_id = slots['slot-cancer-solid-tumors'].draftValue;
        }
        if (slots['slot-cancer-blood-malignancies']) {
          const cat = cancerCategories.find((c: any) => c.slug === 'blood-malignancies');
          if (cat) cat.image_id = slots['slot-cancer-blood-malignancies'].draftValue;
        }
        if (slots['slot-treatment-chemotherapy']) {
          const t = treatments.find((t: any) => t.slug === 'chemotherapy-systemic');
          if (t) t.image_id = slots['slot-treatment-chemotherapy'].draftValue;
        }
        if (slots['slot-treatment-targeted']) {
          const t = treatments.find((t: any) => t.slug === 'targeted-therapy');
          if (t) t.image_id = slots['slot-treatment-targeted'].draftValue;
        }
        if (slots['slot-treatment-immunotherapy']) {
          const t = treatments.find((t: any) => t.slug === 'immunotherapy');
          if (t) t.image_id = slots['slot-treatment-immunotherapy'].draftValue;
        }
      }

      // Sanitize media slots for public anonymous consumption (Phase 12)
      const sanitizedSlots: Record<string, any> = {};
      for (const [key, slot] of Object.entries(store.media_slots || {})) {
        if (isPreview) {
          sanitizedSlots[key] = slot;
        } else {
          sanitizedSlots[key] = {
            slotKey: (slot as any).slotKey || key,
            slotName: (slot as any).slotName,
            section: (slot as any).section,
            publishedValue: (slot as any).publishedValue,
            altText: (slot as any).altText,
            focalPoint: (slot as any).focalPoint,
            mobileValue: (slot as any).mobileValue
          };
        }
      }

      const publicSiteSettings = {
        ...siteSettings
      };

      if (siteSettings.formBuilderConfig) {
        publicSiteSettings.formBuilderConfig = {
          appointmentForm: {
            fields: siteSettings.formBuilderConfig?.appointmentForm?.fields || {},
            successMessage: siteSettings.formBuilderConfig?.appointmentForm?.successMessage || ''
          },
          contactForm: {
            fields: siteSettings.formBuilderConfig?.contactForm?.fields || {},
            successMessage: siteSettings.formBuilderConfig?.contactForm?.successMessage || ''
          },
          secondOpinionForm: {
            fields: siteSettings.formBuilderConfig?.secondOpinionForm?.fields || {},
            successMessage: siteSettings.formBuilderConfig?.secondOpinionForm?.successMessage || ''
          }
        };
      }

      res.json({
        success: true,
        isPreview,
        siteSettings: publicSiteSettings,
        doctorProfile,
        heroContent,
        aboutDoctorContent,
        secondOpinionContent,
        finalCtaContent,
        heroAnimationSettings: store.homepage?.animations?.hero,
        globalAnimationSettings: store.homepage?.animations?.global,
        homepageSections: (store.homepage?.sections || []).map(normalizeHomepageSection).sort((a,b) => a.order - b.order),
        howCanWeHelp,
        treatmentJourney: store.homepage?.journey_steps || [],
        cancers,
        cancerCategories,
        cancerPages: store.cancer_pages || [],
        treatments,
        bodyExplorerRegions: store.body_explorer || [],
        locations: store.locations || [],
        blogPosts: store.blogs || [],
        faqs: store.faqs || [],
        testimonials: store.testimonials || [],
        navigationMenu: (store.navigation || []).map(normalizeNavigationItem).sort((a,b) => a.order - b.order),
        footerConfig: normalizeFooterRow(store.footer),
        mediaAssets: store.media || [],
        mediaSlots: sanitizedSlots,
        updated_at: store.updated_at
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch public site data from D1' });
    }
  });

  // GET /api/public/homepage
  app.get('/api/public/homepage', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, homepage: store.homepage, siteSettings: store.site_settings });
  });

  // GET /api/public/doctor
  app.get('/api/public/doctor', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, doctorProfile: store.doctor_profile });
  });

  // GET /api/public/cancer-care (and alias /api/public/cancers)
  app.get(['/api/public/cancer-care', '/api/public/cancers'], (req, res) => {
    const store = getD1Store();
    res.json({ success: true, cancers: store.cancers, categories: store.cancer_categories });
  });

  // GET /api/public/cancer-care/:slug
  app.get('/api/public/cancer-care/:slug', (req, res) => {
    const store = getD1Store();
    const item = (store.cancers || []).find(
      (c: any) =>
        (c.slug === req.params.slug || c.id === req.params.slug) &&
        (c.status === 'published' || c.status === undefined)
    );
    if (!item) return res.status(404).json({ error: 'Cancer specialty not found' });
    res.json({ success: true, cancer: item });
  });

  // GET /api/public/treatments
  app.get('/api/public/treatments', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, treatments: store.treatments });
  });

  // GET /api/public/treatments/:slug
  app.get('/api/public/treatments/:slug', (req, res) => {
    const store = getD1Store();
    const item = (store.treatments || []).find(
      (t: any) =>
        (t.slug === req.params.slug || t.id === req.params.slug) &&
        (t.status === 'published' || t.status === undefined)
    );
    if (!item) return res.status(404).json({ error: 'Treatment modality not found' });
    res.json({ success: true, treatment: item });
  });

  // GET /api/public/blogs
  app.get('/api/public/blogs', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, blogs: store.blogs });
  });

  // GET /api/public/blogs/:slug
  app.get('/api/public/blogs/:slug', (req, res) => {
    const store = getD1Store();
    const blog = (store.blogs || []).find(
      (b: any) =>
        (b.slug === req.params.slug || b.id === req.params.slug) &&
        (b.isPublished !== false && b.is_published !== false && b.status !== 'draft')
    );
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.json({ success: true, blog });
  });

  // GET /api/public/locations
  app.get('/api/public/locations', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, locations: store.locations });
  });

  // GET /api/public/faqs
  app.get('/api/public/faqs', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, faqs: store.faqs });
  });

  // GET /api/public/navigation
  app.get('/api/public/navigation', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, navigation: store.navigation });
  });

  // GET /api/public/footer
  app.get('/api/public/footer', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, footer: store.footer });
  });

  // GET /api/public/body-explorer
  app.get('/api/public/body-explorer', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, bodyExplorerRegions: store.body_explorer });
  });

  // POST /api/public/enquiries - Public enquiry submission (Appointments, Contact)
  app.post('/api/public/enquiries', async (req, res) => {
    try {
      const body = req.body || {};
      const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
      if (honeypot) {
        return res.status(201).json({ success: true, message: 'Enquiry received', enquiryId: `enq-${Date.now()}` });
      }

      const rawType = typeof body.type === 'string' ? body.type.trim() : 'general';
      const allowedTypes = ['appointment', 'contact', 'general'];
      if (!allowedTypes.includes(rawType)) {
        return res.status(400).json({ error: 'Invalid enquiry type' });
      }

      const expectedAction = rawType === 'appointment' ? 'appointment' : 'contact';
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const turnstileOk = await verifyTurnstileDev(
        body.turnstileToken,
        clientIp,
        expectedAction
      );
      if (!turnstileOk) {
        return res.status(403).json({ error: 'Security verification failed. Please try again.' });
      }

      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const preferredDate = typeof (body.preferredDate ?? body.preferred_date) === 'string' ? (body.preferredDate ?? body.preferred_date).trim() : '';
      const preferredTime = typeof (body.preferredTime ?? body.preferred_time ?? body.preferredSlot) === 'string' ? (body.preferredTime ?? body.preferred_time ?? body.preferredSlot).trim() : '';
      const locationId = typeof (body.locationId ?? body.location_id) === 'string' ? (body.locationId ?? body.location_id).trim() : '';
      const cancerType = typeof (body.cancerType ?? body.cancer_type ?? body.cancerTypeOrConcern) === 'string' ? (body.cancerType ?? body.cancer_type ?? body.cancerTypeOrConcern).trim() : '';
      const consultationType = typeof (body.consultationType ?? body.consultation_type) === 'string' ? (body.consultationType ?? body.consultation_type).trim() : '';
      const message = typeof (body.message ?? body.notes) === 'string' ? (body.message ?? body.notes).trim() : '';

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (name.length > 120) {
        return res.status(400).json({ error: 'Name exceeds maximum length of 120 characters' });
      }
      if (!phone && !email) {
        return res.status(400).json({ error: 'At least phone or email is required' });
      }
      if (phone && phone.length > 40) {
        return res.status(400).json({ error: 'Phone exceeds maximum length of 40 characters' });
      }
      if (email) {
        if (email.length > 254) {
          return res.status(400).json({ error: 'Email exceeds maximum length of 254 characters' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email address format' });
        }
      }
      if (preferredDate.length > 40) return res.status(400).json({ error: 'Preferred date exceeds maximum length' });
      if (preferredTime.length > 100) return res.status(400).json({ error: 'Preferred time exceeds maximum length' });
      if (locationId.length > 100) return res.status(400).json({ error: 'Location ID exceeds maximum length' });
      if (cancerType.length > 200) return res.status(400).json({ error: 'Cancer type exceeds maximum length' });
      if (consultationType.length > 100) return res.status(400).json({ error: 'Consultation type exceeds maximum length' });
      if (message.length > 5000) return res.status(400).json({ error: 'Message exceeds maximum length' });

      const store = getD1Store();
      const enquiry = {
        id: `enq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: rawType,
        name,
        phone,
        email,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        location_id: locationId,
        cancer_type: cancerType,
        consultation_type: consultationType,
        message,
        created_at: new Date().toISOString(),
        status: 'new'
      };
      store.enquiries = [enquiry, ...(store.enquiries || [])];
      saveD1Store({ enquiries: store.enquiries });

      if (rawType === 'appointment') {
        sendStaffNotificationDev({
          formKey: 'appointmentForm',
          eventType: 'appointment',
          entityId: enquiry.id
        }).catch(() => {});
      } else {
        sendStaffNotificationDev({
          formKey: 'contactForm',
          eventType: 'contact',
          entityId: enquiry.id
        }).catch(() => {});
      }

      res.status(201).json({ success: true, message: 'Enquiry recorded in D1', enquiryId: enquiry.id, enquiry });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record enquiry in D1' });
    }
  });

  // POST /api/public/second-opinion - Public second opinion submission
  app.post('/api/public/second-opinion', async (req, res) => {
    try {
      const body = req.body || {};
      const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
      if (honeypot) {
        return res.status(201).json({ success: true, message: 'Second opinion request recorded', requestId: crypto.randomUUID() });
      }

      let id: string;
      if (body.requestId !== undefined && body.requestId !== null) {
        const rawReqId = String(body.requestId).trim();
        if (!isValidUuidV4(rawReqId)) {
          return res.status(400).json({ error: 'Invalid request ID' });
        }
        id = rawReqId;
      } else {
        id = crypto.randomUUID();
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const turnstileOk = await verifyTurnstileDev(
        body.turnstileToken,
        clientIp,
        'second_opinion'
      );
      if (!turnstileOk) {
        return res.status(403).json({ error: 'Security verification failed. Please try again.' });
      }

      const patientName = typeof (body.patientName ?? body.patient_name ?? body.name) === 'string' ? (body.patientName ?? body.patient_name ?? body.name).trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const city = typeof (body.city ?? body.cityCountry ?? body.city_country) === 'string' ? (body.city ?? body.cityCountry ?? body.city_country).trim() : '';
      const country = typeof body.country === 'string' ? body.country.trim() : '';
      const cancerType = typeof (body.cancerType ?? body.cancer_type) === 'string' ? (body.cancerType ?? body.cancer_type).trim() : '';
      const stage = typeof (body.stage ?? body.currentDiagnosis ?? body.current_diagnosis) === 'string' ? (body.stage ?? body.currentDiagnosis ?? body.current_diagnosis).trim() : '';
      const currentTreatment = typeof (body.currentTreatment ?? body.current_treatment ?? body.previousTreatment ?? body.previous_treatment) === 'string' ? (body.currentTreatment ?? body.current_treatment ?? body.previousTreatment ?? body.previous_treatment).trim() : '';
      const specificQuestions = typeof (body.specificQuestions ?? body.specific_questions ?? body.message) === 'string' ? (body.specificQuestions ?? body.specific_questions ?? body.message).trim() : '';
      const urgency = typeof body.urgency === 'string' ? body.urgency.trim() : 'routine';

      if (!patientName) {
        return res.status(400).json({ error: 'Patient name is required' });
      }
      if (patientName.length > 120) {
        return res.status(400).json({ error: 'Patient name exceeds maximum length of 120 characters' });
      }
      if (!phone && !email) {
        return res.status(400).json({ error: 'At least phone or email is required' });
      }
      if (phone && phone.length > 40) {
        return res.status(400).json({ error: 'Phone exceeds maximum length of 40 characters' });
      }
      if (email) {
        if (email.length > 254) {
          return res.status(400).json({ error: 'Email exceeds maximum length of 254 characters' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email address format' });
        }
      }
      if (city.length > 150) return res.status(400).json({ error: 'City exceeds maximum length of 150 characters' });
      if (country.length > 100) return res.status(400).json({ error: 'Country exceeds maximum length of 100 characters' });
      if (cancerType.length > 200) return res.status(400).json({ error: 'Cancer type exceeds maximum length of 200 characters' });
      if (stage.length > 500) return res.status(400).json({ error: 'Diagnosis/stage details exceed maximum length of 500 characters' });
      if (currentTreatment.length > 3000) return res.status(400).json({ error: 'Treatment history exceeds maximum length of 3000 characters' });
      if (specificQuestions.length > 5000) return res.status(400).json({ error: 'Questions/message exceeds maximum length of 5000 characters' });
      if (urgency.length > 50) return res.status(400).json({ error: 'Urgency exceeds maximum length of 50 characters' });

      const store = getD1Store();
      const requestRecord = {
        id,
        patient_name: patientName,
        phone,
        email,
        city,
        country,
        cancer_type: cancerType,
        stage,
        current_treatment: currentTreatment,
        specific_questions: specificQuestions,
        urgency,
        status: 'new',
        created_at: new Date().toISOString()
      };
      store.second_opinion_requests = [requestRecord, ...(store.second_opinion_requests || [])];
      saveD1Store({ second_opinion_requests: store.second_opinion_requests });

      sendStaffNotificationDev({
        formKey: 'secondOpinionForm',
        eventType: 'second_opinion',
        entityId: id
      }).catch(() => {});

      res.status(201).json({ success: true, message: 'Second opinion request registered', requestId: id });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record second opinion request in D1' });
    }
  });

  // POST /api/public/second-opinion/upload-report - Direct file upload to private R2 storage simulation
  // CRITICAL: NO public URL is returned. Patient files are protected in private storage.
  app.post('/api/public/second-opinion/upload-report', privateUpload.single('file') as any, (req: any, res: any) => {
    try {
      const file = req.file;
      const rawRequestId = (req.body?.requestId as string) || (req.body?.request_id as string);
      const fileType = req.body?.fileType || 'biopsy';

      if (!rawRequestId || !rawRequestId.trim()) {
        return res.status(400).json({ error: 'Request ID required' });
      }

      const requestId = rawRequestId.trim();
      if (!isValidUuidV4(requestId)) {
        return res.status(400).json({ error: 'Invalid request ID' });
      }

      if (!file) {
        return res.status(400).json({ error: 'No report file provided' });
      }

      const store = getD1Store();
      const parent = (store.second_opinion_requests || []).find((r: any) => r.id === requestId);
      if (!parent) {
        return res.status(404).json({ error: 'Second opinion request not found' });
      }

      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, JPG, PNG, or WEBP only.' });
      }
      if (file.size > 15 * 1024 * 1024) {
        return res.status(400).json({ error: 'File size exceeds 15MB limit.' });
      }

      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const storageKey = `reports/${requestId}/${file.filename}`;

      const fileRecord = {
        id: fileId,
        request_id: requestId,
        storage_key: storageKey,
        original_filename: file.originalname,
        local_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        file_type: fileType,
        uploaded_at: new Date().toISOString()
      };

      store.second_opinion_files = [fileRecord, ...(store.second_opinion_files || [])];
      saveD1Store({ second_opinion_files: store.second_opinion_files });

      res.status(201).json({
        success: true,
        fileId,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        message: 'Patient medical record securely stored in private R2 bucket'
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record report in D1' });
    }
  });

  // -------------------------------------------------------------
  // ADMIN API ROUTES (PROTECTED WITH AUTH & ROLE AUTHORIZATION)
  // -------------------------------------------------------------

  app.use('/api/admin', (req, res, next) => {
    if (req.path === '/auth/login') {
      return next();
    }
    requireAdmin(req, res, next);
  });

  // GET /api/admin/users - Super admin only
  app.get('/api/admin/users', requireRole(['super_admin']), (req, res) => {
    const store = getD1Store();
    const cleanUsers = (store.admin_users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt || u.created_at,
      lastLogin: u.lastLogin || u.last_login
    }));
    res.json({ success: true, users: cleanUsers });
  });

  // POST /api/admin/users - Super admin only
  app.post('/api/admin/users', requireRole(['super_admin']), (req, res) => {
    const { email, password, name, role } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    const store = getD1Store();
    const salt = crypto.randomBytes(16).toString('hex');
    const password_hash = hashPasswordPBKDF2Sync(password, salt);
    const newUser = {
      id: `usr-${Date.now()}`,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: role || 'content_manager',
      password_hash,
      salt,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };
    store.admin_users = [...(store.admin_users || []), newUser];
    saveD1Store({ admin_users: store.admin_users });
    res.status(201).json({
      success: true,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, status: newUser.status }
    });
  });

  // DELETE /api/admin/users/:id - Super admin only
  app.delete('/api/admin/users/:id', requireRole(['super_admin']), (req, res) => {
    const store = getD1Store();
    const current = (req as any).adminUser;
    if (current && current.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete active administrator account' });
    }
    store.admin_users = (store.admin_users || []).filter((u: any) => u.id !== req.params.id);
    saveD1Store({ admin_users: store.admin_users });
    res.json({ success: true, message: 'Administrator account deleted' });
  });

  // GET /api/admin/all - Full admin dataset fetch
  app.get('/api/admin/all', (req, res) => {
    try {
      const store = getD1Store();
      res.json({ success: true, data: store });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch admin dataset', details: err.message });
    }
  });

  // GET /api/admin/homepage
  app.get('/api/admin/homepage', (req, res) => {
    const store = getD1Store();
    const sections = (store.homepage?.sections || []).map(normalizeHomepageSection).sort((a,b) => a.order - b.order);
    res.json({ success: true, homepage: store.homepage, sections });
  });

  // PUT /api/admin/homepage - Update entire Homepage
  app.put('/api/admin/homepage', (req, res) => {
    try {
      const store = getD1Store();
      const updatedHomepage = { ...store.homepage, ...req.body };
      saveD1Store({ homepage: updatedHomepage });
      res.json({ success: true, message: 'Homepage updated in D1', homepage: updatedHomepage });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update homepage', details: err.message });
    }
  });

  // PUT /api/admin/homepage/:sectionKey - Update specific section in Homepage
  app.put('/api/admin/homepage/:sectionKey', (req, res) => {
    try {
      const { sectionKey } = req.params;
      const store = getD1Store();
      if (!store.homepage) (store as any).homepage = {};

      (store.homepage as any)[sectionKey] = {
        ...((store.homepage as any)[sectionKey] || {}),
        ...req.body
      };

      saveD1Store({ homepage: store.homepage });
      res.json({ success: true, message: `Homepage section ${sectionKey} updated`, section: (store.homepage as any)[sectionKey] });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to update section ${req.params.sectionKey}`, details: err.message });
    }
  });

  // GET /api/admin/doctor
  app.get('/api/admin/doctor', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, doctorProfile: store.doctor_profile });
  });

  // PUT /api/admin/doctor - Update Doctor Profile in D1
  app.put('/api/admin/doctor', (req, res) => {
    try {
      const store = getD1Store();
      const updatedDoctor = { ...store.doctor_profile, ...req.body };
      saveD1Store({ doctor_profile: updatedDoctor });
      res.json({ success: true, message: 'Doctor profile updated in D1', doctorProfile: updatedDoctor });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update doctor profile', details: err.message });
    }
  });

  // GET /api/admin/cancer-care & /api/admin/cancers
  app.get(['/api/admin/cancer-care', '/api/admin/cancers'], (req, res) => {
    const store = getD1Store();
    res.json({ success: true, cancers: store.cancers, categories: store.cancer_categories });
  });

  // PUT /api/admin/cancer-care & /api/admin/cancers (Bulk or list update)
  app.put(['/api/admin/cancer-care', '/api/admin/cancers'], (req, res) => {
    try {
      const store = getD1Store();
      const list = Array.isArray(req.body) ? req.body : (req.body.cancers || req.body.cancerCare || []);
      store.cancers = list;
      saveD1Store({ cancers: store.cancers });
      res.json({ success: true, message: 'Cancers updated in D1', cancers: store.cancers });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update cancers', details: err.message });
    }
  });

  // POST /api/admin/cancer-care
  app.post(['/api/admin/cancer-care', '/api/admin/cancers'], (req, res) => {
    const store = getD1Store();
    const newCancer = { id: `cancer-${Date.now()}`, ...req.body };
    store.cancers = [newCancer, ...(store.cancers || [])];
    saveD1Store({ cancers: store.cancers });
    res.status(201).json({ success: true, cancer: newCancer });
  });

  // PUT /api/admin/cancer-care/:id
  app.put(['/api/admin/cancer-care/:id', '/api/admin/cancers/:id'], (req, res) => {
    const store = getD1Store();
    const index = (store.cancers || []).findIndex((c: any) => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Cancer record not found' });
    store.cancers[index] = { ...store.cancers[index], ...req.body };
    saveD1Store({ cancers: store.cancers });
    res.json({ success: true, cancer: store.cancers[index] });
  });

  // DELETE /api/admin/cancer-care/:id
  app.delete(['/api/admin/cancer-care/:id', '/api/admin/cancers/:id'], (req, res) => {
    const store = getD1Store();
    store.cancers = (store.cancers || []).filter((c: any) => c.id !== req.params.id);
    saveD1Store({ cancers: store.cancers });
    res.json({ success: true, message: 'Cancer record deleted from D1' });
  });

  // Cancer Categories
  app.put('/api/admin/cancer-categories', (req, res) => {
    const store = getD1Store();
    store.cancer_categories = Array.isArray(req.body) ? req.body : (req.body.categories || []);
    saveD1Store({ cancer_categories: store.cancer_categories });
    res.json({ success: true, categories: store.cancer_categories });
  });

  // Cancer Pages
  app.get('/api/admin/cancer-pages', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, cancerPages: store.cancer_pages || [] });
  });

  app.put('/api/admin/cancer-pages', (req, res) => {
    const store = getD1Store();
    store.cancer_pages = Array.isArray(req.body) ? req.body : (req.body.pages || req.body.cancerPages || []);
    saveD1Store({ cancer_pages: store.cancer_pages });
    res.json({ success: true, cancerPages: store.cancer_pages });
  });

  // GET / POST / PUT / DELETE /api/admin/treatments
  app.get('/api/admin/treatments', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, treatments: store.treatments });
  });

  app.put('/api/admin/treatments', (req, res) => {
    try {
      const store = getD1Store();
      const list = Array.isArray(req.body) ? req.body : (req.body.treatments || []);
      store.treatments = list;
      saveD1Store({ treatments: store.treatments });
      res.json({ success: true, message: 'Treatments updated in D1', treatments: store.treatments });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update treatments', details: err.message });
    }
  });

  app.post('/api/admin/treatments', (req, res) => {
    const store = getD1Store();
    const newTreatment = { id: `treatment-${Date.now()}`, ...req.body };
    store.treatments = [newTreatment, ...(store.treatments || [])];
    saveD1Store({ treatments: store.treatments });
    res.status(201).json({ success: true, treatment: newTreatment });
  });

  app.put('/api/admin/treatments/:id', (req, res) => {
    const store = getD1Store();
    const index = (store.treatments || []).findIndex((t: any) => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Treatment record not found' });
    store.treatments[index] = { ...store.treatments[index], ...req.body };
    saveD1Store({ treatments: store.treatments });
    res.json({ success: true, treatment: store.treatments[index] });
  });

  app.delete('/api/admin/treatments/:id', (req, res) => {
    const store = getD1Store();
    store.treatments = (store.treatments || []).filter((t: any) => t.id !== req.params.id);
    saveD1Store({ treatments: store.treatments });
    res.json({ success: true, message: 'Treatment record deleted from D1' });
  });

  // GET / POST / PUT / DELETE /api/admin/blogs
  app.get('/api/admin/blogs', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, blogs: store.blogs });
  });

  app.put('/api/admin/blogs', (req, res) => {
    try {
      const store = getD1Store();
      const list = Array.isArray(req.body) ? req.body : (req.body.blogs || req.body.blogPosts || []);
      store.blogs = list;
      saveD1Store({ blogs: store.blogs });
      res.json({ success: true, message: 'Blogs updated in D1', blogs: store.blogs });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update blogs', details: err.message });
    }
  });

  app.post('/api/admin/blogs', (req, res) => {
    const store = getD1Store();
    const newBlog = { id: `blog-${Date.now()}`, publishedAt: new Date().toISOString().split('T')[0], ...req.body };
    store.blogs = [newBlog, ...(store.blogs || [])];
    saveD1Store({ blogs: store.blogs });
    res.status(201).json({ success: true, blog: newBlog });
  });

  app.put('/api/admin/blogs/:id', (req, res) => {
    const store = getD1Store();
    const index = (store.blogs || []).findIndex((b: any) => b.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Blog record not found' });
    store.blogs[index] = { ...store.blogs[index], ...req.body };
    saveD1Store({ blogs: store.blogs });
    res.json({ success: true, blog: store.blogs[index] });
  });

  app.delete('/api/admin/blogs/:id', (req, res) => {
    const store = getD1Store();
    store.blogs = (store.blogs || []).filter((b: any) => b.id !== req.params.id);
    saveD1Store({ blogs: store.blogs });
    res.json({ success: true, message: 'Blog record deleted from D1' });
  });

  // GET / POST / PUT / DELETE /api/admin/locations
  app.get('/api/admin/locations', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, locations: store.locations });
  });

  app.put('/api/admin/locations', (req, res) => {
    try {
      const store = getD1Store();
      const list = Array.isArray(req.body) ? req.body : (req.body.locations || []);
      store.locations = list;
      saveD1Store({ locations: store.locations });
      res.json({ success: true, message: 'Locations updated in D1', locations: store.locations });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update locations', details: err.message });
    }
  });

  app.post('/api/admin/locations', (req, res) => {
    const store = getD1Store();
    const newLoc = { id: `loc-${Date.now()}`, ...req.body };
    store.locations = [newLoc, ...(store.locations || [])];
    saveD1Store({ locations: store.locations });
    res.status(201).json({ success: true, location: newLoc });
  });

  app.put('/api/admin/locations/:id', (req, res) => {
    const store = getD1Store();
    const index = (store.locations || []).findIndex((l: any) => l.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Location record not found' });
    store.locations[index] = { ...store.locations[index], ...req.body };
    saveD1Store({ locations: store.locations });
    res.json({ success: true, location: store.locations[index] });
  });

  app.delete('/api/admin/locations/:id', (req, res) => {
    const store = getD1Store();
    store.locations = (store.locations || []).filter((l: any) => l.id !== req.params.id);
    saveD1Store({ locations: store.locations });
    res.json({ success: true, message: 'Location deleted from D1' });
  });

  // GET / POST / PUT / DELETE /api/admin/faqs
  app.get('/api/admin/faqs', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, faqs: store.faqs });
  });

  app.put('/api/admin/faqs', (req, res) => {
    try {
      const store = getD1Store();
      const list = Array.isArray(req.body) ? req.body : (req.body.faqs || []);
      store.faqs = list;
      saveD1Store({ faqs: store.faqs });
      res.json({ success: true, message: 'FAQs updated in D1', faqs: store.faqs });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update FAQs', details: err.message });
    }
  });

  app.post('/api/admin/faqs', (req, res) => {
    const store = getD1Store();
    const newFaq = { id: `faq-${Date.now()}`, ...req.body };
    store.faqs = [newFaq, ...(store.faqs || [])];
    saveD1Store({ faqs: store.faqs });
    res.status(201).json({ success: true, faq: newFaq });
  });

  app.put('/api/admin/faqs/:id', (req, res) => {
    const store = getD1Store();
    const index = (store.faqs || []).findIndex((f: any) => f.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'FAQ not found' });
    store.faqs[index] = { ...store.faqs[index], ...req.body };
    saveD1Store({ faqs: store.faqs });
    res.json({ success: true, faq: store.faqs[index] });
  });

  app.delete('/api/admin/faqs/:id', (req, res) => {
    const store = getD1Store();
    store.faqs = (store.faqs || []).filter((f: any) => f.id !== req.params.id);
    saveD1Store({ faqs: store.faqs });
    res.json({ success: true, message: 'FAQ deleted' });
  });

  // GET / PUT / POST / DELETE /api/admin/testimonials
  app.get('/api/admin/testimonials', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, testimonials: store.testimonials });
  });

  app.put('/api/admin/testimonials', (req, res) => {
    const store = getD1Store();
    const list = Array.isArray(req.body) ? req.body : (req.body.testimonials || []);
    store.testimonials = list;
    saveD1Store({ testimonials: store.testimonials });
    res.json({ success: true, testimonials: store.testimonials });
  });

  // Body Explorer Admin
  app.put('/api/admin/body-explorer', (req, res) => {
    const store = getD1Store();
    const list = Array.isArray(req.body) ? req.body : (req.body.bodyExplorerRegions || []);
    store.body_explorer = list;
    saveD1Store({ body_explorer: store.body_explorer });
    res.json({ success: true, bodyExplorerRegions: store.body_explorer });
  });

  // GET / PUT /api/admin/site-settings
  app.get('/api/admin/site-settings', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, siteSettings: store.site_settings });
  });

  app.put('/api/admin/site-settings', (req, res) => {
    const store = getD1Store();
    const updatedSettings = { ...store.site_settings, ...req.body };
    saveD1Store({ site_settings: updatedSettings });
    res.json({ success: true, siteSettings: updatedSettings });
  });

  // GET / PUT /api/admin/navigation
  app.get('/api/admin/navigation', (req, res) => {
    const store = getD1Store();
    const navigation = (store.navigation || []).map(normalizeNavigationItem).sort((a,b) => a.order - b.order);
    res.json({ success: true, navigation });
  });

  app.put('/api/admin/navigation', (req, res) => {
    const store = getD1Store();
    saveD1Store({ navigation: req.body.navigation });
    res.json({ success: true, navigation: req.body.navigation });
  });

  // GET / PUT /api/admin/footer
  app.get('/api/admin/footer', (req, res) => {
    const store = getD1Store();
    const footer = normalizeFooterRow(store.footer);
    res.json({ success: true, footer });
  });

  app.put('/api/admin/footer', (req, res) => {
    const store = getD1Store();
    const updatedFooter = { ...store.footer, ...req.body };
    saveD1Store({ footer: updatedFooter });
    res.json({ success: true, footer: updatedFooter });
  });

  // GET /api/admin/enquiries
  app.get('/api/admin/enquiries', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, enquiries: store.enquiries || [] });
  });

  app.put('/api/admin/enquiries/:id', (req, res) => {
    const store = getD1Store();
    const index = (store.enquiries || []).findIndex((e: any) => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Enquiry not found' });
    store.enquiries[index] = { ...store.enquiries[index], ...req.body };
    saveD1Store({ enquiries: store.enquiries });
    res.json({ success: true, enquiry: store.enquiries[index] });
  });

  app.delete('/api/admin/enquiries/:id', (req, res) => {
    const store = getD1Store();
    store.enquiries = (store.enquiries || []).filter((e: any) => e.id !== req.params.id);
    saveD1Store({ enquiries: store.enquiries });
    res.json({ success: true, message: 'Enquiry deleted' });
  });

  // GET /api/admin/second-opinions
  app.get('/api/admin/second-opinions', (req, res) => {
    const store = getD1Store();
    const requests = store.second_opinion_requests || [];
    const files = store.second_opinion_files || [];

    // Attach corresponding file records to each request
    const enriched = requests.map((r: any) => ({
      ...r,
      files: files.filter((f: any) => f.request_id === r.id)
    }));

    res.json({ success: true, requests: enriched });
  });

  app.put('/api/admin/second-opinions/:id', (req, res) => {
    const store = getD1Store();
    if (!store.second_opinion_requests) store.second_opinion_requests = [];
    const index = store.second_opinion_requests.findIndex((r: any) => r.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Second opinion request not found' });

    if (req.body.status) {
      const statusNorm = String(req.body.status).toLowerCase().trim();
      if (['new', 'pending', 'pending review', 'pending_review', 'under_review'].includes(statusNorm)) {
        req.body.status = 'new';
      } else if (['contacted'].includes(statusNorm)) {
        req.body.status = 'contacted';
      } else if (['reviewed', 'report_ready', 'completed'].includes(statusNorm)) {
        req.body.status = 'reviewed';
      } else {
        return res.status(400).json({ error: 'Invalid second opinion status' });
      }
    }

    store.second_opinion_requests[index] = { ...store.second_opinion_requests[index], ...req.body };
    saveD1Store({ second_opinion_requests: store.second_opinion_requests });
    res.json({ success: true, request: store.second_opinion_requests[index] });
  });

  app.delete('/api/admin/second-opinions/:id', (req, res) => {
    const store = getD1Store();
    store.second_opinion_requests = (store.second_opinion_requests || []).filter((r: any) => r.id !== req.params.id);
    saveD1Store({ second_opinion_requests: store.second_opinion_requests });
    res.json({ success: true, message: 'Second opinion request deleted' });
  });

  // GET /api/admin/second-opinions/:id/download-report/:fileId - Secure download of private patient report
  app.get('/api/admin/second-opinions/:id/download-report/:fileId', (req, res) => {
    const store = getD1Store();
    const file = (store.second_opinion_files || []).find((f: any) => f.id === req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'Confidential file record not found in D1' });
    }

    if (file.local_path && fs.existsSync(file.local_path)) {
      return res.download(file.local_path, file.original_filename);
    }

    // Try finding in private reports dir
    const cleanReqId = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = path.join(privateReportsDir, cleanReqId);
    if (fs.existsSync(folder)) {
      const matchingFile = fs.readdirSync(folder).find((fname) => fname.includes(file.original_filename) || fname === path.basename(file.storage_key));
      if (matchingFile) {
        return res.download(path.join(folder, matchingFile), file.original_filename);
      }
    }

    res.status(404).json({ error: 'Report file object not found in private storage' });
  });

  // -------------------------------------------------------------
  // MEDIA SLOTS ADMIN API ROUTES
  // -------------------------------------------------------------

  // GET /api/admin/media-slots
  app.get('/api/admin/media-slots', (req, res) => {
    const store = getD1Store();
    res.json({ success: true, mediaSlots: store.media_slots || {} });
  });

  // PUT /api/admin/media-slots/:slotKey - Save Draft
  app.put('/api/admin/media-slots/:slotKey', (req, res) => {
    try {
      const { slotKey } = req.params;
      const { draftValue, altText, focalPoint, mobileValue, slotName, section } = req.body;
      const slot = saveMediaSlotDraftInD1(slotKey, draftValue, { altText, focalPoint, mobileValue, slotName, section });
      res.json({ success: true, message: `Draft saved for slot ${slotKey}`, slot });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save media slot draft', details: err.message });
    }
  });

  // POST /api/admin/media-slots/:slotKey/publish - Publish Single Slot
  app.post('/api/admin/media-slots/:slotKey/publish', (req, res) => {
    try {
      const { slotKey } = req.params;
      const slot = publishMediaSlotInD1(slotKey);
      if (!slot) return res.status(404).json({ error: 'Slot not found' });
      res.json({ success: true, message: `Slot ${slotKey} published to live website`, slot });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to publish media slot', details: err.message });
    }
  });

  // POST /api/admin/media-slots/publish-all - Publish All Draft Slots
  app.post('/api/admin/media-slots/publish-all', (req, res) => {
    try {
      const published = publishAllMediaSlotsInD1();
      res.json({ success: true, message: 'All draft media slots published to live website', count: published.length, published });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to publish all media slots', details: err.message });
    }
  });

  // -------------------------------------------------------------
  // MEDIA ASSET MANAGEMENT API ROUTES (R2 & D1)
  // -------------------------------------------------------------

  // GET /api/admin/media - Query media assets
  app.get('/api/admin/media', (req, res) => {
    const store = getD1Store();
    let media = store.media || [];
    const { category, q } = req.query;

    if (category && category !== 'all') {
      media = media.filter((m: any) => (m.category || '').toLowerCase() === (category as string).toLowerCase());
    }

    if (q) {
      const term = (q as string).toLowerCase();
      media = media.filter(
        (m: any) =>
          (m.original_name || '').toLowerCase().includes(term) ||
          (m.alt_text || '').toLowerCase().includes(term) ||
          (m.storage_key || '').toLowerCase().includes(term)
      );
    }

    res.json({ success: true, count: media.length, media });
  });

  // GET /api/admin/media/usage/:id - Check where a media asset is used
  app.get('/api/admin/media/usage/:id', (req, res) => {
    const { id } = req.params;
    const store = getD1Store();
    const mediaItem = (store.media || []).find((m: any) => m.id === id);
    if (!mediaItem) return res.status(404).json({ error: 'Media not found' });

    const usages = getMediaUsagesInD1(mediaItem.id).concat(getMediaUsagesInD1(mediaItem.storage_key));
    const uniqueUsages = Array.from(new Set(usages));

    res.json({
      success: true,
      mediaId: id,
      storageKey: mediaItem.storage_key,
      usageCount: uniqueUsages.length,
      usages: uniqueUsages
    });
  });

  // POST /api/admin/media/upload - Direct PC Upload to Public R2 Simulation & D1
  app.post('/api/admin/media/upload', publicUpload.single('file') as any, (req: any, res: any) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const category = (req.body.category as string) || 'Doctor Photos';
      const subfolder = (req.body.subfolder as string) || '';
      const altText = (req.body.alt_text as string) || '';
      const isDecorative = req.body.is_decorative === 'true';
      const width = req.body.width ? Number(req.body.width) : 1200;
      const height = req.body.height ? Number(req.body.height) : 800;

      let focalPoint: any = { x: 50, y: 50 };
      if (req.body.focal_point) {
        try {
          focalPoint = typeof req.body.focal_point === 'string' ? JSON.parse(req.body.focal_point) : req.body.focal_point;
        } catch {
          focalPoint = req.body.focal_point;
        }
      }

      const ext = path.extname(file.originalname).toLowerCase().replace('.', '') || 'webp';
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      const cleanCat = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const cleanSub = subfolder ? `${subfolder.toLowerCase().replace(/[^a-z0-9]/g, '-')}/` : '';
      const storageKey = `website/${cleanCat}/${cleanSub}${timestamp}-${random}.${ext}`;

      // Relative public URL
      const relativeSubpath = path.relative(uploadsDir, file.path).replace(/\\/g, '/');
      const publicUrl = `/uploads/${relativeSubpath}`;

      const store = getD1Store();
      const mediaRecord = {
        id: `med-${Date.now()}-${random}`,
        storage_key: storageKey,
        original_name: file.originalname,
        mime_type: file.mimetype || 'image/webp',
        file_size: file.size,
        width,
        height,
        alt_text: altText || `${file.originalname.replace(/\.[^/.]+$/, '')} - Dr. Bhushan Parmar`,
        category,
        public_url: publicUrl,
        focal_point: focalPoint,
        is_decorative: isDecorative,
        uploaded_by: 'admin@drbhushanparmar.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      store.media = [mediaRecord, ...(store.media || [])];
      saveD1Store({ media: store.media });

      res.status(201).json({
        success: true,
        message: 'File uploaded directly to Cloudflare R2 & recorded in D1',
        media: mediaRecord
      });
    } catch (err: any) {
      console.error('Error during media upload:', err);
      res.status(500).json({ error: err.message || 'Failed to upload media file' });
    }
  });

  // POST /api/admin/media/complete
  app.post('/api/admin/media/complete', (req, res) => {
    try {
      const { storageKey, originalName, mimeType, fileSize, width, height, altText, category } = req.body;
      const store = getD1Store();
      const random = Math.random().toString(36).substring(2, 8);
      const mediaRecord = {
        id: `med-${Date.now()}-${random}`,
        storage_key: storageKey,
        original_name: originalName || 'uploaded-image.webp',
        mime_type: mimeType || 'image/webp',
        file_size: fileSize || 100000,
        width: width || 1200,
        height: height || 800,
        alt_text: altText || 'Dr. Bhushan Parmar Medical Oncology',
        category: category || 'General',
        public_url: `https://media.drbhushanparmar.com/${storageKey}`,
        uploaded_by: 'admin@drbhushanparmar.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.media = [mediaRecord, ...(store.media || [])];
      saveD1Store({ media: store.media });
      res.status(201).json({ success: true, mediaId: mediaRecord.id, media: mediaRecord });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to complete media record in D1', details: err.message });
    }
  });

  // PUT /api/admin/media/:id
  app.put('/api/admin/media/:id', (req, res) => {
    const { id } = req.params;
    const store = getD1Store();
    const item = (store.media || []).find((m: any) => m.id === id);
    if (!item) return res.status(404).json({ error: 'Media not found' });

    if (req.body.alt_text !== undefined) item.alt_text = req.body.alt_text;
    if (req.body.category !== undefined) item.category = req.body.category;
    if (req.body.focal_point !== undefined) item.focal_point = req.body.focal_point;
    if (req.body.is_decorative !== undefined) item.is_decorative = req.body.is_decorative;
    item.updated_at = new Date().toISOString();

    saveD1Store({ media: store.media });
    res.json({ success: true, media: item });
  });

  // DELETE /api/admin/media/:id - Safe Delete with usage protection
  app.delete('/api/admin/media/:id', (req, res) => {
    const { id } = req.params;
    const store = getD1Store();
    const mediaItem = (store.media || []).find((m: any) => m.id === id);
    if (!mediaItem) return res.status(404).json({ error: 'Media item not found' });

    const usages = getMediaUsagesInD1(mediaItem.id).concat(getMediaUsagesInD1(mediaItem.storage_key));
    const uniqueUsages = Array.from(new Set(usages));

    if (uniqueUsages.length > 0 && req.query.force !== 'true') {
      return res.status(400).json({
        error: 'Cannot delete media item because it is still in use across the website.',
        usageCount: uniqueUsages.length,
        usages: uniqueUsages
      });
    }

    store.media = (store.media || []).filter((m: any) => m.id !== id);
    saveD1Store({ media: store.media });
    res.json({ success: true, message: 'Media record removed from R2 / D1', deletedId: id });
  });

  // -------------------------------------------------------------
  // EMAIL NOTIFICATION STATUS & LOGS ADMIN ROUTES (PHASE 3B)
  // -------------------------------------------------------------

  // GET /api/admin/email-status
  app.get('/api/admin/email-status', (req, res) => {
    res.json({
      enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
      provider: 'resend',
      apiKeyConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()),
      fromAddressConfigured: Boolean(process.env.NOTIFICATION_FROM_EMAIL && process.env.NOTIFICATION_FROM_EMAIL.trim()),
      adminUrlConfigured: Boolean(process.env.ADMIN_APP_URL && process.env.ADMIN_APP_URL.trim())
    });
  });

  // GET /api/admin/turnstile-status
  app.get('/api/admin/turnstile-status', requireRole(['super_admin', 'content_manager', 'enquiry_manager']), (req, res) => {
    res.json({
      enabled: process.env.TURNSTILE_ENABLED === 'true',
      secretConfigured: Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SECRET_KEY.trim()),
      hostnameConfigured: Boolean(process.env.TURNSTILE_ALLOWED_HOSTNAMES && process.env.TURNSTILE_ALLOWED_HOSTNAMES.trim())
    });
  });

  // GET /api/admin/notification-logs
  app.get('/api/admin/notification-logs', requireRole(['super_admin', 'enquiry_manager']), (req, res) => {
    const store = getD1Store();
    const logs = store.notification_delivery_logs || [];
    res.json({ success: true, logs });
  });

  // POST /api/admin/email-test
  app.post('/api/admin/email-test', requireRole(['super_admin']), async (req, res) => {
    try {
      const { formKey } = req.body || {};
      if (!['appointmentForm', 'contactForm', 'secondOpinionForm'].includes(formKey)) {
        return res.status(400).json({ error: 'Invalid formKey specified' });
      }

      const store = getD1Store();
      const config = store.site_settings?.formBuilderConfig;
      const recipient = config?.[formKey]?.notificationEmail?.trim();

      if (!recipient || !isValidEmailAddress(recipient)) {
        return res.status(400).json({ error: 'No valid notification email configured for this form in CMS settings' });
      }

      const resendApiKey = process.env.RESEND_API_KEY?.trim();
      const fromAddress = process.env.NOTIFICATION_FROM_EMAIL?.trim();

      if (!resendApiKey) {
        return res.status(400).json({ error: 'RESEND_API_KEY is not configured on the server' });
      }
      if (!fromAddress) {
        return res.status(400).json({ error: 'NOTIFICATION_FROM_EMAIL is not configured on the server' });
      }
      if (!isValidEmailAddress(fromAddress)) {
        return res.status(400).json({ error: 'Invalid NOTIFICATION_FROM_EMAIL format on the server' });
      }

      const testEntityId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const testEventType = formKey === 'appointmentForm' ? 'appointment' : formKey === 'secondOpinionForm' ? 'second_opinion' : 'contact';
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      const adminUrl = process.env.ADMIN_APP_URL?.trim() || '';

      const subject = 'Dr. Bhushan Website — Email notification test';
      const textBody = `Email notification delivery is configured successfully.\n\nTest ID: ${testEntityId}\nTimestamp: ${timestamp}\nForm: ${formKey}\nRecipient: ${recipient}\n\nSign in to the secure admin panel to manage settings.`;
      const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="display: inline-block; padding: 4px 12px; background: #f0fdfa; border: 1px solid #ccfbf1; color: #0f766e; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
      Configuration Test
    </div>
    <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Email notification delivery is configured successfully.</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
      This is a test notification verifying transactional email delivery from your website to the configured staff inbox.
    </p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
      <div style="margin-bottom: 6px;"><strong style="color: #0f172a;">Form Target:</strong> <code style="font-family: monospace; color: #0f766e;">${escapeHtml(formKey)}</code></div>
      <div style="margin-bottom: 6px;"><strong style="color: #0f172a;">Recipient:</strong> ${escapeHtml(recipient)}</div>
      <div><strong style="color: #0f172a;">Timestamp:</strong> ${escapeHtml(timestamp)}</div>
    </div>
    ${adminUrl ? `
    <div style="text-align: left; margin-top: 24px;">
      <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #073F3D; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 10px;">
        Open Admin Panel &rarr;
      </a>
    </div>` : ''}
  </div>
</body>
</html>`;

      const idempotencyKey = `website-notification-test/${testEntityId}`;
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          from: `Dr. Bhushan Website <${fromAddress}>`,
          to: [recipient],
          subject,
          text: textBody,
          html: htmlBody
        })
      });

      if (!resendRes.ok) {
        const errorJson = (await resendRes.json().catch(() => ({}))) as any;
        const statusCode = resendRes.status;
        const errorMsg = errorJson?.message || errorJson?.error || `HTTP ${statusCode}`;
        writeNotificationLogDev({
          eventType: `test_${testEventType}`,
          entityId: testEntityId,
          recipient,
          status: 'failed',
          errorCode: String(statusCode),
          errorMessage: String(errorMsg)
        });
        return res.status(400).json({ success: false, error: `Resend delivery failed: ${errorMsg}` });
      }

      const resJson = (await resendRes.json().catch(() => ({}))) as any;
      const providerMessageId = resJson?.id;

      writeNotificationLogDev({
        eventType: `test_${testEventType}`,
        entityId: testEntityId,
        recipient,
        status: 'sent',
        providerMessageId
      });

      res.json({ success: true, message: 'Test notification sent successfully', providerMessageId });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to process email test', details: err.message });
    }
  });

  // -------------------------------------------------------------
  // VITE MIDDLEWARE (DEV) & STATIC SERVING (PROD)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cloudflare Worker & R2 / D1 Fullstack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
