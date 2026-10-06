-- 014_finish_genuine_content_cleanup.sql

-- 1. Clear placeholder contact values
UPDATE site_settings SET value = '' WHERE key = 'defaultPhone' AND value = '+91 98765 43210';
UPDATE site_settings SET value = '' WHERE key = 'defaultWhatsapp' AND value = '+91 98765 43210';
UPDATE site_settings SET value = '' WHERE key = 'defaultEmail' AND value = 'drbhushanparmar@gmail.com';
UPDATE site_settings SET value = '' WHERE key = 'maintenanceMessage' AND value = 'Our website is undergoing scheduled medical directory updates. For immediate OPD appointments, please call +91 98141 23456.';

-- 2. Disable announcement if it contains the seeded claim
UPDATE site_settings 
SET value = json_object('enabled', 0, 'text', '', 'ctaText', '', 'ctaUrl', ''),
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'announcementBar'
AND json_extract(value, '$.text') = 'Now Available for In-Person & Hybrid Video Second Opinions across Punjab, Haryana, Himachal & J&K.';

-- 3. Clear tracking/analytics placeholders
UPDATE site_settings
SET value = json_set(value, '$.googleAnalyticsId', '', '$.googleSearchConsole', ''),
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'seoGlobalConfig'
AND json_valid(value)
AND (json_extract(value, '$.googleAnalyticsId') = 'G-ONCOLOGY778' OR json_extract(value, '$.googleSearchConsole') = 'gsc-verification-code-bhushan-parmar');

-- 4. Clear stock doctor image references in media_slots (D1)
UPDATE media_slots
SET published_value = '', draft_value = '', status = 'unsaved', updated_at = CURRENT_TIMESTAMP
WHERE slot_key IN ('slot-hero-doctor', 'slot-hero-doctor-mobile', 'slot-about-doctor', 'slot-about-doctor-mobile', 'slot-second-opinion-doctor', 'slot-final-cta-doc', 'slot-final-cta-mobile')
AND (published_value LIKE 'https://images.unsplash.com/%' OR draft_value LIKE 'https://images.unsplash.com/%');

-- 5. Clear stock image references in homepage JSON
UPDATE site_settings SET value = json_set(value, '$.doctorHeroImage', '') WHERE key = 'homepage_hero' AND json_extract(value, '$.doctorHeroImage') LIKE 'https://images.unsplash.com/%';
UPDATE site_settings SET value = json_set(value, '$.aboutDoctorImage', '') WHERE key = 'homepage_about' AND json_extract(value, '$.aboutDoctorImage') LIKE 'https://images.unsplash.com/%';
UPDATE site_settings SET value = json_set(value, '$.secondOpinionImage', '') WHERE key = 'homepage_second_opinion' AND json_extract(value, '$.secondOpinionImage') LIKE 'https://images.unsplash.com/%';
UPDATE site_settings SET value = json_set(value, '$.finalCtaImage', '') WHERE key = 'homepage_final_cta' AND json_extract(value, '$.finalCtaImage') LIKE 'https://images.unsplash.com/%';

-- 6. Clean doctor profile
UPDATE doctor_profile
SET memberships = '[]',
    qualifications = json_array(
        json_object('degree', 'MD – Clinical Oncology & Radiation Therapy', 'institution', ''),
        json_object('degree', 'Senior Residency – Oncology', 'institution', 'PGIMER'),
        json_object('degree', 'DrNB – Medical Oncology', 'institution', '')
    ),
    full_bio = '[]',
    bio_summary = 'Dr. Bhushan Parmar is a Senior Consultant in Medical Oncology with 10+ years of oncology experience. His training includes DrNB in Medical Oncology, Senior Residency at PGIMER, and MD in Clinical Oncology & Radiation Therapy.',
    updated_at = CURRENT_TIMESTAMP;

-- 7. Remove unverified footer social links
UPDATE footer_config
SET social_links = '{}'
WHERE social_links LIKE '%linkedin.com/in/drbhushanparmar%';
