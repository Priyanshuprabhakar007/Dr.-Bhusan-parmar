-- Migration 017: Create notification delivery logs table
-- Tracks transactional staff email notifications via Resend without storing sensitive patient data

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'email',
  provider TEXT NOT NULL DEFAULT 'resend',
  event_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  recipient TEXT,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_entity
ON notification_delivery_logs(entity_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status
ON notification_delivery_logs(status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created
ON notification_delivery_logs(created_at);
