ALTER TABLE navigation_items
ADD COLUMN is_external BOOLEAN DEFAULT 0;

ALTER TABLE navigation_items
ADD COLUMN open_in_new_tab BOOLEAN DEFAULT 0;

ALTER TABLE footer_config
ADD COLUMN phone TEXT;

ALTER TABLE footer_config
ADD COLUMN whatsapp TEXT;

ALTER TABLE footer_config
ADD COLUMN email TEXT;

ALTER TABLE footer_config
ADD COLUMN address TEXT;

ALTER TABLE footer_config
ADD COLUMN medical_disclaimer TEXT;

ALTER TABLE footer_config
ADD COLUMN privacy_policy_link TEXT;

ALTER TABLE footer_config
ADD COLUMN footer_cta JSON;
