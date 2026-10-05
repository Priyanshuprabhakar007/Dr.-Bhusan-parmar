-- Migration 011: Add consultation_type to enquiries table
-- Database: dr-bhushan-cms (Cloudflare D1)

ALTER TABLE enquiries ADD COLUMN consultation_type TEXT;
