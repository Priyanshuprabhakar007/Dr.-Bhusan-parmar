-- migration 015_finalize_production_content_cleanup.sql

UPDATE site_settings
SET value = '',
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'defaultPhone'
AND value = '+91 98141 23456';

UPDATE site_settings
SET value = '',
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'defaultWhatsapp'
AND value = '+91 98141 23456';

UPDATE site_settings
SET value = '',
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'defaultEmail'
AND value = 'drbhushanparmar@gmail.com';

UPDATE footer_config
SET phone = ''
WHERE phone = '+91 98141 23456';

UPDATE footer_config
SET whatsapp = ''
WHERE whatsapp = '+91 98141 23456';

UPDATE footer_config
SET email = ''
WHERE email = 'drbhushanparmar@gmail.com';

UPDATE footer_config
SET address = ''
WHERE address LIKE '%Max Super Speciality Hospital%'
  AND address LIKE '%Phase 6%'
  AND address LIKE '%Sector 56%'
  AND address LIKE '%Mohali%';
