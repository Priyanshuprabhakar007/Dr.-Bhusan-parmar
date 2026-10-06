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
  PUBLIC_MEDIA_URL: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGIN?: string;
  ALLOWED_ORIGINS?: string;
  TURNSTILE_SECRET_KEY?: string;
}

const PASSWORD_PBKDF2_ITERATIONS = 100000;

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
        const storageKey = pathname.replace('/api/public/media/', '');
        const object = await env.PUBLIC_MEDIA.get(storageKey);
        if (!object) return json({ error: 'Media asset not found in R2' }, 404);
        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        if (object.httpEtag) headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return new Response(object.body, { headers });
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
          env.DB.prepare('SELECT * FROM navigation_items WHERE is_visible = 1 ORDER BY display_order ASC').all(),
          env.DB.prepare('SELECT * FROM footer_config LIMIT 1').first()
        ]);

        const siteSettings: Record<string, any> = {};
        for (const row of settingsRes.results || []) {
          try { siteSettings[row.key] = JSON.parse(row.value); } catch { siteSettings[row.key] = row.value; }
        }

        const mediaSlots: Record<string, any> = {};
        const publicDomain = (env.PUBLIC_MEDIA_URL || 'https://media.drbhushanparmar.com').replace(/\/$/, '');

        for (const slot of slotsRes.results || []) {
          const norm = normalizeMediaSlot(slot);
          if (norm) {
            let pubVal = norm.publishedValue;
            if (pubVal && (pubVal.startsWith('med-') || !pubVal.startsWith('http'))) {
              const mediaRow = await env.DB.prepare('SELECT public_url FROM media WHERE id = ? OR storage_key = ?').bind(pubVal, pubVal).first<any>();
              if (mediaRow?.public_url) {
                pubVal = mediaRow.public_url;
              } else {
                pubVal = `${publicDomain}/${pubVal}`;
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
        }

        const heroContent = siteSettings['homepage_hero'] || siteSettings['heroContent'] || {};
        const aboutDoctorContent = siteSettings['homepage_about'] || siteSettings['aboutDoctorContent'] || {};
        const secondOpinionContent = siteSettings['homepage_second_opinion'] || siteSettings['secondOpinionContent'] || {};
        const finalCtaContent = siteSettings['homepage_final_cta'] || siteSettings['finalCtaContent'] || {};
        const heroAnimationSettings = siteSettings['homepage_animations'] || siteSettings['heroAnimationSettings'] || {};
        const globalAnimationSettings = siteSettings['homepage_global_animations'] || siteSettings['globalAnimationSettings'] || {};
        const howCanWeHelp = siteSettings['homepage_how_can_we_help'] || [];
        const treatmentJourney = siteSettings['homepage_treatment_journey'] || [];

        return json({
          success: true,
          isPreview: isPreviewRequest,
          siteSettings,
          doctorProfile,
          heroContent,
          aboutDoctorContent,
          secondOpinionContent,
          finalCtaContent,
          heroAnimationSettings,
          globalAnimationSettings,
          howCanWeHelp,
          treatmentJourney,
          homepageSections: sectionsRes.results || [],
          cancers: cancerCareRes.results || [],
          cancerCategories: categoriesRes.results || [],
          treatments: treatmentsRes.results || [],
          bodyExplorerRegions: bodyExplorerRes.results || [],
          locations: locationsRes.results || [],
          blogPosts: blogsRes.results || [],
          faqs: faqsRes.results || [],
          testimonials: testimonialsRes.results || [],
          navigationMenu: navRes.results || [],
          footerConfig: footerRes || {},
          mediaSlots
        });
      }

      // PUBLIC SUBMISSIONS
      if (pathname === '/api/public/enquiries' && request.method === 'POST') {
        if (isRateLimited(clientIp, 15, 600000)) return json({ error: 'Submission limit reached.' }, 429);
        const body = (await request.json().catch(() => ({}))) as any;
        if (!body.name || (!body.phone && !body.email)) return json({ error: 'Name and contact info required' }, 400);

        const id = `enq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await env.DB.prepare(
          `INSERT INTO enquiries (id, type, name, phone, email, preferred_date, preferred_time, location_id, cancer_type, consultation_type, message, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          body.type || 'general',
          body.name.trim(),
          body.phone?.trim() || '',
          body.email?.trim() || '',
          body.preferredDate || body.preferred_date || '',
          body.preferredTime || body.preferred_time || '',
          body.locationId || body.location_id || '',
          body.cancerType || body.cancer_type || '',
          body.consultationType || body.consultation_type || '',
          body.message || '',
          'new'
        ).run();

        return json({ success: true, message: 'Enquiry received', enquiryId: id }, 201);
      }

      if (pathname === '/api/public/second-opinion' && request.method === 'POST') {
        if (isRateLimited(clientIp, 10, 600000)) return json({ error: 'Submission limit reached.' }, 429);
        const body = (await request.json().catch(() => ({}))) as any;
        if (!body.patient_name && !body.patientName) return json({ error: 'Patient name required' }, 400);

        const id = body.id || body.requestId || `so-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await env.DB.prepare(
          `INSERT INTO second_opinion_requests (id, patient_name, phone, email, city, country, cancer_type, stage, current_treatment, specific_questions, urgency, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          body.patientName || body.patient_name || '',
          body.phone || '',
          body.email || '',
          body.city || '',
          body.country || 'India',
          body.cancerType || body.cancer_type || '',
          body.stage || '',
          body.currentTreatment || body.current_treatment || '',
          body.specificQuestions || body.specific_questions || body.message || '',
          body.urgency || 'routine',
          'new'
        ).run();

        if (Array.isArray(body.fileIds) && body.fileIds.length > 0) {
          for (const fileId of body.fileIds) {
            await env.DB.prepare('UPDATE second_opinion_files SET request_id = ? WHERE id = ?').bind(id, fileId).run();
          }
        }

        return json({ success: true, message: 'Second opinion request recorded', requestId: id }, 201);
      }

      if (pathname === '/api/public/second-opinion/upload-report' && request.method === 'POST') {
        if (isRateLimited(clientIp, 20, 600000)) return json({ error: 'Upload rate limit exceeded.' }, 429);
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const requestId = (formData.get('requestId') as string) || (formData.get('request_id') as string) || `req-${Date.now()}`;
        const fileType = (formData.get('fileType') as string) || 'biopsy';

        if (!file) return json({ error: 'No file provided' }, 400);

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
            if (['new', 'pending', 'pending_review', 'under_review'].includes(lower)) dbStatus = 'new';
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
            homepageData.sections = sectionsRes.results || [];
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
                await env.DB.prepare(
                  `UPDATE homepage_sections
                   SET is_visible = ?, display_order = ?, title = COALESCE(?, title), subtitle = COALESCE(?, subtitle), content = COALESCE(?, content), updated_at = CURRENT_TIMESTAMP
                   WHERE id = ? OR section_key = ?`
                ).bind(
                  sec.visible !== false && sec.is_visible !== false ? 1 : 0,
                  sec.order || sec.display_order || 0,
                  sec.title || null,
                  sec.subtitle || null,
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
            return json({ success: true, navigation: nav.results });
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
            const footer = await env.DB.prepare('SELECT * FROM footer_config LIMIT 1').first();
            return json({ success: true, footer });
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
          return json({ success: true, count: results.results?.length ?? 0, media: results.results });
        }

        if (pathname === '/api/admin/media/upload' && request.method === 'POST') {
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

          const category = (formData.get('category') as string) || 'Doctor Photos';
          const subfolder = (formData.get('subfolder') as string) || '';
          const altText = (formData.get('alt_text') as string) || '';
          const isDecorative = formData.get('is_decorative') === 'true' ? 1 : 0;
          const width = Number(formData.get('width')) || null;
          const height = Number(formData.get('height')) || null;

          const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
          const timestamp = Date.now().toString(36);
          const randomStr = Math.random().toString(36).substring(2, 8);
          const cleanCat = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const cleanSub = subfolder ? `${subfolder.toLowerCase().replace(/[^a-z0-9]/g, '-')}/` : '';
          const storageKey = `website/${cleanCat}/${cleanSub}${timestamp}-${randomStr}.${ext}`;

          const arrayBuffer = await file.arrayBuffer();
          await env.PUBLIC_MEDIA.put(storageKey, arrayBuffer, {
            httpMetadata: { contentType: file.type || 'image/webp' },
            customMetadata: { originalName: file.name, category }
          });

          const publicDomain = (env.PUBLIC_MEDIA_URL || 'https://media.drbhushanparmar.com').replace(/\/$/, '');
          const publicUrl = `${publicDomain}/${storageKey}`;
          const mediaId = `med-${Date.now()}-${randomStr}`;

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
        }

        if (pathname.startsWith('/api/admin/media/usage/')) {
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

          await env.PUBLIC_MEDIA.delete(item.storage_key);
          await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
          return json({ success: true, message: 'Media removed from R2 and D1' });
        }

        // MEDIA SLOTS
        if (pathname === '/api/admin/media-slots' && request.method === 'GET') {
          const slots = await env.DB.prepare('SELECT * FROM media_slots ORDER BY section ASC').all();
          const slotMap: Record<string, any> = {};
          for (const s of slots.results || []) {
            const norm = normalizeMediaSlot(s);
            if (norm) slotMap[norm.slotKey] = norm;
          }
          return json({ success: true, mediaSlots: slotMap });
        }

        if (pathname.startsWith('/api/admin/media-slots/') && !pathname.endsWith('/publish') && request.method === 'PUT') {
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
          const slotKey = pathname.replace('/api/admin/media-slots/', '').replace('/publish', '');
          await env.DB.prepare(
            `UPDATE media_slots SET published_value = draft_value, status = 'published', updated_at = CURRENT_TIMESTAMP WHERE slot_key = ?`
          ).bind(slotKey).run();

          const slot = await env.DB.prepare('SELECT * FROM media_slots WHERE slot_key = ?').bind(slotKey).first();
          return json({ success: true, message: `Slot ${slotKey} published`, slot: normalizeMediaSlot(slot) });
        }

        if (pathname === '/api/admin/media-slots/publish-all' && request.method === 'POST') {
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
      }

      return json({ error: 'Endpoint not found', path: pathname }, 404);
    } catch (err: any) {
      return json({ error: err.message || 'Worker Internal Server Error' }, 500);
    }
  }
};
