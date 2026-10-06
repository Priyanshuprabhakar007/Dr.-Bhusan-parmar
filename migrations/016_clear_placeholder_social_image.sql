-- migration 016_clear_placeholder_social_image.sql

UPDATE site_settings
SET value = json_set(value, '$.defaultSocialImage', ''),
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'seoGlobalConfig'
AND json_valid(value)
AND json_extract(value, '$.defaultSocialImage') LIKE 'https://images.unsplash.com/%';

UPDATE media_slots
SET published_value = '',
    draft_value = '',
    status = 'unsaved',
    updated_at = CURRENT_TIMESTAMP
WHERE slot_key = 'slot-og-social'
AND (
  published_value LIKE 'https://images.unsplash.com/%'
  OR draft_value LIKE 'https://images.unsplash.com/%'
);
