-- Migration 010: Initial Content Seed (Idempotent)
-- Database: dr-bhushan-cms (Cloudflare D1)

-- 1. Site Settings
INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES
('websiteName', '{"value":"Dr. Bhushan Parmar – Senior Medical Oncologist"}', CURRENT_TIMESTAMP),
('siteUrl', '{"value":"https://drbhushanparmar.com"}', CURRENT_TIMESTAMP),
('logoText', '{"value":"Dr. Bhushan Parmar"}', CURRENT_TIMESTAMP),
('doctorTitle', '{"value":"Senior Consultant Medical Oncologist"}', CURRENT_TIMESTAMP),
('favicon', '{"value":"/favicon.ico"}', CURRENT_TIMESTAMP),
('primaryColor', '{"value":"#073F3D"}', CURRENT_TIMESTAMP),
('secondaryColor', '{"value":"#149A96"}', CURRENT_TIMESTAMP),
('accentColor', '{"value":"#18B8B4"}', CURRENT_TIMESTAMP),
('defaultPhone', '{"value":"+91 98141 23456"}', CURRENT_TIMESTAMP),
('defaultWhatsapp', '{"value":"+91 98141 23456"}', CURRENT_TIMESTAMP),
('defaultEmail', '{"value":"drbhushanparmar@gmail.com"}', CURRENT_TIMESTAMP),
('emergencyNotice', '{"value":"Emergency Notice: For acute oncological complications, severe neutropenic fever (>100.4°F), or sudden breathlessness, report immediately to your nearest 24x7 hospital Emergency Department."}', CURRENT_TIMESTAMP),
('maintenanceMode', 'false', CURRENT_TIMESTAMP),
('maintenanceMessage', '{"value":"Our website is undergoing scheduled medical directory updates. For immediate OPD appointments, please call +91 98141 23456."}', CURRENT_TIMESTAMP),
('homepage_hero', '{"smallLabel":"MEDICAL ONCOLOGY • PERSONALIZED CANCER CARE","mainHeading":"Personalized Cancer Care.","highlightedHeading":"Evidence-Based Treatment.","subHeading":"Compassion at Every Step.","description":"Senior Consultant Medical Oncology with 10+ years of dedicated experience across premier cancer centers. Specializing in precision oncology, targeted therapy, immunotherapy, and blood cancers with clinical empathy.","primaryCtaLabel":"Book Consultation","primaryCtaUrl":"#appointment","secondaryCtaLabel":"Explore Care Options","secondaryCtaUrl":"#cancers","doctorHeroImage":"https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1600&q=85","doctorHeroFocalPoint":"70% 25%","doctorHeroAltText":"Dr. Bhushan Parmar, Senior Consultant Medical Oncology standing in clinical suite","heroOverlayStrength":85}', CURRENT_TIMESTAMP),
('homepage_about', '{"smallLabel":"MEET YOUR ONCOLOGIST","mainHeading":"Experience, evidence and compassionate cancer care","subHeading":"Bridging cutting-edge oncology science with deeply personalized patient support.","aboutDoctorImage":"https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=1200&q=85","aboutDoctorFocalPoint":"50% 20%","aboutDoctorAltText":"Dr. Bhushan Parmar - Compassionate and evidence-based oncology care","quote":"“No two cancer journeys are identical. Our commitment is delivering precise, biomarker-guided therapies while standing firmly by our patients with clarity and genuine empathy.”","ctaLabel":"View Full Medical Credentials"}', CURRENT_TIMESTAMP),
('homepage_second_opinion', '{"smallLabel":"EXPERT ONCOLOGY REVIEW","mainHeading":"A second opinion can bring clarity","description":"If you already have a diagnosis or treatment plan, you can request a review of your reports before deciding your next step. Confirm your staging, explore molecular therapies, and gain peace of mind.","secondOpinionImage":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=85","secondOpinionFocalPoint":"60% 45%","secondOpinionAltText":"Physician examining diagnostic scans, pathology reports and second opinion oncology documentation","secondOpinionOverlayStrength":85,"primaryCtaLabel":"Get a Second Opinion","secondaryCtaLabel":"Required Reports Checklist"}', CURRENT_TIMESTAMP),
('homepage_final_cta', '{"smallLabel":"SPECIALIST MEDICAL ONCOLOGY","mainHeading":"Need guidance about your cancer treatment?","description":"Schedule a consultation or request a second opinion. Receive thoughtful, evidence-based recommendations tailored to your diagnosis.","primaryCtaLabel":"Book Consultation","secondaryCtaLabel":"Get Second Opinion","finalCtaImage":"https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=85","finalCtaAltText":"Dr. Bhushan Parmar, Senior Consultant Medical Oncology"}', CURRENT_TIMESTAMP),
('homepage_animations', '{"headingAnimation":"mask","doctorImageAnimation":"clip","credentialAnimation":"stagger","globalSpeed":"normal","enableHeroAnimations":true}', CURRENT_TIMESTAMP),
('homepage_global_animations', '{"enabled":true,"intensity":"standard","marquee":{"enabled":true,"speed":"normal","direction":"left","phrases":["Personalized Cancer Care","Precision Oncology & Biomarker Profiling","Evidence-Based Chemotherapy","Next-Gen Immunotherapy","Compassionate Cancer Management"]}}', CURRENT_TIMESTAMP),
('homepage_how_can_we_help', '[{"id":"help-1","title":"New Cancer Diagnosis","description":"Clear, compassionate guidance to understand your biopsy report, staging scans, and recommended medical oncology treatment plan without overwhelm.","image":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80","iconName":"ClipboardList","ctaLabel":"Schedule Consultation","ctaLink":"#appointment","show":true,"order":1},{"id":"help-2","title":"Need a Second Opinion","description":"Independent expert evaluation of pathology, molecular profiling, and systemic therapy protocols before initiating or changing your chemotherapy.","image":"https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80","iconName":"FileCheck","ctaLabel":"Request Second Opinion","ctaLink":"#second-opinion","show":true,"order":2},{"id":"help-3","title":"Already Under Treatment","description":"Ongoing chemotherapy supervision, toxicity mitigation, response re-evaluation scans, and transition to maintenance targeted therapy.","image":"https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80","iconName":"HeartHandshake","ctaLabel":"Continue Care","ctaLink":"#appointment","show":true,"order":3}]', CURRENT_TIMESTAMP),
('homepage_treatment_journey', '[{"id":"step-1","number":"01","title":"Clinical Consultation","shortDescription":"In-depth assessment of medical history, current symptoms, prior interventions, and baseline organ function.","iconName":"Users","enabled":true,"order":1},{"id":"step-2","number":"02","title":"Comprehensive Report Review","shortDescription":"Critical re-examination of tissue pathology, IHC markers, and radiology imaging by experienced oncology eyes.","iconName":"FileText","enabled":true,"order":2},{"id":"step-3","number":"03","title":"Molecular Profiling & Staging","shortDescription":"Next-generation sequencing and PET-CT staging to uncover actionable genetic mutations and disease extent.","iconName":"Layers","enabled":true,"order":3},{"id":"step-4","number":"04","title":"Treatment Protocol Design","shortDescription":"Formulating personalized regimens—targeted therapy, immunotherapy, or chemotherapy—tailored to the patient.","iconName":"Cpu","enabled":true,"order":4},{"id":"step-5","number":"05","title":"Systemic Therapy Delivery","shortDescription":"Safe, monitored outpatient or inpatient infusion in dedicated oncology daycare suites with supportive premedications.","iconName":"Activity","enabled":true,"order":5},{"id":"step-6","number":"06","title":"Response & Toxicity Monitoring","shortDescription":"Regular interval imaging, blood counts, and proactive management of side effects to preserve quality of life.","iconName":"CheckCircle2","enabled":true,"order":6},{"id":"step-7","number":"07","title":"Long-Term Survivorship & Follow-Up","shortDescription":"Structured surveillance protocols and maintenance strategies to detect recurrence early and support wellness.","iconName":"Shield","enabled":true,"order":7}]', CURRENT_TIMESTAMP);

-- 2. Doctor Profile
INSERT OR IGNORE INTO doctor_profile (
  id, name, speciality, positioning, experience_years, tagline, hero_headline, hero_subheadline,
  bio_summary, full_bio, photo_url, qualifications, core_expertise, memberships, updated_at
) VALUES (
  'doc-1',
  'Dr. Bhushan Parmar',
  'Medical Oncology / Onco Sciences',
  'Senior Consultant – Medical Oncology',
  '10+',
  'Personalized Cancer Care. Evidence-Based Treatment. Compassion at Every Step.',
  'Personalized Cancer Care.\nEvidence-Based Treatment.\nCompassion at Every Step.',
  'Advanced medical oncology care for solid tumors and blood cancers with personalized treatment planning using modern systemic therapies, targeted drugs, and immunotherapy.',
  'Dr. Bhushan Parmar is a distinguished Senior Consultant in Medical Oncology with over a decade of dedicated clinical experience in diagnosing and treating solid tumors and hematological malignancies.',
  '["Dr. Bhushan Parmar completed his MBBS from Indira Gandhi Government Medical College, Shimla, followed by his MD in Clinical Oncology & Radiation Therapy from the Regional Cancer Centre, IGMC Shimla.", "To achieve the highest tier of super-specialization, Dr. Parmar attained his DrNB in Medical Oncology from the acclaimed Rajiv Gandhi Cancer Institute & Research Centre, Delhi.", "His clinical philosophy centers on the conviction that no two cancers—and no two patients—are identical.", "A steadfast proponent of responsible oncological communication, he takes the time to thoroughly explain diagnosis, realistic therapeutic goals, and supportive measures."]',
  '',
  '[{"degree":"MBBS","institution":"Indira Gandhi Government Medical College, Shimla","period":"Graduation","description":"Foundational clinical training and comprehensive medical education with distinction."},{"degree":"MD – Clinical Oncology & Radiation Therapy","institution":"Regional Cancer Centre, IGMC Shimla","period":"Postgraduate","description":"Specialized clinical training in oncology principles, tumor biology, and systemic therapeutics."},{"degree":"Senior Residency in Oncology","institution":"PGIMER Chandigarh","period":"Super-Specialty Residency","description":"Extensive clinical tenure at one of Northern India’s premier tertiary medical research centers."},{"degree":"DrNB – Medical Oncology","institution":"Rajiv Gandhi Cancer Institute & Research Centre, Delhi","period":"Super-Specialty Doctorate","description":"Advanced fellowship focusing on precision oncology, targeted inhibitors, and immunotherapy."}]',
  '["Medical Oncology & Systemic Protocols", "Chemotherapy & Neoadjuvant / Adjuvant Therapy", "Targeted Therapy & Kinase Inhibitors", "Immunotherapy & Checkpoint Inhibitors", "Precision Oncology & Molecular Diagnostics", "Solid Tumor Comprehensive Care", "Lymphomas (Hodgkin & Non-Hodgkin)", "Multiple Myeloma & Plasma Cell Disorders", "Blood Malignancies (Leukemias, MDS)", "Evidence-Based Cancer Screening", "Management of Oncological Emergencies"]',
  '["European Society for Medical Oncology (ESMO)", "American Society of Clinical Oncology (ASCO)", "Indian Society of Medical & Paediatric Oncology (ISMPO)", "Association of Physicians of India (API)"]',
  CURRENT_TIMESTAMP
);

-- 3. Homepage Sections
INSERT OR IGNORE INTO homepage_sections (id, section_key, title, subtitle, content, is_visible, display_order, updated_at) VALUES
('sec-hero', 'sec-hero', 'Hero Banner', 'Hero section', NULL, 1, 1, CURRENT_TIMESTAMP),
('sec-marquee', 'sec-marquee', 'Editorial Marquee', 'Marquee banner', NULL, 1, 2, CURRENT_TIMESTAMP),
('sec-intro', 'sec-intro', 'Practice Introduction', 'Introduction', NULL, 1, 3, CURRENT_TIMESTAMP),
('sec-about', 'sec-about', 'Doctor Biography & Qualifications', 'About Doctor', NULL, 1, 4, CURRENT_TIMESTAMP),
('sec-how-help', 'sec-how-help', 'How Can We Help? (Patient Cards)', 'How Can We Help', NULL, 1, 5, CURRENT_TIMESTAMP),
('sec-cancers', 'sec-cancers', 'Cancer Care Catalog', 'Cancer Care', NULL, 1, 6, CURRENT_TIMESTAMP),
('sec-body-explorer', 'sec-body-explorer', 'Interactive Body Area Explorer', 'Body Explorer', NULL, 1, 7, CURRENT_TIMESTAMP),
('sec-treatments', 'sec-treatments', 'Medical Oncology Treatments', 'Treatments', NULL, 1, 8, CURRENT_TIMESTAMP),
('sec-typography', 'sec-typography', 'Oversized Typography Watermark', 'Typography', NULL, 1, 9, CURRENT_TIMESTAMP),
('sec-journey', 'sec-journey', 'Treatment Journey Timeline', 'Treatment Journey', NULL, 1, 10, CURRENT_TIMESTAMP),
('sec-second-opinion', 'sec-second-opinion', 'Second Opinion Banner', 'Second Opinion', NULL, 1, 11, CURRENT_TIMESTAMP),
('sec-blog', 'sec-blog', 'Patient Education & Resources', 'Patient Education', NULL, 1, 12, CURRENT_TIMESTAMP),
('sec-faqs', 'sec-faqs', 'Frequently Asked Questions', 'FAQs', NULL, 1, 13, CURRENT_TIMESTAMP),
('sec-final-cta', 'sec-final-cta', 'Consultation Final CTA', 'Final CTA', NULL, 1, 14, CURRENT_TIMESTAMP);

-- 4. Cancer Categories
INSERT OR IGNORE INTO cancer_categories (id, name, slug, description, display_order, updated_at) VALUES
('cat-lung', 'Chest & Lung Cancer', 'chest-lung-cancer', 'Comprehensive systemic protocols for NSCLC, SCLC, and thoracic tumors.', 1, CURRENT_TIMESTAMP),
('cat-breast', "Breast & Women's Cancers", 'breast-cancer', 'Tailored oncology protocols according to receptor subtype and genetic risks.', 2, CURRENT_TIMESTAMP),
('cat-gi', 'Gastrointestinal Oncology', 'gastrointestinal-cancer', 'Evidence-based systemic care for colorectal, stomach, pancreas, and liver tumors.', 3, CURRENT_TIMESTAMP),
('cat-hn', 'Head & Neck Oncology', 'head-neck-cancer', 'Organ-preservation protocols for oral cavity, pharyngeal, and laryngeal malignancies.', 4, CURRENT_TIMESTAMP),
('cat-gu', 'Genitourinary Oncology', 'genitourinary-cancer', 'Systemic care for prostate, kidney, bladder, and testicular cancers.', 5, CURRENT_TIMESTAMP),
('cat-blood', 'Hematological Malignancies', 'blood-cancers', 'Systemic management of lymphomas, multiple myeloma, and chronic leukemias.', 6, CURRENT_TIMESTAMP);

-- 5. Cancer Care
INSERT OR IGNORE INTO cancer_care (
  id, name, slug, category, category_id, description, symptoms, diagnosis, treatments, meta_title, meta_description, display_order, status, updated_at
) VALUES
('breast-cancer', 'Breast Cancer', 'breast-cancer', 'Solid Tumor', 'cat-breast', 'Personalized systemic therapy protocols based on ER, PR, HER2, Ki-67 status, and genomic risk recurrence profiling.',
 '["Painless lump or thickening in the breast or axilla", "Change in breast shape, size, or skin dimpling", "Nipple inversion, discharge, or localized redness"]',
 '["Digital mammogram and high-resolution breast ultrasound", "Core needle biopsy with immunohistochemistry", "Genomic risk profiling"]',
 '["Neoadjuvant chemotherapy", "Adjuvant endocrine therapy", "Anti-HER2 targeted therapy"]',
 'Breast Cancer Oncologist in Mohali | Dr. Bhushan Parmar', 'Personalized breast cancer care by Senior Medical Oncologist Dr. Bhushan Parmar in Mohali.', 1, 'published', CURRENT_TIMESTAMP),

('lung-cancer', 'Lung Cancer (NSCLC & SCLC)', 'lung-cancer', 'Solid Tumor', 'cat-lung', 'Comprehensive molecular testing for actionable mutations (EGFR, ALK, ROS1, PD-L1) and personalized targeted/immuno-chemotherapy.',
 '["Persistent or worsening cough", "Hemoptysis (coughing up blood)", "Unexplained shortness of breath and chest discomfort"]',
 '["Contrast-enhanced chest CT scan and whole-body PET-CT", "Tissue biopsy via bronchoscopy", "Next-Generation Sequencing (NGS)"]',
 '["Oral targeted tyrosine kinase inhibitors", "Immune checkpoint inhibitors", "Platinum-doublet chemotherapy"]',
 'Lung Cancer Specialist Doctor in Mohali | Dr. Bhushan Parmar', 'Consult Dr. Bhushan Parmar for advanced lung cancer treatment in Mohali.', 2, 'published', CURRENT_TIMESTAMP),

('colorectal-cancer', 'Colorectal Cancer', 'colorectal-cancer', 'Solid Tumor', 'cat-gi', 'Staging-directed systemic protocols combining fluoropyrimidine-based regimens with biologic agents and MSI-H screening.',
 '["Persistent change in bowel habits", "Rectal bleeding or blood in the stool", "Abdominal cramps and fullness"]',
 '["Colonoscopy with tissue biopsy", "Abdominal CT / pelvic MRI", "Testing for KRAS, NRAS, BRAF and MSI/MMR"]',
 '["Adjuvant chemotherapy (FOLFOX / CAPOX)", "Biologic targeted therapies", "Immunotherapy"]',
 'Colorectal Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Expert gastrointestinal oncology and colorectal cancer care.', 3, 'published', CURRENT_TIMESTAMP);

-- 6. Treatments
INSERT OR IGNORE INTO treatments (
  id, title, slug, category, summary, details, benefits, process, display_order, status, updated_at
) VALUES
('chemotherapy-systemic', 'Chemotherapy & Systemic Therapy', 'chemotherapy-systemic', 'Systemic Therapy',
 'Evidence-based systemic medications designed to destroy rapidly dividing cancer cells.',
 'Systemic chemotherapy utilizes pharmacological agents distributed via the bloodstream to reach cancer cells throughout the body.',
 '["Addresses micro-metastatic disease", "Synergizes with radiation", "Standardized international dosing"]',
 '["Outpatient daycare facility monitoring", "Pre-medications for nausea prevention"]',
 1, 'published', CURRENT_TIMESTAMP),

('immunotherapy', 'Immunotherapy', 'immunotherapy', 'Cellular',
 'Innovative biological therapies that empower the patient’s own immune system to recognize and attack cancer cells.',
 'Cancer cells often evade detection by activating immune checkpoint pathways. Immunotherapy releases these brakes.',
 '["Potential for long-term durable responses", "Generally lacks hair loss", "Can be combined with systemic therapy"]',
 '["Intravenous infusion on outpatient schedule", "Regular monitoring for immune-related adverse events"]',
 2, 'published', CURRENT_TIMESTAMP),

('targeted-therapy', 'Targeted Therapy', 'targeted-therapy', 'Targeted',
 'Precision drugs that selectively inhibit specific genetic mutations, proteins, or blood vessel pathways.',
 'Targeted therapies focus on specific molecular vulnerabilities unique to cancer cells.',
 '["High specificity for cancer cells", "Often available in oral formulation", "Manageable toxicity profile"]',
 '["Regular outpatient clinic visits and blood tests"]',
 3, 'published', CURRENT_TIMESTAMP);

-- 7. Body Explorer Regions
INSERT OR IGNORE INTO body_explorer_regions (
  id, label, title, description, cta, hotspot_x, hotspot_y, conditions, treatments, display_order, is_active, updated_at
) VALUES
('chest-lung', 'Chest & Lung', 'Chest & Lung Cancer Care', 'Explore medical oncology care for lung and thoracic cancers.', 'View Specialty', 50.0, 31.0,
 '["Non-Small Cell Lung Cancer", "Small Cell Lung Cancer", "Advanced Thoracic Tumors"]',
 '["Targeted Therapy (EGFR/ALK)", "Immunotherapy", "Systemic Chemotherapy"]', 1, 1, CURRENT_TIMESTAMP),
('head-neck', 'Head & Neck', 'Head & Neck Cancer Care', 'Explore evidence-based systemic oncology protocols for oral cavity and throat tumors.', 'View Specialty', 50.0, 19.0,
 '["Oral Cavity & Tongue Malignancies", "Laryngeal Cancers"]',
 '["Concurrent Chemo-Radiotherapy", "Targeted Monoclonal Antibodies"]', 2, 1, CURRENT_TIMESTAMP),
('breast', 'Breast', 'Breast Cancer Care', 'Personalized cancer care calibrated to receptor status.', 'View Specialty', 55.0, 34.0,
 '["HR+ Breast Cancer", "HER2+ Breast Cancer", "Triple-Negative Breast Cancer"]',
 '["Targeted HER2 Therapy", "CDK4/6 Inhibitors", "Endocrine Therapy"]', 3, 1, CURRENT_TIMESTAMP),
('gastrointestinal', 'Gastrointestinal', 'Gastrointestinal Cancer Care', 'Multidisciplinary systemic oncology for digestive tract tumors.', 'View Specialty', 50.0, 46.0,
 '["Colorectal Cancers", "Stomach & Esophageal Cancers", "Pancreatic Adenocarcinoma"]',
 '["MSI-H Immunotherapy", "VEGF & EGFR Targeted Antibodies"]', 4, 1, CURRENT_TIMESTAMP),
('genitourinary', 'Genitourinary', 'Genitourinary Cancer Care', 'Systemic care pathways for urinary tract and male reproductive organs.', 'View Specialty', 46.0, 55.0,
 '["Prostate Cancer", "Renal Cell Carcinoma", "Urothelial Carcinoma"]',
 '["Androgen Receptor Blockers", "Tyrosine Kinase Inhibitors"]', 5, 1, CURRENT_TIMESTAMP),
('gynecological', 'Gynecological', 'Gynecological Cancer Care', 'Comprehensive medical oncology for female reproductive cancers.', 'View Specialty', 50.0, 63.0,
 '["Ovarian Cancer", "Cervical Cancer", "Endometrial Cancer"]',
 '["PARP Inhibitors", "Anti-Angiogenic Agents"]', 6, 1, CURRENT_TIMESTAMP),
('blood-cancers', 'Blood Cancers', 'Hematological & Blood Cancer Care', 'Systemic management of hematological malignancies.', 'View Specialty', 50.0, 40.0,
 '["Hodgkin & Non-Hodgkin Lymphomas", "Multiple Myeloma", "Leukemias"]',
 '["Monoclonal Antibody Infusions", "Targeted BTK & BCL-2 Inhibitors"]', 7, 1, CURRENT_TIMESTAMP);

-- 8. Locations
INSERT OR IGNORE INTO locations (
  id, hospital_name, department, address_line1, address_line2, city, state, pincode, phone, whatsapp, email, opd_timings, days_available, is_primary, is_active, google_maps_url, display_order, updated_at
) VALUES
('loc-1', 'Max Super Speciality Hospital, Mohali', 'Department of Medical Oncology & Clinical Hematology', 'Near Civil Hospital, Phase 6', 'Sector 56', 'Mohali', 'Punjab', '160055', '+91 98141 23456', '+91 98141 23456', 'drbhushanparmar@gmail.com', '10:00 AM – 04:30 PM', 'Monday to Saturday', 1, 1, 'https://maps.google.com/maps?q=Max+Super+Speciality+Hospital+Mohali', 1, CURRENT_TIMESTAMP),
('loc-2', 'Fortis Hospital, Mohali (Consultant OPD)', 'Medical Oncology OPD Suite', 'Sector 62, Phase VIII', NULL, 'Mohali', 'Punjab', '160062', '+91 98141 23456', '+91 98141 23456', 'drbhushanparmar@gmail.com', '05:00 PM – 07:00 PM', 'Tuesday & Thursday', 0, 1, 'https://maps.google.com/maps?q=Fortis+Hospital+Mohali', 2, CURRENT_TIMESTAMP);

-- 9. Blogs
INSERT OR IGNORE INTO blogs (
  id, title, slug, category, excerpt, content, author, read_time, tags, published_at, is_published, seo_title, seo_description, updated_at
) VALUES
('blog-1', 'Understanding Targeted Therapy in Modern Medical Oncology', 'understanding-targeted-therapy-modern-medical-oncology', 'Targeted Therapy',
 'How precision molecular diagnostics and kinase inhibitors target cancer cell specific mutations while sparing healthy tissue.',
 'Precision oncology has revolutionized the treatment landscape of solid tumors and blood cancers. Unlike traditional chemotherapy which affects rapidly dividing cells indiscriminately, targeted therapies home in on specific proteins or genetic mutations that drive tumor growth.\n\nDr. Bhushan Parmar discusses the importance of comprehensive genomic profiling (CGP) prior to initiating therapy.',
 'Dr. Bhushan Parmar', '5 min read', '["Targeted Therapy", "Precision Oncology", "Genomics"]', '2026-03-10', 1, 'Understanding Targeted Therapy | Dr. Bhushan Parmar Oncology', 'Learn how targeted therapy and precision oncology match cancer treatments to genetic profiles for better clinical outcomes.', CURRENT_TIMESTAMP),

('blog-2', 'What Patients Should Know About Immunotherapy Side Effects', 'what-patients-should-know-about-immunotherapy-side-effects', 'Immunotherapy',
 'A comprehensive guide for patients undergoing checkpoint inhibitor immunotherapy and recognizing immune-related adverse events.',
 'Immunotherapy harnesses the body’s own immune system to recognize and attack cancer cells. While often associated with fewer conventional side effects than chemotherapy, checkpoint inhibitors can prompt immune-mediated responses in healthy organs.\n\nEarly detection and timely management of immune-related adverse events (irAEs) by an experienced medical oncologist are vital for patient safety.',
 'Dr. Bhushan Parmar', '4 min read', '["Immunotherapy", "Side Effects", "Patient Guidance"]', '2026-03-05', 1, 'Immunotherapy Side Effects Guide | Dr. Bhushan Parmar', 'Understand checkpoint inhibitors, potential immune-related side effects, and how your oncology team manages them.', CURRENT_TIMESTAMP);

-- 10. FAQs
INSERT OR IGNORE INTO faqs (id, question, answer, category, display_order, is_published, updated_at) VALUES
('faq-1', 'What is the role of biomarker and genomic testing in cancer treatment?', 'Biomarker and genomic testing (Next-Generation Sequencing) identifies specific genetic mutations or protein expressions within a tumor. This allows Dr. Bhushan Parmar to select targeted therapies or immunotherapies specifically matched to your cancer’s biological signature.', 'General', 1, 1, CURRENT_TIMESTAMP),
('faq-2', 'Is chemotherapy always required for solid tumors?', 'No. Treatment protocols are personalized. Many early-stage cancers or biomarker-specific tumors can be managed effectively with targeted therapy, immunotherapy, endocrine therapy, or surgery without conventional chemotherapy.', 'Treatment', 2, 1, CURRENT_TIMESTAMP),
('faq-3', 'How do I request a second opinion with Dr. Bhushan Parmar?', 'You can submit your biopsy reports, staging scans, and clinical summary securely through our online Second Opinion portal. Dr. Parmar will review your dossier and provide a structured clinical review.', 'Second Opinion', 3, 1, CURRENT_TIMESTAMP);

-- 11. Testimonials
INSERT OR IGNORE INTO testimonials (id, patient_name, cancer_type, treatment_received, feedback, rating, date, is_published, updated_at) VALUES
('test-1', 'Rajesh Sharma', 'Lung Cancer (NSCLC)', 'Targeted Therapy & Immunotherapy', 'Dr. Bhushan Parmar provided exceptional clarity and empathetic care during our most challenging time. His precision approach with targeted therapy has been life-changing.', 5, '2026-08-15', 1, CURRENT_TIMESTAMP),
('test-2', 'Sunita Devi', 'Breast Cancer', 'Neoadjuvant Chemotherapy & Targeted Care', 'We consulted Dr. Parmar for a second opinion at Max Hospital Mohali. His thorough explanation of receptor status and treatment milestones gave us immense confidence.', 5, '2026-08-02', 1, CURRENT_TIMESTAMP);

-- 12. Media Slots (Permanent Valid Slots ONLY - NO anatomy slots)
INSERT OR IGNORE INTO media_slots (slot_key, slot_name, section, target_table, target_field, published_value, draft_value, status, alt_text, mobile_value, updated_at) VALUES
('slot-branding-logo', 'Website Primary Logo', 'Header / Navigation', 'site_settings', 'logoText', '', '', 'published', 'Website Logo', '', CURRENT_TIMESTAMP),
('slot-branding-logo-light', 'Website Light Logo', 'Footer / Dark Backgrounds', 'site_settings', 'logoLight', '', '', 'published', 'Light Logo', '', CURRENT_TIMESTAMP),
('slot-branding-logo-dark', 'Website Dark Logo', 'Header / Light Backgrounds', 'site_settings', 'logoDark', '', '', 'published', 'Dark Logo', '', CURRENT_TIMESTAMP),
('slot-favicon', 'Website Favicon', 'Browser Tab', 'site_settings', 'favicon', '', '', 'published', 'Favicon', '', CURRENT_TIMESTAMP),
('slot-og-social', 'Default Open Graph Social Share Image', 'Social Media Previews', 'seo_global', 'socialImage', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=80', '', 'published', 'Social Preview', '', CURRENT_TIMESTAMP),
('slot-hero-doctor', 'Homepage Hero Doctor Image', 'Hero', 'doctor_profile', 'hero_photo', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=85', '', 'published', 'Dr. Bhushan Parmar Hero Portrait', '', CURRENT_TIMESTAMP),
('slot-about-doctor', 'About Section Doctor Portrait', 'Meet Your Oncologist', 'doctor_profile', 'about_photo', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=1000&q=85', '', 'published', 'Dr. Bhushan Parmar About Portrait', '', CURRENT_TIMESTAMP),
('slot-second-opinion-doctor', 'Second Opinion Doctor Consultation Image', 'Consultation Overview', 'doctor_profile', 'second_opinion_photo', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=1000&q=85', '', 'published', 'Doctor reviewing medical records', '', CURRENT_TIMESTAMP),
('slot-final-cta-doc', 'Final Consultation CTA Doctor Portrait', 'Final CTA', 'doctor_profile', 'cta_photo', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=85', '', 'published', 'Final CTA portrait', '', CURRENT_TIMESTAMP),
('slot-location-primary', 'Primary Clinic Image', 'Primary Location', 'locations', 'image_id', 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80', '', 'published', 'Max Hospital Mohali Clinic', '', CURRENT_TIMESTAMP);

-- 13. Navigation Items
INSERT OR IGNORE INTO navigation_items (id, label, url, display_order, is_visible, updated_at) VALUES
('nav-home', 'Home', '#home', 1, 1, CURRENT_TIMESTAMP),
('nav-about', 'About Dr. Parmar', '#about', 2, 1, CURRENT_TIMESTAMP),
('nav-cancers', 'Cancer Care', '#cancers', 3, 1, CURRENT_TIMESTAMP),
('nav-treatments', 'Treatments', '#treatments', 4, 1, CURRENT_TIMESTAMP),
('nav-journey', 'Treatment Journey', '#journey', 5, 1, CURRENT_TIMESTAMP),
('nav-second-opinion', 'Second Opinion', '#second-opinion', 6, 1, CURRENT_TIMESTAMP),
('nav-blog', 'Patient Guides', '#resources', 7, 1, CURRENT_TIMESTAMP),
('nav-faq', 'FAQs', '#faqs', 8, 1, CURRENT_TIMESTAMP),
('nav-contact', 'Locations', '#locations', 9, 1, CURRENT_TIMESTAMP);

-- 14. Footer Config
INSERT OR IGNORE INTO footer_config (id, about_text, emergency_notice, copyright_text, quick_links, social_links, updated_at) VALUES
('foot-1',
 'Dr. Bhushan Parmar is a Senior Consultant in Medical Oncology with over a decade of specialized experience in systemic chemotherapy, precision oncology, targeted therapy, and hematological malignancies across Punjab, Chandigarh & North India.',
 'Emergency Notice: For acute oncological complications, severe neutropenic fever (>100.4°F), or sudden breathlessness, report immediately to your nearest 24x7 hospital Emergency Department.',
 '© 2026 Dr. Bhushan Parmar. All Rights Reserved.',
 '["#home", "#about", "#cancers", "#treatments", "#second-opinion", "#locations"]',
 '{"linkedin":"https://linkedin.com/in/drbhushanparmar","youtube":"https://youtube.com/@drbhushanparmar-oncology","facebook":"https://facebook.com/drbhushanparmar.oncology","instagram":"https://instagram.com/drbhushanparmar.oncology"}',
 CURRENT_TIMESTAMP
);

-- 15. Cancer Pages
INSERT OR IGNORE INTO cancer_pages (
  id, slug, title, h1, meta_description, intro, why_choose, services, clinical_focus, status, updated_at
) VALUES
('cp-lung', 'lung-cancer', 'Non-Small Cell & Small Cell Lung Cancer', 'Lung Cancer Care & Precision Treatment', 'Consult Dr. Bhushan Parmar for advanced lung cancer treatment in Mohali. Expert in EGFR/ALK targeted therapies, immunotherapy, and chemotherapy.', 'Advanced systemic medical oncology protocols customized to exact mutation profiles and PD-L1 expression.', '["Comprehensive molecular biomarker testing (NGS)", "Personalized targeted therapy and immunotherapy", "Experienced senior oncology care"]', '["Targeted oral tyrosine kinase inhibitors", "Immune checkpoint inhibitors", "Platinum-doublet systemic chemotherapy"]', 'Precision thoracic oncology and molecular biomarker-driven systemic therapy.', 'published', CURRENT_TIMESTAMP),
('cp-breast', 'breast-cancer', 'Breast Cancer Treatment & Receptor Subtypes', 'Breast Cancer Care & Precision Oncology', 'Personalized breast cancer care by Senior Medical Oncologist Dr. Bhushan Parmar in Mohali. Targeted HER2 therapy, CDK4/6 inhibitors, immunotherapy.', 'Evidence-based protocols tailored to HR-positive, HER2-enriched, and Triple-Negative breast malignancies.', '["Receptor-specific personalized treatment planning", "Dual HER2 blockade and modern antibody-drug conjugates", "Expert management of side effects and supportive care"]', '["Neoadjuvant chemotherapy", "Adjuvant endocrine therapy", "Targeted anti-HER2 therapies"]', 'Breast oncology, recurrence prevention, and biomarker-guided systemic protocols.', 'published', CURRENT_TIMESTAMP);
