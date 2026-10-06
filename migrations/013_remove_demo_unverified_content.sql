-- 013_remove_demo_unverified_content.sql

-- 1. Remove fabricated testimonials
DELETE FROM testimonials
WHERE id IN ('review-1','review-2','review-3','review-4');

-- 2. Disable demo location records
UPDATE locations
SET is_active = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN ('loc-1','loc-2');

-- 3. Unpublish synthetic doctor-authored blogs
UPDATE blogs
SET is_published = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN ('blog-1','blog-2','blog-3');

-- 4. Unpublish seeded FAQs
UPDATE faqs
SET is_published = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  'faq-1','faq-2','faq-3','faq-4',
  'faq-5','faq-6','faq-7','faq-8'
);
