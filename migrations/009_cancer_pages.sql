-- Migration 009: Cancer Pages Schema
-- Database: dr-bhushan-cms (Cloudflare D1)

CREATE TABLE IF NOT EXISTS cancer_pages (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  h1 TEXT,
  meta_description TEXT,
  intro TEXT,
  why_choose JSON,
  services JSON,
  clinical_focus TEXT,
  status TEXT DEFAULT 'published',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
