/**
 * Cloudflare Worker API Layer for Dr. Bhushan Parmar Medical Oncology Website
 * Single source of truth for all structured data (D1) and media (R2).
 */

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  all<T = any>(): Promise<{ results: T[]; success: boolean }>;
  first<T = any>(): Promise<T | null>;
  run(): Promise<{ success: boolean; meta: any }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

export interface R2Object {
  writeHttpMetadata(headers: Headers): void;
  httpEtag?: string;
  size: number;
  body: ReadableStream;
}

export interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(key: string, value: any, options?: any): Promise<any>;
  delete(keys: string | string[]): Promise<void>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  DB: D1Database;
  PUBLIC_MEDIA: R2Bucket;
  PRIVATE_REPORTS: R2Bucket;
  PUBLIC_MEDIA_URL?: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGIN?: string;
  ALLOWED_ORIGINS?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_ENABLED?: string;
  TURNSTILE_ALLOWED_HOSTNAMES?: string;
  RESEND_API_KEY?: string;
  NOTIFICATION_FROM_EMAIL?: string;
  EMAIL_NOTIFICATIONS_ENABLED?: string;
  ADMIN_APP_URL?: string;
}

const PASSWORD_PBKDF2_ITERATIONS = 100000;

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuidV4(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function emailNotificationsEnabled(env: Env): boolean {
  return env.EMAIL_NOTIFICATIONS_ENABLED === 'true';
}

function turnstileEnabled(env: Env): boolean {
  return env.TURNSTILE_ENABLED === 'true';
}

type TurnstileValidationResult = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  'error-codes'?: string[];
};

async function verifyTurnstile(
  env: Env,
  token: unknown,
  remoteIp: string,
  expectedAction: string
): Promise<boolean> {
  if (!turnstileEnabled(env)) {
    return true;
  }
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SECRET_KEY.trim()) {
    return false;
  }
  if (typeof token !== 'string') {
    return false;
  }
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.length > 2048) {
    return false;
  }

  const isTestSecret = env.TURNSTILE_SECRET_KEY.startsWith('1x0000000000000000000000000000000AA');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY.trim(),
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

    const result = (await resp.json().catch(() => ({}))) as TurnstileValidationResult;
    if (!result.success) {
      return false;
    }

    if (result.action !== expectedAction) {
      return false;
    }

    if (!isTestSecret) {
      const rawHostnames = env.TURNSTILE_ALLOWED_HOSTNAMES?.trim() || '';
      if (!rawHostnames) {
        return false;
      }

      const allowedHostnames = rawHostnames
        .split(',')
        .map(h => h.trim().toLowerCase())
        .filter(Boolean);

      if (allowedHostnames.length === 0) {
        return false;
      }

      const resultHostname = (result.hostname || '').trim().toLowerCase();
      if (!resultHostname || !allowedHostnames.includes(resultHostname)) {
        return false;
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

async function getFormNotificationEmail(
  env: Env,
  formKey: 'appointmentForm' | 'contactForm' | 'secondOpinionForm'
): Promise<string> {
  const row = await env.DB.prepare(
    'SELECT value FROM site_settings WHERE key = ?'
  )
    .bind('formBuilderConfig')
    .first<any>();

  if (!row?.value) return '';

  let config: any = {};
  try {
    config = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
  } catch {
    return '';
  }

  const email = config?.[formKey]?.notificationEmail;
  if (typeof email !== 'string') return '';
  const normalized = email.trim();
  if (!isValidEmailAddress(normalized)) return '';
  return normalized;
}

async function writeNotificationLog(
  env: Env,
  data: {
    eventType: string;
    entityId: string;
    recipient?: string;
    status: 'sent' | 'failed' | 'skipped';
    providerMessageId?: string;
    errorCode?: string;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    const logId = crypto.randomUUID();
    const cleanErrorMsg = data.errorMessage ? String(data.errorMessage).substring(0, 500) : null;
    await env.DB.prepare(
      `INSERT INTO notification_delivery_logs (id, channel, provider, event_type, entity_id, recipient, status, provider_message_id, error_code, error_message, created_at, updated_at)
       VALUES (?, 'email', 'resend', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
      .bind(
        logId,
        data.eventType,
        data.entityId,
        data.recipient || null,
        data.status,
        data.providerMessageId || null,
        data.errorCode || null,
        cleanErrorMsg
      )
      .run();
  } catch (logErr) {
    console.warn('Failed to record notification delivery log:', logErr);
  }
}

async function sendStaffNotification(
  env: Env,
  options: {
    formKey: 'appointmentForm' | 'contactForm' | 'secondOpinionForm';
    eventType: 'appointment' | 'contact' | 'second_opinion';
    entityId: string;
    receivedAt?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Check if email notifications are enabled
    if (!emailNotificationsEnabled(env)) {
      await writeNotificationLog(env, {
        eventType: options.eventType,
        entityId: options.entityId,
        status: 'skipped',
        errorMessage: 'Email notifications disabled (EMAIL_NOTIFICATIONS_ENABLED !== true)'
      });
      return { success: false, error: 'Email notifications disabled' };
    }

    // 2. Read staff recipient from CMS
    const recipient = await getFormNotificationEmail(env, options.formKey);
    if (!recipient) {
      await writeNotificationLog(env, {
        eventType: options.eventType,
        entityId: options.entityId,
        status: 'skipped',
        errorMessage: `No valid notificationEmail configured for form ${options.formKey}`
      });
      return { success: false, error: 'No recipient email configured' };
    }

    // 3. Validate credentials
    if (!env.RESEND_API_KEY || !env.RESEND_API_KEY.trim()) {
      await writeNotificationLog(env, {
        eventType: options.eventType,
        entityId: options.entityId,
        recipient,
        status: 'skipped',
        errorMessage: 'Missing RESEND_API_KEY environment variable'
      });
      return { success: false, error: 'Resend API key not configured' };
    }

    if (!env.NOTIFICATION_FROM_EMAIL || !env.NOTIFICATION_FROM_EMAIL.trim()) {
      await writeNotificationLog(env, {
        eventType: options.eventType,
        entityId: options.entityId,
        recipient,
        status: 'skipped',
        errorMessage: 'Missing NOTIFICATION_FROM_EMAIL environment variable'
      });
      return { success: false, error: 'Notification sender email not configured' };
    }

    const fromAddress = env.NOTIFICATION_FROM_EMAIL.trim();
    if (!isValidEmailAddress(fromAddress)) {
      await writeNotificationLog(env, {
        eventType: options.eventType,
        entityId: options.entityId,
        recipient,
        status: 'failed',
        errorCode: 'INVALID_FROM_ADDRESS',
        errorMessage: 'Invalid NOTIFICATION_FROM_EMAIL address format'
      });
      return { success: false, error: 'Invalid sender email format' };
    }

    // 4. Build privacy-safe minimal message (STRICT: NO PATIENT DATA)
    const timestamp = options.receivedAt || new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const safeEntityId = escapeHtml(options.entityId);
    const adminUrl = env.ADMIN_APP_URL ? env.ADMIN_APP_URL.trim() : '';

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
    if (extraNotice) {
      textLines.push('', extraNotice);
    }
    if (adminUrl) {
      textLines.push('', 'Sign in to the secure admin panel to review the submission:', adminUrl);
    } else {
      textLines.push('', 'Sign in to the secure admin panel to review the submission.');
    }
    const textBody = textLines.join('\n');

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="display: inline-block; padding: 4px 12px; background: #f0fdfa; border: 1px solid #ccfbf1; color: #0f766e; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
      Staff Notification
    </div>
    <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">${escapeHtml(subject)}</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
      A new ${escapeHtml(categoryTitle.toLowerCase())} has been received through the website.
    </p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
      <div style="margin-bottom: 6px;"><strong style="color: #0f172a;">Request ID:</strong> <code style="font-family: monospace; color: #0f766e;">${safeEntityId}</code></div>
      <div><strong style="color: #0f172a;">Received:</strong> ${escapeHtml(timestamp)}</div>
    </div>
    ${extraNotice ? `<p style="font-size: 12px; color: #64748b; margin: 0 0 20px 0; font-style: italic;">${escapeHtml(extraNotice)}</p>` : ''}
    ${adminUrl ? `
    <div style="text-align: left; margin-top: 24px;">
      <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #073F3D; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 10px;">
        Open Admin Panel &rarr;
      </a>
    </div>` : '<p style="font-size: 12px; color: #64748b; margin-top: 20px;">Sign in to the secure admin panel to review the submission.</p>'}
  </div>
</body>
</html>`;

    // 5. Call Resend API via fetch with deterministic Idempotency-Key
    const idempotencyKey = `website-notification/${options.eventType}/${options.entityId}`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY.trim()}`,
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
      const errorJson = await resendRes.json().catch(() => ({}));
      const statusCode = resendRes.status;
      const errorMsg = (errorJson as any)?.message || (errorJson as any)?.error || `HTTP ${statusCode}`;
      await writeNotificationLog(env, {
        eventType: options.eventType,
        entityId: options.entityId,
        recipient,
        status: 'failed',
        errorCode: String(statusCode),
        errorMessage: String(errorMsg)
      });
      return { success: false, error: String(errorMsg) };
    }

    const resJson = await resendRes.json().catch(() => ({})) as any;
    const providerMessageId = resJson?.id || undefined;

    await writeNotificationLog(env, {
      eventType: options.eventType,
      entityId: options.entityId,
      recipient,
      status: 'sent',
      providerMessageId
    });

    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || 'Unexpected network error during email notification';
    await writeNotificationLog(env, {
      eventType: options.eventType,
      entityId: options.entityId,
      status: 'failed',
      errorCode: 'EXCEPTION',
      errorMessage: String(errorMsg)
    });
    return { success: false, error: String(errorMsg) };
  }
}

async function hashPasswordPBKDF2(password: string, salt: string, iterations = PASSWORD_PBKDF2_ITERATIONS): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPasswordPBKDF2(password: string, salt: string, storedHash: string): Promise<boolean> {
  const computedHash = await hashPasswordPBKDF2(password, salt);
  if (computedHash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHash.length; i++) {
    diff |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashSessionToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

const COOKIE_NAME = 'dr_bhushan_admin_session';

function getSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  const fromCookie = parseCookie(cookieHeader, COOKIE_NAME);
  if (fromCookie) return fromCookie;

  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'content_manager' | 'enquiry_manager';
  status: 'active' | 'disabled';
  lastLogin?: string;
}

async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;

  try {
    const tokenHash = await hashSessionToken(token);
    const nowIso = new Date().toISOString();

    const row = await env.DB.prepare(
      `SELECT s.id as session_id, s.expires_at, u.id, u.email, u.name, u.role, u.status, u.last_login
       FROM admin_sessions s
       JOIN admin_users u ON s.user_id = u.id
       WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'
       LIMIT 1`
    )
      .bind(tokenHash, nowIso)
      .first<any>();

    if (!row) return null;

    env.DB.prepare('UPDATE admin_sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(row.session_id)
      .run()
      .catch(() => {});

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status,
      lastLogin: row.last_login
    };
  } catch {
    return null;
  }
}

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, maxHits = 30, windowMs = 600000): boolean {
  const now = Date.now();
  const record = rateLimits.get(ip);
  if (!record || record.resetAt < now) {
    rateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (record.count >= maxHits) {
    return true;
  }
  record.count++;
  return false;
}

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
    doctorDescription: row.about_text || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    address: row.address || '',
    copyright: row.copyright_text || '',
    medicalDisclaimer: row.medical_disclaimer || '',
    privacyPolicyLink: row.privacy_policy_link || '',
    socialLinks: safeJsonParse(row.social_links, {}),
    footerCta: safeJsonParse(row.footer_cta, {})
  };
}

function normalizeMediaSlot(row: any) {
  if (!row) return null;
  return {
    slotKey: row.slot_key ?? row.slotKey,
    slotName: row.slot_name ?? row.slotName,
    section: row.section,
    publishedValue: row.published_value ?? row.publishedValue ?? '',
    draftValue: row.draft_value ?? row.draftValue ?? '',
    status: row.status || 'published',
    altText: row.alt_text ?? row.altText ?? '',
    focalPoint: row.focal_point ?? row.focalPoint ?? null,
    mobileValue: row.mobile_value ?? row.mobileValue ?? '',
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString()
  };
}

function parsePublicMediaKey(pathname: string): string | null {
  const prefix = '/api/public/media/';
  if (!pathname.startsWith(prefix)) return null;

  const raw = pathname.slice(prefix.length);
  if (!raw) return null;

  try {
    const segments = raw
      .split('/')
      .map(segment => decodeURIComponent(segment));

    if (
      segments.some(segment =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        segment.includes('\\') ||
        /[\u0000-\u001F\u007F]/.test(segment)
      )
    ) {
      return null;
    }

    return segments.join('/');
  } catch {
    return null;
  }
}

const ALLOWED_MEDIA_CATEGORIES = [
  'Branding',
  'Doctor Photos',
  'Homepage',
  'Patient Care',
  'Cancer Care',
  'Treatments',
  'Body Explorer',
  'Second Opinion',
  'Blogs / Resources',
  'Locations',
  'SEO / Social'
];

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif'
};

function isValidImageSignature(mimeType: string, buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 12) return false;
  const bytes = new Uint8Array(buffer);

  // JPEG: FF D8 FF
  if (mimeType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === 'image/png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  // WEBP: bytes 0-3 = RIFF, bytes 8-11 = WEBP
  if (mimeType === 'image/webp') {
    const isRiff =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46; // RIFF
    const isWebp =
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50; // WEBP
    return isRiff && isWebp;
  }

  // AVIF: ISO BMFF header containing 'ftyp' and compatible brand 'avif' or 'avis' within the initial header bytes
  if (mimeType === 'image/avif') {
    const maxLen = Math.min(bytes.length, 64);
    let str = '';
    for (let i = 0; i < maxLen; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    const hasFtyp = str.includes('ftyp');
    const hasAvifBrand = str.includes('avif') || str.includes('avis');
    return hasFtyp && hasAvifBrand;
  }

  return false;
}

function parseMediaDimension(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0 || num > 20000) {
    return null;
  }
  return num;
}

function buildPublicMediaUrl(storageKey: string, env: Env, workerOrigin: string): string {
  const cleanKey = storageKey.replace(/^\/+/, '');
  const encodedKey = cleanKey
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  const customOverride = env.PUBLIC_MEDIA_URL?.trim();
  if (customOverride) {
    return `${customOverride.replace(/\/$/, '')}/${encodedKey}`;
  }
  return `${workerOrigin}/api/public/media/${encodedKey}`;
}

function resolveMediaPublicUrl(value: string | undefined | null, env: Env, workerOrigin: string): string {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.includes('media.drbhushanparmar.com')) {
    const key = trimmed.replace(/^https?:\/\/media\.drbhushanparmar\.com\/?/, '');
    return buildPublicMediaUrl(key, env, workerOrigin);
  }

  if (trimmed.startsWith('website/')) {
    return buildPublicMediaUrl(trimmed, env, workerOrigin);
  }

  return trimmed;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '127.0.0.1';

    const requestOrigin = request.headers.get('Origin') || '';
    const allowedOriginsEnv = env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || 'https://drbhushanparmar.com';
    const allowedList = allowedOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean);
    const isDev = env.ENVIRONMENT !== 'production';

    const isAllowedOrigin =
      allowedList.includes(requestOrigin) ||
      (isDev && (requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('http://127.0.0.1:')));

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    if (isAllowedOrigin) {
      corsHeaders['Access-Control-Allow-Origin'] = requestOrigin;
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const json = (data: any, status = 200, extraHeaders: Record<string, string> = {}) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...extraHeaders
        }
      });
    };

    if (
      pathname.startsWith('/api/admin/') &&
      requestOrigin &&
      !isAllowedOrigin
    ) {
      return json(
        { error: 'Origin not allowed' },
        403
      );
    }

    try {
      if (pathname === '/api/health') {
        return json({
          status: 'ok',
          service: 'Cloudflare Worker (dr-bhushan-api)',
          database: 'Cloudflare D1 (dr-bhushan-cms)',
          environment: env.ENVIRONMENT || 'production',
          timestamp: new Date().toISOString()
        });
      }

      if (pathname === '/api/test-db') {
        const result = await env.DB.prepare('SELECT COUNT(*) as media_count FROM media').first<{ media_count: number }>();
        return json({
          status: 'ok',
          connected: true,
          media_count: result?.media_count ?? 0
        });
      }

      if (pathname.startsWith('/api/public/media/')) {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return json({ error: 'Method not allowed' }, 405);
        }
        const storageKey = parsePublicMediaKey(pathname);
        if (!storageKey) {
          return json({ error: 'Invalid media key' }, 400);
        }

        const object = await env.PUBLIC_MEDIA.get(storageKey);
        if (!object) return json({ error: 'Media asset not found in R2' }, 404);

        const mediaHeaders = new Headers();
        mediaHeaders.set('Access-Control-Allow-Origin', isAllowedOrigin ? requestOrigin : '*');
        mediaHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        mediaHeaders.set('Vary', 'Origin');
        mediaHeaders.set('X-Content-Type-Options', 'nosniff');
        mediaHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

        object.writeHttpMetadata(mediaHeaders);
        if (!mediaHeaders.get('Content-Type')) {
          const ext = storageKey.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            webp: 'image/webp',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            svg: 'image/svg+xml',
            avif: 'image/avif',
            gif: 'image/gif',
            ico: 'image/x-icon',
            pdf: 'application/pdf',
            mp4: 'video/mp4'
          };
          mediaHeaders.set('Content-Type', (ext && mimeTypes[ext]) || 'application/octet-stream');
        }

        if (object.httpEtag) {
          mediaHeaders.set('etag', object.httpEtag);
          if (request.headers.get('if-none-match') === object.httpEtag) {
            return new Response(null, { status: 304, headers: mediaHeaders });
          }
        }

        mediaHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

        if (request.method === 'HEAD') {
          return new Response(null, { headers: mediaHeaders });
        }

        return new Response(object.body, { headers: mediaHeaders });
      }

      // AUTHENTICATION
      if (pathname === '/api/admin/auth/login' && request.method === 'POST') {
        if (isRateLimited(clientIp, 10, 300000)) {
          return json({ error: 'Too many login attempts. Please wait 5 minutes.' }, 429);
        }
        const body = (await request.json().catch(() => ({}))) as any;
        const { email, password, rememberMe } = body;
        if (!email || !password) return json({ error: 'Email and password are required' }, 400);

        const trimmedEmail = String(email).trim().toLowerCase();
        const user = await env.DB.prepare('SELECT * FROM admin_users WHERE LOWER(email) = ? AND status = "active" LIMIT 1')
          .bind(trimmedEmail)
          .first<any>();

        if (!user) return json({ error: 'Invalid email or password' }, 401);

        const isValid = await verifyPasswordPBKDF2(password, user.salt, user.password_hash);
        if (!isValid) return json({ error: 'Invalid email or password' }, 401);

        const rawToken = generateSessionToken();
        const tokenHash = await hashSessionToken(rawToken);
        const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const maxAgeSeconds = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
        const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();

        await env.DB.prepare(
          `INSERT INTO admin_sessions (id, user_id, token_hash, expires_at, created_at, last_used_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
          .bind(sessionId, user.id, tokenHash, expiresAt)
          .run();

        await env.DB.prepare('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run();

        const isSecure = url.protocol === 'https:' || env.ENVIRONMENT === 'production';
        const cookieVal = `${COOKIE_NAME}=${rawToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${maxAgeSeconds}`;

        return json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            lastLogin: new Date().toISOString()
          }
        }, 200, { 'Set-Cookie': cookieVal });
      }

      if (pathname === '/api/admin/auth/session' && request.method === 'GET') {
        const user = await getSessionUser(request, env);
        if (!user) return json({ error: 'Unauthorized: Session invalid or expired' }, 401);
        return json({ success: true, user });
      }

      if (pathname === '/api/admin/auth/logout' && request.method === 'POST') {
        const token = getSessionTokenFromRequest(request);
        if (token) {
          const tokenHash = await hashSessionToken(token);
          await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(tokenHash).run();
        }
        const isSecure = url.protocol === 'https:' || env.ENVIRONMENT === 'production';
        const clearCookie = `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`;
        return json({ success: true, message: 'Logged out successfully' }, 200, { 'Set-Cookie': clearCookie });
      }

      // PUBLIC SITE AGGREGATE
      if (pathname === '/api/public/site' && request.method === 'GET') {
        const isPreviewRequest = url.searchParams.get('preview') === 'draft' || url.searchParams.get('preview') === 'true';
        if (isPreviewRequest) {
          const previewUser = await getSessionUser(request, env);
          if (!previewUser) return json({ error: 'Unauthorized: Preview mode requires an active admin session.' }, 401);
        }

        const [
          settingsRes,
          doctorRes,
          sectionsRes,
          categoriesRes,
          cancerCareRes,
          treatmentsRes,
          bodyExplorerRes,
          locationsRes,
          blogsRes,
          faqsRes,
          testimonialsRes,
          slotsRes,
          navRes,
          footerRes
        ] = await Promise.all([
          env.DB.prepare('SELECT key, value FROM site_settings').all<{ key: string; value: string }>(),
          env.DB.prepare('SELECT * FROM doctor_profile LIMIT 1').first(),
          env.DB.prepare('SELECT * FROM homepage_sections WHERE is_visible = 1 ORDER BY display_order ASC').all(),
          env.DB.prepare('SELECT * FROM cancer_categories ORDER BY display_order ASC').all(),
          env.DB.prepare('SELECT * FROM cancer_care WHERE status = "published" ORDER BY display_order ASC').all(),
          env.DB.prepare('SELECT * FROM treatments WHERE status = "published" ORDER BY display_order ASC').all(),
          env.DB.prepare('SELECT * FROM body_explorer_regions WHERE is_active = 1 ORDER BY display_order ASC').all(),
          env.DB.prepare('SELECT * FROM locations WHERE is_active = 1 ORDER BY display_order ASC').all(),
          env.DB.prepare('SELECT * FROM blogs WHERE is_published = 1 ORDER BY published_at DESC LIMIT 50').all(),
          env.DB.prepare('SELECT * FROM faqs WHERE is_published = 1 ORDER BY display_order ASC').all(),
          env.DB.prepare('SELECT * FROM testimonials WHERE is_published = 1 ORDER BY date DESC').all(),
          env.DB.prepare('SELECT * FROM media_slots').all(),
          env.DB.prepare('SELECT * FROM navigation_items ORDER BY display_order ASC').all(),
          env.DB.prepare('SELECT * FROM footer_config ORDER BY updated_at DESC LIMIT 1').first()
        ]);

        const siteSettings: Record<string, any> = {};
        for (const row of settingsRes.results || []) {
          try { siteSettings[row.key] = JSON.parse(row.value); } catch { siteSettings[row.key] = row.value; }
        }

        const mediaSlots: Record<string, any> = {};

        for (const slot of slotsRes.results || []) {
          const norm = normalizeMediaSlot(slot);
          if (norm) {
            let pubVal = norm.publishedValue;
            if (pubVal) {
              if (pubVal.startsWith('med-')) {
                const mediaRow = await env.DB.prepare('SELECT storage_key, public_url FROM media WHERE id = ?').bind(pubVal).first<any>();
                if (mediaRow?.storage_key) {
                  pubVal = buildPublicMediaUrl(mediaRow.storage_key, env, url.origin);
                } else if (mediaRow?.public_url) {
                  pubVal = resolveMediaPublicUrl(mediaRow.public_url, env, url.origin);
                }
              } else {
                pubVal = resolveMediaPublicUrl(pubVal, env, url.origin);
              }
            }
            mediaSlots[norm.slotKey] = isPreviewRequest ? { ...norm, publishedValue: pubVal } : {
              slotKey: norm.slotKey,
              slotName: norm.slotName,
              section: norm.section,
              publishedValue: pubVal,
              altText: norm.altText,
              focalPoint: norm.focalPoint,
              mobileValue: norm.mobileValue
            };
          }
        }

        let doctorProfile: any = doctorRes || {};
        if (doctorProfile) {
          if (typeof doctorProfile.full_bio === 'string') try { doctorProfile.fullBio = JSON.parse(doctorProfile.full_bio); } catch {}
          if (typeof doctorProfile.qualifications === 'string') try { doctorProfile.qualifications = JSON.parse(doctorProfile.qualifications); } catch {}
          if (typeof doctorProfile.core_expertise === 'string') try { doctorProfile.coreExpertise = JSON.parse(doctorProfile.core_expertise); } catch {}
          if (typeof doctorProfile.memberships === 'string') try { doctorProfile.memberships = JSON.parse(doctorProfile.memberships); } catch {}
          ['photo_url', 'hero_photo', 'about_photo', 'profile_photo', 'second_opinion_photo', 'cta_photo', 'mobile_photo', 'signature_url'].forEach((k) => {
            if (doctorProfile[k]) doctorProfile[k] = resolveMediaPublicUrl(doctorProfile[k], env, url.origin);
          });
        }

        const heroContent = siteSettings['homepage_hero'] || siteSettings['heroContent'] || {};
        const aboutDoctorContent = siteSettings['homepage_about'] || siteSettings['aboutDoctorContent'] || {};
        const secondOpinionContent = siteSettings['homepage_second_opinion'] || siteSettings['secondOpinionContent'] || {};
        const finalCtaContent = siteSettings['homepage_final_cta'] || siteSettings['finalCtaContent'] || {};
        const heroAnimationSettings = siteSettings['homepage_animations'] || siteSettings['heroAnimationSettings'] || {};
        const globalAnimationSettings = siteSettings['homepage_global_animations'] || siteSettings['globalAnimationSettings'] || {};
        const howCanWeHelp = siteSettings['homepage_how_can_we_help'] || [];
        const treatmentJourney = siteSettings['homepage_treatment_journey'] || [];

        const normalizedHomepageSections = (sectionsRes.results || []).map(normalizeHomepageSection).sort((a, b) => a.order - b.order);
        const normalizedNavigation = (navRes.results || []).map(normalizeNavigationItem).sort((a, b) => a.order - b.order);
        const normalizedFooter = normalizeFooterRow(footerRes);

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

        return json({
          success: true,
          isPreview: isPreviewRequest,
          siteSettings: publicSiteSettings,
          doctorProfile,
          heroContent,
          aboutDoctorContent,
          secondOpinionContent,
          finalCtaContent,
          heroAnimationSettings,
          globalAnimationSettings,
          howCanWeHelp,
          treatmentJourney,
          homepageSections: normalizedHomepageSections,
          cancers: cancerCareRes.results || [],
          cancerCategories: categoriesRes.results || [],
          treatments: treatmentsRes.results || [],
          bodyExplorerRegions: bodyExplorerRes.results || [],
          locations: locationsRes.results || [],
          blogPosts: blogsRes.results || [],
          faqs: faqsRes.results || [],
          testimonials: testimonialsRes.results || [],
          navigationMenu: normalizedNavigation,
          footerConfig: normalizedFooter,
          mediaSlots
        });
      }

      // PUBLIC SUBMISSIONS
      if (pathname === '/api/public/enquiries' && request.method === 'POST') {
        if (isRateLimited(clientIp, 15, 600000)) return json({ error: 'Submission limit reached.' }, 429);
        const body = (await request.json().catch(() => ({}))) as any;

        const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
        if (honeypot) {
          return json({ success: true, message: 'Enquiry received', enquiryId: `enq-${Date.now()}` }, 201);
        }

        const rawType = typeof body.type === 'string' ? body.type.trim() : 'general';
        const allowedTypes = ['appointment', 'contact', 'general'];
        if (!allowedTypes.includes(rawType)) {
          return json({ error: 'Invalid enquiry type' }, 400);
        }

        const expectedAction = rawType === 'appointment' ? 'appointment' : 'contact';
        const turnstileOk = await verifyTurnstile(
          env,
          body.turnstileToken,
          clientIp,
          expectedAction
        );
        if (!turnstileOk) {
          return json({ error: 'Security verification failed. Please try again.' }, 403);
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
          return json({ error: 'Name is required' }, 400);
        }
        if (name.length > 120) {
          return json({ error: 'Name exceeds maximum length of 120 characters' }, 400);
        }
        if (!phone && !email) {
          return json({ error: 'At least phone or email is required' }, 400);
        }
        if (phone && phone.length > 40) {
          return json({ error: 'Phone exceeds maximum length of 40 characters' }, 400);
        }
        if (email) {
          if (email.length > 254) {
            return json({ error: 'Email exceeds maximum length of 254 characters' }, 400);
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return json({ error: 'Invalid email address format' }, 400);
          }
        }
        if (preferredDate.length > 40) return json({ error: 'Preferred date exceeds maximum length' }, 400);
        if (preferredTime.length > 100) return json({ error: 'Preferred time exceeds maximum length' }, 400);
        if (locationId.length > 100) return json({ error: 'Location ID exceeds maximum length' }, 400);
        if (cancerType.length > 200) return json({ error: 'Cancer type exceeds maximum length' }, 400);
        if (consultationType.length > 100) return json({ error: 'Consultation type exceeds maximum length' }, 400);
        if (message.length > 5000) return json({ error: 'Message exceeds maximum length' }, 400);

        const id = `enq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await env.DB.prepare(
          `INSERT INTO enquiries (id, type, name, phone, email, preferred_date, preferred_time, location_id, cancer_type, consultation_type, message, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          rawType,
          name,
          phone,
          email,
          preferredDate,
          preferredTime,
          locationId,
          cancerType,
          consultationType,
          message,
          'new'
        ).run();

        if (rawType === 'appointment') {
          ctx.waitUntil(
            sendStaffNotification(env, {
              formKey: 'appointmentForm',
              eventType: 'appointment',
              entityId: id
            })
          );
        } else {
          ctx.waitUntil(
            sendStaffNotification(env, {
              formKey: 'contactForm',
              eventType: 'contact',
              entityId: id
            })
          );
        }

        return json({ success: true, message: 'Enquiry received', enquiryId: id }, 201);
      }

      if (pathname === '/api/public/second-opinion' && request.method === 'POST') {
        if (isRateLimited(clientIp, 10, 600000)) return json({ error: 'Submission limit reached.' }, 429);
        const body = (await request.json().catch(() => ({}))) as any;

        const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
        if (honeypot) {
          return json({ success: true, message: 'Second opinion request recorded', requestId: crypto.randomUUID() }, 201);
        }

        let id: string;
        if (body.requestId !== undefined && body.requestId !== null) {
          const rawReqId = String(body.requestId).trim();
          if (!isValidUuidV4(rawReqId)) {
            return json({ error: 'Invalid request ID' }, 400);
          }
          id = rawReqId;
        } else {
          id = crypto.randomUUID();
        }

        const turnstileOk = await verifyTurnstile(
          env,
          body.turnstileToken,
          clientIp,
          'second_opinion'
        );
        if (!turnstileOk) {
          return json({ error: 'Security verification failed. Please try again.' }, 403);
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
          return json({ error: 'Patient name is required' }, 400);
        }
        if (patientName.length > 120) {
          return json({ error: 'Patient name exceeds maximum length of 120 characters' }, 400);
        }
        if (!phone && !email) {
          return json({ error: 'At least phone or email is required' }, 400);
        }
        if (phone && phone.length > 40) {
          return json({ error: 'Phone exceeds maximum length of 40 characters' }, 400);
        }
        if (email) {
          if (email.length > 254) {
            return json({ error: 'Email exceeds maximum length of 254 characters' }, 400);
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return json({ error: 'Invalid email address format' }, 400);
          }
        }
        if (city.length > 150) return json({ error: 'City exceeds maximum length of 150 characters' }, 400);
        if (country.length > 100) return json({ error: 'Country exceeds maximum length of 100 characters' }, 400);
        if (cancerType.length > 200) return json({ error: 'Cancer type exceeds maximum length of 200 characters' }, 400);
        if (stage.length > 500) return json({ error: 'Diagnosis/stage details exceed maximum length of 500 characters' }, 400);
        if (currentTreatment.length > 3000) return json({ error: 'Treatment history exceeds maximum length of 3000 characters' }, 400);
        if (specificQuestions.length > 5000) return json({ error: 'Questions/message exceeds maximum length of 5000 characters' }, 400);
        if (urgency.length > 50) return json({ error: 'Urgency exceeds maximum length of 50 characters' }, 400);

        await env.DB.prepare(
          `INSERT INTO second_opinion_requests (id, patient_name, phone, email, city, country, cancer_type, stage, current_treatment, specific_questions, urgency, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          patientName,
          phone,
          email,
          city,
          country,
          cancerType,
          stage,
          currentTreatment,
          specificQuestions,
          urgency,
          'new'
        ).run();

        ctx.waitUntil(
          sendStaffNotification(env, {
            formKey: 'secondOpinionForm',
            eventType: 'second_opinion',
            entityId: id
          })
        );

        return json({ success: true, message: 'Second opinion request recorded', requestId: id }, 201);
      }

      if (pathname === '/api/public/second-opinion/upload-report' && request.method === 'POST') {
        if (isRateLimited(clientIp, 20, 600000)) return json({ error: 'Upload rate limit exceeded.' }, 429);
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const rawRequestId = (formData.get('requestId') as string) || (formData.get('request_id') as string);
        const fileType = (formData.get('fileType') as string) || 'biopsy';

        if (!rawRequestId || !rawRequestId.trim()) {
          return json({ error: 'Request ID required' }, 400);
        }

        const requestId = rawRequestId.trim();
        if (!isValidUuidV4(requestId)) {
          return json({ error: 'Invalid request ID' }, 400);
        }

        if (!file) return json({ error: 'No file provided' }, 400);

        // Verify parent request exists
        const parent = await env.DB.prepare('SELECT id FROM second_opinion_requests WHERE id = ?').bind(requestId).first<{ id: string }>();
        if (!parent) {
          return json({ error: 'Second opinion request not found' }, 404);
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) return json({ error: 'Unsupported file format.' }, 400);
        if (file.size > 15 * 1024 * 1024) return json({ error: 'File size exceeds 15MB limit.' }, 400);

        const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storageKey = `reports/${requestId}/${Date.now()}-${cleanName}`;

        const arrayBuffer = await file.arrayBuffer();
        await env.PRIVATE_REPORTS.put(storageKey, arrayBuffer, {
          httpMetadata: { contentType: file.type || 'application/pdf' },
          customMetadata: { originalName: file.name, fileType, requestId }
        });

        await env.DB.prepare(
          `INSERT INTO second_opinion_files (id, request_id, storage_key, original_filename, file_size, mime_type, file_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(fileId, requestId, storageKey, file.name, file.size, file.type || 'application/octet-stream', fileType).run();

        return json({ success: true, fileId, originalFilename: file.name, fileSize: file.size, mimeType: file.type }, 201);
      }

      // ADMIN API LAYER
      if (pathname.startsWith('/api/admin/')) {
        const sessionUser = await getSessionUser(request, env);
        if (!sessionUser) return json({ error: 'Unauthorized: Active administrator session required' }, 401);

        const { role } = sessionUser;
        const isSuperAdmin = role === 'super_admin';
        const isContentManager = role === 'content_manager' || isSuperAdmin;
        const isEnquiryManager = role === 'enquiry_manager' || isSuperAdmin;

        if (pathname.includes('/download-report/')) {
          if (!isEnquiryManager) return json({ error: 'Forbidden' }, 403);
          const parts = pathname.split('/');
          const fileId = parts[parts.length - 1];
          const requestId = parts[parts.indexOf('second-opinions') + 1];

          const fileRecord = await env.DB.prepare('SELECT * FROM second_opinion_files WHERE id = ?').bind(fileId).first<any>();
          if (!fileRecord) return json({ error: 'File record not found' }, 404);

          if (requestId && fileRecord.request_id !== requestId) {
            return json({ error: 'File request ID mismatch' }, 403);
          }

          const object = await env.PRIVATE_REPORTS.get(fileRecord.storage_key);
          if (!object) return json({ error: 'File object not found' }, 404);

          const headers = new Headers(corsHeaders);
          object.writeHttpMetadata(headers);
          headers.set('Content-Disposition', `attachment; filename="${fileRecord.original_filename}"`);
          headers.set('Cache-Control', 'private, no-store');
          return new Response(object.body, { headers });
        }

        if (pathname === '/api/admin/users' && request.method === 'GET') {
          if (!isSuperAdmin) return json({ error: 'Forbidden' }, 403);
          const users = await env.DB.prepare('SELECT id, email, name, role, status, last_login, created_at FROM admin_users ORDER BY created_at ASC').all();
          return json({ success: true, users: users.results });
        }

        if (pathname === '/api/admin/users' && request.method === 'POST') {
          if (!isSuperAdmin) return json({ error: 'Forbidden' }, 403);
          const body = (await request.json().catch(() => ({}))) as any;
          const { email, password, name, role } = body;
          if (!email || !password || !name) return json({ error: 'Email, password, name required' }, 400);

          const saltBytes = new Uint8Array(16);
          crypto.getRandomValues(saltBytes);
          const salt = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
          const passwordHash = await hashPasswordPBKDF2(password, salt);
          const userId = `usr-${Date.now()}`;

          await env.DB.prepare(
            `INSERT INTO admin_users (id, email, name, role, password_hash, salt, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(userId, email.trim().toLowerCase(), name.trim(), role || 'content_manager', passwordHash, salt, 'active').run();

          return json({ success: true, user: { id: userId, email, name, role, status: 'active' } }, 201);
        }

        if (pathname.startsWith('/api/admin/users/') && request.method === 'DELETE') {
          if (!isSuperAdmin) return json({ error: 'Forbidden' }, 403);
          const targetId = pathname.replace('/api/admin/users/', '');
          
          const targetUser = await env.DB.prepare('SELECT * FROM admin_users WHERE id = ?').bind(targetId).first<any>();
          if (!targetUser) return json({ error: 'User not found' }, 404);

          if (targetId === sessionUser.id) return json({ error: 'Cannot delete active administrator' }, 400);

          if (targetUser.role === 'super_admin') {
            const activeSuperAdmins = await env.DB.prepare('SELECT COUNT(*) as cnt FROM admin_users WHERE role = "super_admin" AND status = "active" AND id != ?').bind(targetId).first<any>();
            if (!activeSuperAdmins || activeSuperAdmins.cnt < 1) {
              return json({ error: 'Cannot delete the last active super administrator' }, 400);
            }
          }

          await env.DB.prepare('DELETE FROM admin_users WHERE id = ?').bind(targetId).run();
          return json({ success: true, message: 'Admin deleted' });
        }

        if (pathname.startsWith('/api/admin/users/') && request.method === 'PUT') {
          if (!isSuperAdmin) return json({ error: 'Forbidden' }, 403);
          const targetId = pathname.replace('/api/admin/users/', '');
          const body = (await request.json().catch(() => ({}))) as any;
          const { role, status, name } = body;

          if (role && !['super_admin', 'content_manager', 'enquiry_manager'].includes(role)) {
            return json({ error: 'Invalid role' }, 400);
          }
          if (status && !['active', 'disabled'].includes(status)) {
            return json({ error: 'Invalid status' }, 400);
          }

          const targetUser = await env.DB.prepare('SELECT * FROM admin_users WHERE id = ?').bind(targetId).first<any>();
          if (!targetUser) return json({ error: 'User not found' }, 404);

          if (targetId === sessionUser.id && (status === 'disabled' || (role && role !== 'super_admin'))) {
            return json({ error: 'Cannot disable or demote currently authenticated super admin' }, 400);
          }

          if (targetUser.role === 'super_admin' && (status === 'disabled' || (role && role !== 'super_admin'))) {
            const activeSuperAdmins = await env.DB.prepare('SELECT COUNT(*) as cnt FROM admin_users WHERE role = "super_admin" AND status = "active" AND id != ?').bind(targetId).first<any>();
            if (!activeSuperAdmins || activeSuperAdmins.cnt < 1) {
              return json({ error: 'Cannot disable or demote the last active super administrator' }, 400);
            }
          }

          await env.DB.prepare(
            `UPDATE admin_users
             SET role = COALESCE(?, role),
                 status = COALESCE(?, status),
                 name = COALESCE(?, name)
             WHERE id = ?`
          ).bind(role || null, status || null, name || null, targetId).run();

          const updated = await env.DB.prepare('SELECT id, email, name, role, status, last_login, created_at FROM admin_users WHERE id = ?').bind(targetId).first();
          return json({ success: true, user: updated });
        }

        if (pathname === '/api/admin/enquiries' && request.method === 'GET') {
          if (!isEnquiryManager) return json({ error: 'Forbidden' }, 403);
          const results = await env.DB.prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 200').all();
          return json({ success: true, enquiries: results.results });
        }

        if (pathname.startsWith('/api/admin/enquiries/') && request.method === 'PUT') {
          if (!isEnquiryManager) return json({ error: 'Forbidden' }, 403);
          const id = pathname.replace('/api/admin/enquiries/', '');
          const body = (await request.json().catch(() => ({}))) as any;
          await env.DB.prepare(
            `UPDATE enquiries SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?`
          ).bind(body.status || null, body.adminNotes || body.admin_notes || body.notes || null, id).run();
          return json({ success: true, message: 'Enquiry updated' });
        }

        if (pathname.startsWith('/api/admin/enquiries/') && request.method === 'DELETE') {
          if (!isEnquiryManager) return json({ error: 'Forbidden' }, 403);
          const id = pathname.replace('/api/admin/enquiries/', '');
          await env.DB.prepare('DELETE FROM enquiries WHERE id = ?').bind(id).run();
          return json({ success: true, message: 'Enquiry deleted' });
        }

        if (pathname === '/api/admin/second-opinions' && request.method === 'GET') {
          if (!isEnquiryManager) return json({ error: 'Forbidden' }, 403);
          const [requests, files] = await Promise.all([
            env.DB.prepare('SELECT * FROM second_opinion_requests ORDER BY created_at DESC LIMIT 200').all(),
            env.DB.prepare('SELECT id, request_id, original_filename, file_size, mime_type, file_type, uploaded_at FROM second_opinion_files ORDER BY uploaded_at DESC LIMIT 500').all()
          ]);
          const enriched = (requests.results || []).map((r: any) => ({
            ...r,
            files: (files.results || []).filter((f: any) => f.request_id === r.id)
          }));
          return json({ success: true, requests: enriched });
        }

        if (pathname.startsWith('/api/admin/second-opinions/') && request.method === 'PUT') {
          if (!isEnquiryManager) return json({ error: 'Forbidden' }, 403);
          const id = pathname.replace('/api/admin/second-opinions/', '');
          const body = (await request.json().catch(() => ({}))) as any;
          
          let dbStatus = body.status;
          if (dbStatus) {
            const lower = dbStatus.toLowerCase();
            if (['new', 'pending', 'pending review', 'pending_review', 'under_review'].includes(lower)) dbStatus = 'new';
            else if (lower === 'contacted') dbStatus = 'contacted';
            else if (['reviewed', 'report_ready', 'completed'].includes(lower)) dbStatus = 'reviewed';
            else return json({ error: "Invalid second opinion status" }, 400);
          }

          await env.DB.prepare(
            `UPDATE second_opinion_requests SET status = COALESCE(?, status), doctor_notes = COALESCE(?, doctor_notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?`
          ).bind(dbStatus || null, body.doctorNotes || body.doctor_notes || body.notes || null, id).run();
          return json({ success: true, message: 'Second opinion updated' });
        }

        if (pathname.startsWith('/api/admin/second-opinions/') && request.method === 'DELETE') {
          if (!isEnquiryManager) return json({ error: 'Forbidden' }, 403);
          const id = pathname.replace('/api/admin/second-opinions/', '');
          
          const files = await env.DB.prepare('SELECT id, storage_key FROM second_opinion_files WHERE request_id = ?').bind(id).all<any>();
          
          if (files.results && files.results.length > 0) {
            for (const file of files.results) {
              await env.PRIVATE_REPORTS.delete(file.storage_key);
            }
            await env.DB.prepare('DELETE FROM second_opinion_files WHERE request_id = ?').bind(id).run();
          }
          
          await env.DB.prepare('DELETE FROM second_opinion_requests WHERE id = ?').bind(id).run();
          return json({ success: true, message: 'Second opinion dossier deleted' });
        }

        if (!isContentManager) return json({ error: 'Forbidden: Content management privileges required' }, 403);

        // DOCTOR PROFILE
        if (pathname === '/api/admin/doctor') {
          if (request.method === 'GET') {
            const doc = await env.DB.prepare('SELECT * FROM doctor_profile LIMIT 1').first();
            return json({ success: true, doctorProfile: doc });
          }
          if (request.method === 'PUT') {
            const body = (await request.json().catch(() => ({}))) as any;
            const existingDoc = await env.DB.prepare('SELECT id FROM doctor_profile ORDER BY updated_at DESC LIMIT 1').first<any>();
            let docId = existingDoc?.id;
            
            if (!docId) {
                // Validate required fields for initial insert
                if (!body.name || !body.speciality || !body.positioning || (body.experienceYears === undefined && body.experience_years === undefined)) {
                    return json({ error: 'Missing required doctor fields (name, speciality, positioning, experienceYears)' }, 400);
                }
                docId = 'doc-1';
                await env.DB.prepare('INSERT INTO doctor_profile (id, name, speciality, positioning, experience_years, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
                    .bind(docId, body.name, body.speciality, body.positioning, body.experienceYears || body.experience_years)
                    .run();
            }

            const updateRes = await env.DB.prepare(
              `UPDATE doctor_profile
               SET name = COALESCE(?, name),
                   speciality = COALESCE(?, speciality),
                   positioning = COALESCE(?, positioning),
                   experience_years = COALESCE(?, experience_years),
                   tagline = COALESCE(?, tagline),
                   hero_headline = COALESCE(?, hero_headline),
                   hero_subheadline = COALESCE(?, hero_subheadline),
                   bio_summary = COALESCE(?, bio_summary),
                   full_bio = COALESCE(?, full_bio),
                   photo_url = COALESCE(?, photo_url),
                   qualifications = COALESCE(?, qualifications),
                   core_expertise = COALESCE(?, core_expertise),
                   memberships = COALESCE(?, memberships),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`
            ).bind(
              body.name || null,
              body.speciality || null,
              body.positioning || null,
              body.experienceYears || body.experience_years || null,
              body.tagline || null,
              body.heroHeadline || body.hero_headline || null,
              body.heroSubheadline || body.hero_subheadline || null,
              body.bioSummary || body.bio_summary || null,
              body.fullBio ? JSON.stringify(body.fullBio) : null,
              body.photoUrl || body.photo_url || null,
              body.qualifications ? JSON.stringify(body.qualifications) : null,
              body.coreExpertise ? JSON.stringify(body.coreExpertise) : null,
              body.memberships ? JSON.stringify(body.memberships) : null,
              docId
            ).run();

            if (!updateRes.success) {
              return json({ error: 'Failed to update doctor profile persistence' }, 500);
            }
            const updated = await env.DB.prepare('SELECT * FROM doctor_profile WHERE id = ?').bind(docId).first();
            if (!updated) {
              return json({ error: 'Doctor profile not found after update' }, 404);
            }
            return json({ success: true, doctorProfile: updated });
          }
        }

        // HOMEPAGE PERSISTENCE & RETRIEVAL
        if (pathname === '/api/admin/homepage') {
          if (request.method === 'GET') {
            const [sectionsRes, settingsRes] = await Promise.all([
              env.DB.prepare('SELECT * FROM homepage_sections ORDER BY display_order ASC').all(),
              env.DB.prepare('SELECT key, value FROM site_settings WHERE key LIKE "homepage_%"').all()
            ]);
            const homepageData: Record<string, any> = {};
            for (const row of settingsRes.results || []) {
              try { homepageData[row.key.replace('homepage_', '')] = JSON.parse(row.value); } catch { homepageData[row.key.replace('homepage_', '')] = row.value; }
            }
            homepageData.sections = (sectionsRes.results || []).map(normalizeHomepageSection).sort((a, b) => a.order - b.order);
            return json({ success: true, ...homepageData });
          }
          if (request.method === 'PUT') {
            const body = (await request.json().catch(() => ({}))) as any;
            const { hero, about, second_opinion, secondOpinion, final_cta, finalCta, animations, globalAnimationSettings, sections, how_can_we_help, treatment_journey } = body;

            const updates = [
              ['homepage_hero', hero || body.heroContent],
              ['homepage_about', about || body.aboutDoctorContent],
              ['homepage_second_opinion', second_opinion || secondOpinion || body.secondOpinionContent],
              ['homepage_final_cta', final_cta || finalCta || body.finalCtaContent],
              ['homepage_animations', animations || body.heroAnimationSettings],
              ['homepage_global_animations', globalAnimationSettings],
              ['homepage_how_can_we_help', how_can_we_help],
              ['homepage_treatment_journey', treatment_journey]
            ];

            for (const [key, val] of updates) {
              if (val !== undefined) {
                const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
                await env.DB.prepare(
                  `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
                ).bind(key, valStr).run();
              }
            }

            if (Array.isArray(sections)) {
              for (const sec of sections) {
                const title = sec.customTitle ?? sec.title ?? null;
                const subtitle = sec.customSubtitle ?? sec.subtitle ?? null;
                await env.DB.prepare(
                  `UPDATE homepage_sections
                   SET is_visible = ?, display_order = ?, title = COALESCE(?, title), subtitle = COALESCE(?, subtitle), content = COALESCE(?, content), updated_at = CURRENT_TIMESTAMP
                   WHERE id = ? OR section_key = ?`
                ).bind(
                  sec.visible !== false && sec.is_visible !== false ? 1 : 0,
                  sec.order || sec.display_order || 0,
                  title,
                  subtitle,
                  sec.content ? JSON.stringify(sec.content) : null,
                  sec.id || '',
                  sec.key || sec.section_key || ''
                ).run();
              }
            }

            return json({ success: true, message: 'Homepage persisted in D1' });
          }
        }

        // BODY EXPLORER
        if (pathname === '/api/admin/body-explorer') {
          if (request.method === 'GET') {
            const regions = await env.DB.prepare('SELECT * FROM body_explorer_regions ORDER BY display_order ASC').all();
            return json({ success: true, bodyExplorerRegions: regions.results });
          }
          if (request.method === 'PUT') {
            const body = (await request.json().catch(() => ({}))) as any;
            const list = Array.isArray(body) ? body : (body.bodyExplorerRegions || []);
            for (const r of list) {
              await env.DB.prepare(
                `INSERT INTO body_explorer_regions (id, label, title, description, display_order, is_active, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET
                   label = excluded.label,
                   title = excluded.title,
                   description = excluded.description,
                   display_order = excluded.display_order,
                   is_active = excluded.is_active,
                   updated_at = CURRENT_TIMESTAMP`
              ).bind(r.id, r.name || r.label || '', r.title || '', r.description || '', r.display_order || r.order || 0, r.is_active !== false ? 1 : 0).run();
            }
            return json({ success: true, message: 'Body explorer updated' });
          }
        }

        // CANCER CATEGORIES
        if (pathname === '/api/admin/cancer-categories') {
          if (request.method === 'GET') {
            const cats = await env.DB.prepare('SELECT * FROM cancer_categories ORDER BY display_order ASC').all();
            return json({ success: true, cancerCategories: cats.results });
          }
          if (request.method === 'PUT' || request.method === 'POST') {
            const body = (await request.json().catch(() => ({}))) as any;
            const list = Array.isArray(body) ? body : (body.categories || [body]);
            for (const cat of list) {
              await env.DB.prepare(
                `INSERT INTO cancer_categories (id, name, slug, description, display_order, updated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET
                   name = excluded.name,
                   slug = excluded.slug,
                   description = excluded.description,
                   display_order = excluded.display_order,
                   updated_at = CURRENT_TIMESTAMP`
              ).bind(cat.id || `cat-${Date.now()}`, cat.name, cat.slug, cat.description || '', cat.display_order || 0).run();
            }
            return json({ success: true, message: 'Cancer categories updated' });
          }
        }

        // CANCERS / CANCER CARE
        if (pathname === '/api/admin/cancers' || pathname === '/api/admin/cancer-care') {
          if (request.method === 'GET') {
            const cancers = await env.DB.prepare('SELECT * FROM cancer_care ORDER BY display_order ASC').all();
            return json({ success: true, cancers: cancers.results });
          }
          if (request.method === 'PUT') {
            const body = (await request.json().catch(() => ({}))) as any;
            const cancers = Array.isArray(body) ? body : (body.cancers || []);
            for (const c of cancers) {
              await env.DB.prepare(
                `INSERT INTO cancer_care (id, name, slug, category, description, status, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET
                   name = excluded.name,
                   slug = excluded.slug,
                   category = excluded.category,
                   description = excluded.description,
                   status = excluded.status,
                   updated_at = CURRENT_TIMESTAMP`
              ).bind(c.id, c.name, c.slug, c.category || 'Solid Tumors', c.description || '', c.status || 'published').run();
            }
            return json({ success: true, message: 'Cancers updated' });
          }
          if (request.method === 'POST') {
            const c = (await request.json().catch(() => ({}))) as any;
            const id = c.id || `cancer-${Date.now()}`;
            await env.DB.prepare(
              `INSERT INTO cancer_care (id, name, slug, category, description, status, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
            ).bind(id, c.name, c.slug, c.category || 'Solid Tumors', c.description || '', c.status || 'published').run();
            return json({ success: true, cancer: { ...c, id } }, 201);
          }
        }

        if (pathname.startsWith('/api/admin/cancers/')) {
          const id = pathname.replace('/api/admin/cancers/', '');
          if (request.method === 'PUT') {
            const c = (await request.json().catch(() => ({}))) as any;
            await env.DB.prepare(
              `UPDATE cancer_care
               SET name = COALESCE(?, name),
                   slug = COALESCE(?, slug),
                   category = COALESCE(?, category),
                   description = COALESCE(?, description),
                   status = COALESCE(?, status),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`
            ).bind(c.name || null, c.slug || null, c.category || null, c.description || null, c.status || null, id).run();
            return json({ success: true, message: 'Cancer record updated' });
          }
          if (request.method === 'DELETE') {
            await env.DB.prepare('DELETE FROM cancer_care WHERE id = ?').bind(id).run();
            return json({ success: true, message: 'Cancer record deleted' });
          }
        }

        // TREATMENTS
        if (pathname === '/api/admin/treatments') {
          if (request.method === 'GET') {
            const treatments = await env.DB.prepare('SELECT * FROM treatments ORDER BY display_order ASC').all();
            return json({ success: true, treatments: treatments.results });
          }
          if (request.method === 'PUT') {
            const body = (await request.json().catch(() => ({}))) as any;
            const treatments = Array.isArray(body) ? body : (body.treatments || []);
            for (const t of treatments) {
              await env.DB.prepare(
                `INSERT INTO treatments (id, title, slug, summary, details, status, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET
                   title = excluded.title,
                   slug = excluded.slug,
                   summary = excluded.summary,
                   details = excluded.details,
                   status = excluded.status,
                   updated_at = CURRENT_TIMESTAMP`
              ).bind(t.id, t.title || t.name || '', t.slug, t.summary || '', t.details || '', t.status || 'published').run();
            }
            return json({ success: true, message: 'Treatments updated' });
          }
          if (request.method === 'POST') {
            const t = (await request.json().catch(() => ({}))) as any;
            const id = t.id || `treat-${Date.now()}`;
            await env.DB.prepare(
              `INSERT INTO treatments (id, title, slug, summary, details, status, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
            ).bind(id, t.title || t.name || '', t.slug, t.summary || '', t.details || '', t.status || 'published').run();
            return json({ success: true, treatment: { ...t, id } }, 201);
          }
        }

        if (pathname.startsWith('/api/admin/treatments/')) {
          const id = pathname.replace('/api/admin/treatments/', '');
          if (request.method === 'PUT') {
            const t = (await request.json().catch(() => ({}))) as any;
            await env.DB.prepare(
              `UPDATE treatments
               SET title = COALESCE(?, title),
                   slug = COALESCE(?, slug),
                   summary = COALESCE(?, summary),
                   details = COALESCE(?, details),
                   status = COALESCE(?, status),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`
            ).bind(t.title || t.name || null, t.slug || null, t.summary || null, t.details || null, t.status || null, id).run();
            return json({ success: true, message: 'Treatment updated' });
          }
          if (request.method === 'DELETE') {
            await env.DB.prepare('DELETE FROM treatments WHERE id = ?').bind(id).run();
            return json({ success: true, message: 'Treatment deleted' });
          }
        }

        // BLOGS
        if (pathname === '/api/admin/blogs') {
          if (request.method === 'GET') {
            const blogs = await env.DB.prepare('SELECT * FROM blogs ORDER BY published_at DESC').all();
            return json({ success: true, blogs: blogs.results });
          }
          if (request.method === 'PUT') {
            const body = (await request.json().catch(() => ({}))) as any;
            const blogs = Array.isArray(body) ? body : (body.blogs || body.blogPosts || []);
            for (const b of blogs) {
              await env.DB.prepare(
                `INSERT INTO blogs (id, title, slug, category, excerpt, content, is_published, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET
                   title = excluded.title,
                   slug = excluded.slug,
                   category = excluded.category,
                   excerpt = excluded.excerpt,
                   content = excluded.content,
                   is_published = excluded.is_published,
                   updated_at = CURRENT_TIMESTAMP`
              ).bind(b.id, b.title, b.slug, b.category || 'Oncology Insights', b.excerpt || '', b.content || b.mainContent || '', b.is_published !== false ? 1 : 0).run();
            }
            return json({ success: true, message: 'Blogs updated' });
          }
          if (request.method === 'POST') {
            const b = (await request.json().catch(() => ({}))) as any;
            const id = b.id || `blog-${Date.now()}`;
            await env.DB.prepare(
              `INSERT INTO blogs (id, title, slug, category, excerpt, content, is_published, published_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
            ).bind(id, b.title, b.slug, b.category || 'Oncology Insights', b.excerpt || '', b.content || b.mainContent || '', b.is_published !== false ? 1 : 0).run();
            return json({ success: true, blog: { ...b, id } }, 201);
          }
        }

        if (pathname.startsWith('/api/admin/blogs/')) {
          const id = pathname.replace('/api/admin/blogs/', '');
          if (request.method === 'PUT') {
            const b = (await request.json().catch(() => ({}))) as any;
            await env.DB.prepare(
              `UPDATE blogs
               SET title = COALESCE(?, title),
                   slug = COALESCE(?, slug),
                   category = COALESCE(?, category),
                   excerpt = COALESCE(?, excerpt),
                   content = COALESCE(?, content),
                   is_published = COALESCE(?, is_published),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`
            ).bind(b.title || null, b.slug || null, b.category || null, b.excerpt || null, b.content || b.mainContent || null, b.is_published !== undefined ? (b.is_published ? 1 : 0) : null, id).run();
            return json({ success: true, message: 'Blog updated' });
          }
          if (request.method === 'DELETE') {
            await env.DB.prepare('DELETE FROM blogs WHERE id = ?').bind(id).run();
            return json({ success: true, message: 'Blog deleted' });
          }
        }

        // LOCATIONS
        if (pathname === '/api/admin/locations') {
          if (request.method === 'GET') {
            const locations = await env.DB.prepare('SELECT * FROM locations ORDER BY display_order ASC').all();
            return json({ success: true, locations: locations.results });
          }
          if (request.method === 'PUT') {
            const body = (await request.json().catch(() => ({}))) as any;
            const locations = Array.isArray(body) ? body : (body.locations || []);
            for (const loc of locations) {
              await env.DB.prepare(
                `INSERT INTO locations (id, hospital_name, department, address_line1, city, state, pincode, phone, whatsapp, email, opd_timings, days_available, is_primary, is_active, google_maps_url, display_order, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET
                   hospital_name = excluded.hospital_name,
                   department = excluded.department,
                   address_line1 = excluded.address_line1,
                   city = excluded.city,
                   state = excluded.state,
                   pincode = excluded.pincode,
                   phone = excluded.phone,
                   whatsapp = excluded.whatsapp,
                   email = excluded.email,
                   opd_timings = excluded.opd_timings,
                   days_available = excluded.days_available,
                   is_primary = excluded.is_primary,
                   is_active = excluded.is_active,
                   google_maps_url = excluded.google_maps_url,
                   display_order = excluded.display_order,
                   updated_at = CURRENT_TIMESTAMP`
              ).bind(
                loc.id,
                loc.hospitalName || loc.hospital_name || 'Hospital',
                loc.department || '',
                loc.addressLine1 || loc.address_line1 || '',
                loc.city || 'Mohali',
                loc.state || 'Punjab',
                loc.pincode || '',
                loc.phonePrimary || loc.phone || '',
                loc.whatsappNumber || loc.whatsapp || '',
                loc.emailContact || loc.email || '',
                loc.consultationTimings || loc.opd_timings || '',
                loc.daysAvailable || loc.days_available || '',
                loc.isPrimary ? 1 : 0,
                loc.isActive !== false ? 1 : 0,
                loc.googleMapsDirectionsUrl || loc.google_maps_url || '',
                loc.display_order || 0
              ).run();
            }
            return json({ success: true, message: 'Locations updated' });
          }
          if (request.method === 'POST') {
            const loc = (await request.json().catch(() => ({}))) as any;
            const id = loc.id || `loc-${Date.now()}`;
            await env.DB.prepare(
              `INSERT INTO locations (id, hospital_name, department, address_line1, city, state, pincode, phone, whatsapp, email, opd_timings, days_available, is_primary, is_active, google_maps_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              id,
              loc.hospitalName || loc.hospital_name || '',
              loc.department || '',
              loc.addressLine1 || loc.address_line1 || '',
              loc.city || '',
              loc.state || '',
              loc.pincode || '',
              loc.phonePrimary || loc.phone || '',
              loc.whatsappNumber || loc.whatsapp || '',
              loc.emailContact || loc.email || '',
              loc.consultationTimings || loc.opd_timings || '',
              loc.daysAvailable || loc.days_available || '',
              loc.isPrimary ? 1 : 0,
              1,
              loc.googleMapsDirectionsUrl || loc.google_maps_url || ''
            ).run();
            return json({ success: true, location: { ...loc, id } }, 201);
          }
        }

        if (pathname.startsWith('/api/admin/locations/')) {
          const id = pathname.replace('/api/admin/locations/', '');
          if (request.method === 'DELETE') {
            await env.DB.prepare('DELETE FROM locations WHERE id = ?').bind(id).run();
            return json({ success: true, message: 'Location deleted' });
          }
        }

        // FAQS
        if (pathname === '/api/admin/faqs') {
          if (request.method === 'GET') {
            const faqs = await env.DB.prepare('SELECT * FROM faqs ORDER BY display_order ASC').all();
            return json({ success: true, faqs: faqs.results });
          }
          if (request.method === 'PUT' || request.method === 'POST') {
            const body = (await request.json().catch(() => ({}))) as any;
            const faqs = Array.isArray(body) ? body : (body.faqs || [body]);
            for (const f of faqs) {
              await env.DB.prepare(
                `INSERT INTO faqs (id, question, answer, category, display_order, is_published, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET
                   question = excluded.question,
                   answer = excluded.answer,
                   category = excluded.category,
                   display_order = excluded.display_order,
                   is_published = excluded.is_published,
                   updated_at = CURRENT_TIMESTAMP`
              ).bind(f.id || `faq-${Date.now()}`, f.question, f.answer, f.category || 'General', f.display_order || 0, f.is_published !== false ? 1 : 0).run();
            }
            return json({ success: true, message: 'FAQs updated' });
          }
        }

        if (pathname.startsWith('/api/admin/faqs/')) {
          const id = pathname.replace('/api/admin/faqs/', '');
          if (request.method === 'PUT') {
            const f = (await request.json().catch(() => ({}))) as any;
            await env.DB.prepare(
              `UPDATE faqs
               SET question = COALESCE(?, question),
                   answer = COALESCE(?, answer),
                   category = COALESCE(?, category),
                   display_order = COALESCE(?, display_order),
                   is_published = COALESCE(?, is_published),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`
            ).bind(
              f.question || null,
              f.answer || null,
              f.category || null,
              f.display_order ?? f.order ?? null,
              f.is_published !== undefined ? (f.is_published ? 1 : 0) : null,
              id
            ).run();
            return json({ success: true, message: 'FAQ updated' });
          }
          if (request.method === 'DELETE') {
            await env.DB.prepare('DELETE FROM faqs WHERE id = ?').bind(id).run();
            return json({ success: true, message: 'FAQ deleted' });
          }
        }

        // TESTIMONIALS
        if (pathname === '/api/admin/testimonials') {
          if (request.method === 'GET') {
            const items = await env.DB.prepare('SELECT * FROM testimonials ORDER BY date DESC').all();
            return json({ success: true, testimonials: items.results });
          }
          if (request.method === 'PUT' || request.method === 'POST') {
            const body = (await request.json().catch(() => ({}))) as any;
            const list = Array.isArray(body) ? body : (body.testimonials || [body]);
            for (const t of list) {
              await env.DB.prepare(
                `INSERT INTO testimonials (id, patient_name, cancer_type, feedback, rating, date, is_published)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                   patient_name = excluded.patient_name,
                   cancer_type = excluded.cancer_type,
                   feedback = excluded.feedback,
                   rating = excluded.rating,
                   date = excluded.date,
                   is_published = excluded.is_published`
              ).bind(t.id || `test-${Date.now()}`, t.patientName || t.patient_name || '', t.cancerType || t.cancer_type || '', t.feedback || '', t.rating || 5, t.date || new Date().toISOString(), t.is_published !== false ? 1 : 0).run();
            }
            return json({ success: true, message: 'Testimonials updated' });
          }
        }

        // SITE SETTINGS
        if (pathname === '/api/admin/site-settings') {
          if (request.method === 'GET') {
            const rows = await env.DB.prepare('SELECT key, value FROM site_settings').all<{ key: string; value: string }>();
            const map: Record<string, any> = {};
            for (const r of rows.results || []) {
              try { map[r.key] = JSON.parse(r.value); } catch { map[r.key] = r.value; }
            }
            return json({ success: true, siteSettings: map });
          }
          if (request.method === 'PUT') {
            const body = (await request.json().catch(() => ({}))) as any;
            for (const [key, value] of Object.entries(body)) {
              const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
              await env.DB.prepare(
                `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
              ).bind(key, valStr).run();
            }
            return json({ success: true, message: 'Site settings updated', siteSettings: body });
          }
        }

        // NAVIGATION
        if (pathname === '/api/admin/navigation') {
          if (request.method === 'GET') {
            const nav = await env.DB.prepare('SELECT * FROM navigation_items ORDER BY display_order ASC').all();
            const navigation = (nav.results || []).map(normalizeNavigationItem).sort((a, b) => a.order - b.order);
            return json({ success: true, navigation });
          }
          if (request.method === 'PUT') {
            const body = (await request.json().catch(() => ({}))) as any;
            const items = Array.isArray(body) ? body : (body.navigation || []);
            for (const item of items) {
              await env.DB.prepare(
                `INSERT INTO navigation_items (id, label, url, display_order, is_visible, is_external, open_in_new_tab, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET
                   label = excluded.label,
                   url = excluded.url,
                   display_order = excluded.display_order,
                   is_visible = excluded.is_visible,
                   is_external = excluded.is_external,
                   open_in_new_tab = excluded.open_in_new_tab,
                   updated_at = CURRENT_TIMESTAMP`
              ).bind(item.id, item.label, item.url, item.order || item.display_order || 0, item.isVisible !== false ? 1 : 0, item.isExternal ? 1 : 0, item.openInNewTab ? 1 : 0).run();
            }
            return json({ success: true, message: 'Navigation updated' });
          }
        }

        // FOOTER
        if (pathname === '/api/admin/footer') {
          if (request.method === 'GET') {
            const footer = await env.DB.prepare('SELECT * FROM footer_config ORDER BY updated_at DESC LIMIT 1').first();
            return json({ success: true, footer: normalizeFooterRow(footer) });
          }
          if (request.method === 'PUT') {
            const body = (await request.json().catch(() => ({}))) as any;
            const existing = await env.DB.prepare('SELECT id FROM footer_config ORDER BY updated_at DESC LIMIT 1').first<any>();
            const id = existing?.id || 'foot-1';
            
            await env.DB.prepare(
              `INSERT INTO footer_config (id, about_text, phone, whatsapp, email, address, copyright_text, medical_disclaimer, privacy_policy_link, social_links, footer_cta, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(id) DO UPDATE SET
                 about_text = excluded.about_text,
                 phone = excluded.phone,
                 whatsapp = excluded.whatsapp,
                 email = excluded.email,
                 address = excluded.address,
                 copyright_text = excluded.copyright_text,
                 medical_disclaimer = excluded.medical_disclaimer,
                 privacy_policy_link = excluded.privacy_policy_link,
                 social_links = excluded.social_links,
                 footer_cta = excluded.footer_cta,
                 updated_at = CURRENT_TIMESTAMP`
            ).bind(
              id,
              body.doctorDescription || '',
              body.phone || '',
              body.whatsapp || '',
              body.email || '',
              body.address || '',
              body.copyright || '',
              body.medicalDisclaimer || '',
              body.privacyPolicyLink || '',
              JSON.stringify(body.socialLinks || {}),
              JSON.stringify(body.footerCta || {})
            ).run();
            return json({ success: true, message: 'Footer updated' });
          }
        }

        // CANCER PAGES ROUTE PARITY
        if (pathname === '/api/admin/cancer-pages') {
          if (request.method === 'GET') {
            const pages = await env.DB.prepare('SELECT * FROM cancer_pages ORDER BY slug ASC').all();
            return json({ success: true, cancerPages: pages.results });
          }
          if (request.method === 'PUT' || request.method === 'POST') {
            const body = (await request.json().catch(() => ({}))) as any;
            const list = Array.isArray(body) ? body : (body.cancerPages || [body]);
            for (const p of list) {
              await env.DB.prepare(
                `INSERT INTO cancer_pages (id, slug, title, h1, meta_description, intro, why_choose, services, clinical_focus, status, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET
                   slug = excluded.slug,
                   title = excluded.title,
                   h1 = excluded.h1,
                   meta_description = excluded.meta_description,
                   intro = excluded.intro,
                   why_choose = excluded.why_choose,
                   services = excluded.services,
                   clinical_focus = excluded.clinical_focus,
                   status = excluded.status,
                   updated_at = CURRENT_TIMESTAMP`
              ).bind(
                p.id || `cp-${Date.now()}`,
                p.slug,
                p.title,
                p.h1 || '',
                p.metaDescription || p.meta_description || '',
                p.intro || '',
                typeof p.whyChoose === 'object' ? JSON.stringify(p.whyChoose) : (p.why_choose || '[]'),
                typeof p.servicesOffered === 'object' ? JSON.stringify(p.servicesOffered) : (p.services || '[]'),
                p.clinicalFocus || p.clinical_focus || '',
                p.status || 'published'
              ).run();
            }
            return json({ success: true, message: 'Cancer pages updated' });
          }
        }

        if (pathname.startsWith('/api/admin/cancer-pages/')) {
          const id = pathname.replace('/api/admin/cancer-pages/', '');
          if (request.method === 'PUT') {
            const p = (await request.json().catch(() => ({}))) as any;
            await env.DB.prepare(
              `UPDATE cancer_pages
               SET slug = COALESCE(?, slug),
                   title = COALESCE(?, title),
                   h1 = COALESCE(?, h1),
                   meta_description = COALESCE(?, meta_description),
                   intro = COALESCE(?, intro),
                   why_choose = COALESCE(?, why_choose),
                   services = COALESCE(?, services),
                   clinical_focus = COALESCE(?, clinical_focus),
                   status = COALESCE(?, status),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`
            ).bind(
              p.slug || null,
              p.title || null,
              p.h1 || null,
              p.metaDescription || p.meta_description || null,
              p.intro || null,
              p.whyChoose ? JSON.stringify(p.whyChoose) : (p.why_choose || null),
              p.servicesOffered ? JSON.stringify(p.servicesOffered) : (p.services || null),
              p.clinicalFocus || p.clinical_focus || null,
              p.status || null,
              id
            ).run();
            return json({ success: true, message: 'Cancer page updated' });
          }
          if (request.method === 'DELETE') {
            await env.DB.prepare('DELETE FROM cancer_pages WHERE id = ?').bind(id).run();
            return json({ success: true, message: 'Cancer page deleted' });
          }
        }

        // MEDIA MANAGEMENT & SAFE DELETE (NO FORCE BYPASS)
        if (pathname === '/api/admin/media' && request.method === 'GET') {
          if (!isContentManager) {
            return json({ error: 'Forbidden' }, 403);
          }
          const category = url.searchParams.get('category');
          const q = url.searchParams.get('q');
          let sql = 'SELECT * FROM media';
          const params: any[] = [];
          if (category && category !== 'all') {
            sql += ' WHERE category = ?';
            params.push(category);
          }
          if (q) {
            sql += (params.length ? ' AND ' : ' WHERE ') + '(original_name LIKE ? OR alt_text LIKE ? OR storage_key LIKE ?)';
            const searchParam = `%${q}%`;
            params.push(searchParam, searchParam, searchParam);
          }
          sql += ' ORDER BY created_at DESC LIMIT 200';
          const results = await env.DB.prepare(sql).bind(...params).all();
          const normalizedMedia = (results.results || []).map((m: any) => ({
            ...m,
            public_url: m.storage_key
              ? buildPublicMediaUrl(m.storage_key, env, url.origin)
              : resolveMediaPublicUrl(m.public_url, env, url.origin)
          }));
          return json({ success: true, count: normalizedMedia.length, media: normalizedMedia });
        }

        if (pathname === '/api/admin/media/upload' && request.method === 'POST') {
          if (!isContentManager) {
            return json({ error: 'Forbidden' }, 403);
          }
          const formData = await request.formData();
          const file = formData.get('file') as File | null;
          if (!file) return json({ error: 'No file uploaded' }, 400);

          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
          if (!file.type || !allowedTypes.includes(file.type)) {
            return json({ error: 'Unsupported image format. Allowed: JPEG, PNG, WEBP, AVIF.' }, 400);
          }
          if (file.size > 15 * 1024 * 1024) {
            return json({ error: 'File size exceeds maximum permitted limit (15MB).' }, 400);
          }

          const rawCategory = formData.get('category');
          let category = 'Doctor Photos';
          if (typeof rawCategory === 'string' && rawCategory.trim()) {
            const trimmedCategory = rawCategory.trim();
            if (!ALLOWED_MEDIA_CATEGORIES.includes(trimmedCategory)) {
              return json({ error: 'Invalid media category' }, 400);
            }
            category = trimmedCategory;
          }

          const rawAlt = formData.get('alt_text');
          const altText = typeof rawAlt === 'string' ? rawAlt.trim() : '';
          if (altText.length > 300) {
            return json({ error: 'Alt text is too long.' }, 400);
          }

          const width = parseMediaDimension(formData.get('width'));
          const height = parseMediaDimension(formData.get('height'));
          const isDecorative = formData.get('is_decorative') === 'true' ? 1 : 0;
          const subfolder = (formData.get('subfolder') as string) || '';

          const arrayBuffer = await file.arrayBuffer();
          if (!isValidImageSignature(file.type, arrayBuffer)) {
            return json({ error: 'File content does not match the declared image format.' }, 400);
          }

          const verifiedExtension = MIME_TO_EXTENSION[file.type] || 'webp';
          const uuid = crypto.randomUUID();
          const mediaId = `med-${uuid}`;
          const cleanCat = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const cleanSub = subfolder ? `${subfolder.toLowerCase().replace(/[^a-z0-9]/g, '-')}/` : '';
          const storageKey = `website/${cleanCat}/${cleanSub}${uuid}.${verifiedExtension}`;

          const publicUrl = buildPublicMediaUrl(storageKey, env, url.origin);

          let uploadedToR2 = false;
          try {
            await env.PUBLIC_MEDIA.put(storageKey, arrayBuffer, {
              httpMetadata: { contentType: file.type || 'image/webp' },
              customMetadata: { originalName: file.name, category }
            });
            uploadedToR2 = true;

            await env.DB.prepare(
              `INSERT INTO media (id, storage_key, original_name, mime_type, file_size, width, height, alt_text, category, public_url, is_decorative)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(mediaId, storageKey, file.name, file.type || 'image/webp', file.size, width, height, altText, category, publicUrl, isDecorative).run();

            return json({
              success: true,
              message: 'Uploaded to R2 & recorded in D1',
              media: {
                id: mediaId,
                storage_key: storageKey,
                original_name: file.name,
                mime_type: file.type,
                file_size: file.size,
                width,
                height,
                alt_text: altText,
                category,
                public_url: publicUrl,
                created_at: new Date().toISOString()
              }
            }, 201);
          } catch (error) {
            if (uploadedToR2) {
              try {
                await env.PUBLIC_MEDIA.delete(storageKey);
              } catch {
                console.warn('Failed to rollback orphaned R2 upload');
              }
            }

            return json({
              error: 'Could not save media asset.'
            }, 500);
          }
        }

        if (pathname.startsWith('/api/admin/media/usage/')) {
          if (!isContentManager) {
            return json({ error: 'Forbidden' }, 403);
          }
          const id = pathname.replace('/api/admin/media/usage/', '');
          const item = await env.DB.prepare('SELECT * FROM media WHERE id = ?').bind(id).first<any>();
          if (!item) return json({ error: 'Media not found' }, 404);

          const slotUse = await env.DB.prepare(
            'SELECT slot_name, slot_key FROM media_slots WHERE published_value = ? OR draft_value = ? OR published_value LIKE ?'
          ).bind(item.id, item.id, `%${item.storage_key}%`).all();

          return json({
            success: true,
            mediaId: id,
            storageKey: item.storage_key,
            usageCount: slotUse.results?.length ?? 0,
            usages: slotUse.results
          });
        }

        if (pathname.startsWith('/api/admin/media/') && request.method === 'DELETE') {
          if (!isContentManager) {
            return json({ error: 'Forbidden' }, 403);
          }
          const id = pathname.replace('/api/admin/media/', '');
          const item = await env.DB.prepare('SELECT * FROM media WHERE id = ?').bind(id).first<any>();
          if (!item) return json({ error: 'Media item not found' }, 404);

          const [slotUse, blogUse, treatmentUse, cancerUse, categoryUse, locationUse, doctorUse] = await Promise.all([
            env.DB.prepare('SELECT slot_name, slot_key FROM media_slots WHERE published_value = ? OR draft_value = ? OR published_value LIKE ?').bind(item.id, item.id, `%${item.storage_key}%`).all(),
            env.DB.prepare('SELECT id, title FROM blogs WHERE featured_image_id = ? OR content LIKE ?').bind(item.id, `%${item.id}%`).all(),
            env.DB.prepare('SELECT id, title FROM treatments WHERE image_id = ? OR featured_image = ?').bind(item.id, item.id).all(),
            env.DB.prepare('SELECT id, name FROM cancer_care WHERE image_id = ? OR card_image = ? OR banner_image = ?').bind(item.id, item.id, item.id).all(),
            env.DB.prepare('SELECT id, name FROM cancer_categories WHERE image_id = ?').bind(item.id).all(),
            env.DB.prepare('SELECT id, hospital_name FROM locations WHERE image_id = ?').bind(item.id).all(),
            env.DB.prepare('SELECT id FROM doctor_profile WHERE photo_url = ? OR hero_photo = ? OR about_photo = ? OR profile_photo = ? OR second_opinion_photo = ? OR cta_photo = ?').bind(item.public_url, item.public_url, item.public_url, item.public_url, item.public_url, item.public_url).all()
          ]);

          const totalUsages = [
            ...(slotUse.results || []),
            ...(blogUse.results || []),
            ...(treatmentUse.results || []),
            ...(cancerUse.results || []),
            ...(categoryUse.results || []),
            ...(locationUse.results || []),
            ...(doctorUse.results || [])
          ];

          if (totalUsages.length > 0) {
            return json({ error: 'Media is in use across the application', usages: totalUsages }, 409);
          }

          try {
            await env.PUBLIC_MEDIA.delete(item.storage_key);
          } catch (r2Err) {
            return json({ error: 'Could not delete media asset from storage.' }, 500);
          }

          await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
          return json({ success: true, message: 'Media removed from R2 and D1' });
        }

        // MEDIA SLOTS
        if (pathname === '/api/admin/media-slots' && request.method === 'GET') {
          if (!isContentManager) {
            return json({ error: 'Forbidden' }, 403);
          }
          const slots = await env.DB.prepare('SELECT * FROM media_slots ORDER BY section ASC').all();
          const slotMap: Record<string, any> = {};
          for (const s of slots.results || []) {
            const norm = normalizeMediaSlot(s);
            if (norm) slotMap[norm.slotKey] = norm;
          }
          return json({ success: true, mediaSlots: slotMap });
        }

        if (pathname.startsWith('/api/admin/media-slots/') && !pathname.endsWith('/publish') && request.method === 'PUT') {
          if (!isContentManager) {
            return json({ error: 'Forbidden' }, 403);
          }
          const slotKey = pathname.replace('/api/admin/media-slots/', '');
          const body = (await request.json().catch(() => ({}))) as any;
          const { draftValue, altText, focalPoint, mobileValue } = body;

          await env.DB.prepare(
            `UPDATE media_slots
             SET draft_value = ?, alt_text = COALESCE(?, alt_text), focal_point = COALESCE(?, focal_point), mobile_value = COALESCE(?, mobile_value), status = 'draft_saved', updated_at = CURRENT_TIMESTAMP
             WHERE slot_key = ?`
          ).bind(draftValue, altText || null, focalPoint || null, mobileValue || null, slotKey).run();

          const updated = await env.DB.prepare('SELECT * FROM media_slots WHERE slot_key = ?').bind(slotKey).first();
          return json({ success: true, message: `Draft saved for slot ${slotKey}`, slot: normalizeMediaSlot(updated) });
        }

        if (pathname.startsWith('/api/admin/media-slots/') && pathname.endsWith('/publish') && request.method === 'POST') {
          if (!isContentManager) {
            return json({ error: 'Forbidden' }, 403);
          }
          const slotKey = pathname.replace('/api/admin/media-slots/', '').replace('/publish', '');
          await env.DB.prepare(
            `UPDATE media_slots SET published_value = draft_value, status = 'published', updated_at = CURRENT_TIMESTAMP WHERE slot_key = ?`
          ).bind(slotKey).run();

          const slot = await env.DB.prepare('SELECT * FROM media_slots WHERE slot_key = ?').bind(slotKey).first();
          return json({ success: true, message: `Slot ${slotKey} published`, slot: normalizeMediaSlot(slot) });
        }

        if (pathname === '/api/admin/media-slots/publish-all' && request.method === 'POST') {
          if (!isContentManager) {
            return json({ error: 'Forbidden' }, 403);
          }
          await env.DB.prepare(
            `UPDATE media_slots SET published_value = draft_value, status = 'published', updated_at = CURRENT_TIMESTAMP WHERE status = 'draft_saved'`
          ).run();

          const slots = await env.DB.prepare('SELECT * FROM media_slots').all();
          const normalized: Record<string, any> = {};
          for (const s of slots.results || []) {
            const n = normalizeMediaSlot(s);
            if (n) normalized[n.slotKey] = n;
          }
          return json({ success: true, message: 'All slots published', count: slots.results?.length ?? 0, mediaSlots: normalized });
        }

        // EMAIL NOTIFICATIONS STATUS & LOGS (PHASE 3B)
        if (pathname === '/api/admin/email-status' && request.method === 'GET') {
          return json({
            enabled: env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
            provider: 'resend',
            apiKeyConfigured: Boolean(env.RESEND_API_KEY && env.RESEND_API_KEY.trim()),
            fromAddressConfigured: Boolean(env.NOTIFICATION_FROM_EMAIL && env.NOTIFICATION_FROM_EMAIL.trim()),
            adminUrlConfigured: Boolean(env.ADMIN_APP_URL && env.ADMIN_APP_URL.trim())
          });
        }

        // TURNSTILE STATUS (PHASE 3C)
        if (pathname === '/api/admin/turnstile-status' && request.method === 'GET') {
          const isTestSecret = env.TURNSTILE_SECRET_KEY?.startsWith('1x0000000000000000000000000000000AA') || false;
          const enabled = env.TURNSTILE_ENABLED === 'true';
          const secretConfigured = Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SECRET_KEY.trim());
          const hostnameConfigured = Boolean(env.TURNSTILE_ALLOWED_HOSTNAMES && env.TURNSTILE_ALLOWED_HOSTNAMES.trim());
          const ready = enabled && secretConfigured && (isTestSecret || hostnameConfigured);

          return json({
            enabled,
            secretConfigured,
            hostnameConfigured,
            ready
          });
        }

        if (pathname === '/api/admin/notification-logs' && request.method === 'GET') {
          if (!isEnquiryManager) {
            return json({ error: 'Forbidden: Enquiry Manager or Super Admin role required' }, 403);
          }
          const logs = await env.DB.prepare(
            `SELECT id, channel, provider, event_type, entity_id, recipient, status, provider_message_id, error_code, error_message, created_at, updated_at
             FROM notification_delivery_logs
             ORDER BY created_at DESC
             LIMIT 100`
          ).all();
          return json({ success: true, logs: logs.results || [] });
        }

        if (pathname === '/api/admin/email-test' && request.method === 'POST') {
          if (!isSuperAdmin) {
            return json({ error: 'Forbidden: Super Administrator access required' }, 403);
          }
          const body = (await request.json().catch(() => ({}))) as any;
          const formKey = body.formKey;
          if (!['appointmentForm', 'contactForm', 'secondOpinionForm'].includes(formKey)) {
            return json({ error: 'Invalid formKey specified' }, 400);
          }

          const recipient = await getFormNotificationEmail(env, formKey);
          if (!recipient) {
            return json({ error: 'No valid notification email configured for this form in CMS settings' }, 400);
          }

          if (!env.RESEND_API_KEY || !env.RESEND_API_KEY.trim()) {
            return json({ error: 'RESEND_API_KEY is not configured on the server' }, 400);
          }
          if (!env.NOTIFICATION_FROM_EMAIL || !env.NOTIFICATION_FROM_EMAIL.trim()) {
            return json({ error: 'NOTIFICATION_FROM_EMAIL is not configured on the server' }, 400);
          }

          const fromAddress = env.NOTIFICATION_FROM_EMAIL.trim();
          if (!isValidEmailAddress(fromAddress)) {
            return json({ error: 'Invalid NOTIFICATION_FROM_EMAIL format on the server' }, 400);
          }

          const testEntityId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const testEventType = formKey === 'appointmentForm' ? 'appointment' : formKey === 'secondOpinionForm' ? 'second_opinion' : 'contact';
          const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
          const adminUrl = env.ADMIN_APP_URL ? env.ADMIN_APP_URL.trim() : '';

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
              'Authorization': `Bearer ${env.RESEND_API_KEY.trim()}`,
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
            const errorJson = await resendRes.json().catch(() => ({}));
            const statusCode = resendRes.status;
            const errorMsg = (errorJson as any)?.message || (errorJson as any)?.error || `HTTP ${statusCode}`;
            await writeNotificationLog(env, {
              eventType: `test_${testEventType}`,
              entityId: testEntityId,
              recipient,
              status: 'failed',
              errorCode: String(statusCode),
              errorMessage: String(errorMsg)
            });
            return json({ success: false, error: `Resend delivery failed: ${errorMsg}` }, 400);
          }

          const resJson = await resendRes.json().catch(() => ({})) as any;
          const providerMessageId = resJson?.id || undefined;

          await writeNotificationLog(env, {
            eventType: `test_${testEventType}`,
            entityId: testEntityId,
            recipient,
            status: 'sent',
            providerMessageId
          });

          return json({ success: true, message: 'Test notification sent successfully', providerMessageId });
        }
      }

      return json({ error: 'Endpoint not found', path: pathname }, 404);
    } catch (err: any) {
      return json({ error: err.message || 'Worker Internal Server Error' }, 500);
    }
  }
};
