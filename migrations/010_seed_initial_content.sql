-- Migration 010: Initial Content Seed (Exact Frontend Parity & Valid JSON)
-- Database: dr-bhushan-cms (Cloudflare D1)

-- 1. Site Settings (Primitive string/boolean values & valid JSON structured settings)
INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES
('websiteName', 'Dr. Bhushan Parmar – Senior Medical Oncologist', CURRENT_TIMESTAMP),
('siteUrl', 'https://drbhushanparmar.com', CURRENT_TIMESTAMP),
('logoText', 'Dr. Bhushan Parmar', CURRENT_TIMESTAMP),
('doctorTitle', 'Senior Consultant Medical Oncologist', CURRENT_TIMESTAMP),
('favicon', '/favicon.ico', CURRENT_TIMESTAMP),
('primaryColor', '#073F3D', CURRENT_TIMESTAMP),
('secondaryColor', '#149A96', CURRENT_TIMESTAMP),
('accentColor', '#18B8B4', CURRENT_TIMESTAMP),
('defaultPhone', '+91 98141 23456', CURRENT_TIMESTAMP),
('defaultWhatsapp', '+91 98141 23456', CURRENT_TIMESTAMP),
('defaultEmail', 'drbhushanparmar@gmail.com', CURRENT_TIMESTAMP),
('emergencyNotice', 'Emergency Notice: For acute oncological complications, severe neutropenic fever (>100.4°F), or sudden breathlessness, report immediately to your nearest 24x7 hospital Emergency Department.', CURRENT_TIMESTAMP),
('maintenanceMode', 'false', CURRENT_TIMESTAMP),
('maintenanceMessage', 'Our website is undergoing scheduled medical directory updates. For immediate OPD appointments, please call +91 98141 23456.', CURRENT_TIMESTAMP),
('announcementBar', '{"enabled":true,"text":"Now Available for In-Person & Hybrid Video Second Opinions across Punjab, Haryana, Himachal & J&K.","ctaText":"Schedule Consultation","ctaUrl":"#appointment"}', CURRENT_TIMESTAMP),
('seoGlobalConfig', '{"siteName":"Dr. Bhushan Parmar – Medical Oncology Practice","defaultTitleFormat":"%s | Dr. Bhushan Parmar – Medical Oncologist Mohali","defaultMetaDescription":"Official website of Dr. Bhushan Parmar, Senior Consultant Medical Oncologist in Mohali & Chandigarh. Specialist in chemotherapy, immunotherapy, targeted therapy, solid tumors & blood cancers.","defaultSocialImage":"https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=80","robotsIndex":true,"robotsFollow":true,"sitemapEnabled":true,"googleSearchConsole":"gsc-verification-code-bhushan-parmar","googleAnalyticsId":"G-ONCOLOGY778","metaPixelId":"","orgName":"Dr. Bhushan Parmar Medical Oncology Practice","orgType":"Physician","physicianSpecialty":"MedicalOncology"}', CURRENT_TIMESTAMP),
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
  'Dr. Bhushan Parmar is a distinguished Senior Consultant in Medical Oncology with over a decade of dedicated clinical experience in diagnosing and treating solid tumors and hematological malignancies. With advanced sub-specialty training from premier oncology institutes including PGIMER Chandigarh and Rajiv Gandhi Cancer Institute & Research Centre, Delhi, he integrates genomic profiling, precision systemic therapies, and empathetic patient counseling.',
  '["Dr. Bhushan Parmar completed his MBBS from Indira Gandhi Government Medical College, Shimla, followed by his MD in Clinical Oncology & Radiation Therapy from the Regional Cancer Centre, IGMC Shimla. He subsequently pursued an intensive Senior Residency in Oncology at the prestigious Postgraduate Institute of Medical Education and Research (PGIMER), Chandigarh, gaining vast expertise in high-volume tertiary cancer care.", "To achieve the highest tier of super-specialization, Dr. Parmar attained his DrNB in Medical Oncology from the acclaimed Rajiv Gandhi Cancer Institute & Research Centre, Delhi. Throughout his clinical journey spanning 10+ years, he has led multidisciplinary tumor boards and formulated individualized systemic chemotherapy, targeted therapy, and immunotherapy protocols.", "His clinical philosophy centers on the conviction that no two cancers—and no two patients—are identical. Rather than applying a one-size-fits-all regimen, Dr. Parmar combines rigorous clinical diagnostics with tumor molecular profiling to recommend therapies tailored to disease biology, functional status, and personal values.", "A steadfast proponent of responsible oncological communication, he takes the time to thoroughly explain diagnosis, realistic therapeutic goals, potential treatment toxicities, and supportive measures with patients and their families."]',
  '',
  '[{"degree":"MBBS","institution":"Indira Gandhi Government Medical College, Shimla","period":"Graduation","description":"Foundational clinical training and comprehensive medical education with distinction."},{"degree":"MD – Clinical Oncology & Radiation Therapy","institution":"Regional Cancer Centre, IGMC Shimla","period":"Postgraduate","description":"Specialized clinical training in oncology principles, tumor biology, systemic therapeutics, and radiobiology."},{"degree":"Senior Residency in Oncology","institution":"PGIMER Chandigarh","period":"Super-Specialty Residency","description":"Extensive clinical tenure at one of Northern India’s premier tertiary medical research centers, managing complex solid tumors and oncological emergencies."},{"degree":"DrNB – Medical Oncology","institution":"Rajiv Gandhi Cancer Institute & Research Centre, Delhi","period":"Super-Specialty Doctorate","description":"Advanced fellowship and super-speciality accreditation focusing on precision oncology, targeted inhibitors, immunotherapy, and blood malignancies."}]',
  '["Medical Oncology & Systemic Protocols", "Chemotherapy & Neoadjuvant / Adjuvant Therapy", "Targeted Therapy & Kinase Inhibitors", "Immunotherapy & Checkpoint Inhibitors", "Precision Oncology & Molecular Diagnostics", "Solid Tumor Comprehensive Care", "Lymphomas (Hodgkin & Non-Hodgkin)", "Multiple Myeloma & Plasma Cell Disorders", "Blood Malignancies (Leukemias, MDS)", "Evidence-Based Cancer Screening", "Management of Oncological Emergencies"]',
  '["European Society for Medical Oncology (ESMO)", "American Society of Clinical Oncology (ASCO)", "Indian Society of Medical & Paediatric Oncology (ISMPO)", "Association of Physicians of India (API)"]',
  CURRENT_TIMESTAMP
);

-- 3. Homepage Sections (14 items)
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

-- 4. Cancer Categories (6 items)
INSERT OR IGNORE INTO cancer_categories (id, name, slug, description, display_order, updated_at) VALUES
('cat-lung', 'Chest & Lung Cancer', 'chest-lung-cancer', 'Comprehensive systemic protocols for NSCLC, SCLC, and thoracic tumors.', 1, CURRENT_TIMESTAMP),
('cat-breast', "Breast & Women's Cancers", 'breast-cancer', 'Tailored oncology protocols according to receptor subtype and genetic risks.', 2, CURRENT_TIMESTAMP),
('cat-gi', 'Gastrointestinal Oncology', 'gastrointestinal-cancer', 'Evidence-based systemic care for colorectal, stomach, pancreas, and liver tumors.', 3, CURRENT_TIMESTAMP),
('cat-hn', 'Head & Neck Oncology', 'head-neck-cancer', 'Organ-preservation protocols for oral cavity, pharyngeal, and laryngeal malignancies.', 4, CURRENT_TIMESTAMP),
('cat-gu', 'Genitourinary Oncology', 'genitourinary-cancer', 'Systemic care for prostate, kidney, bladder, and testicular cancers.', 5, CURRENT_TIMESTAMP),
('cat-blood', 'Hematological Malignancies', 'blood-cancers', 'Systemic management of lymphomas, multiple myeloma, and chronic leukemias.', 6, CURRENT_TIMESTAMP);

-- 5. Cancer Care (15 items)
INSERT OR IGNORE INTO cancer_care (
  id, name, slug, category, category_id, description, symptoms, diagnosis, treatments, meta_title, meta_description, display_order, status, updated_at
) VALUES
('breast-cancer', 'Breast Cancer', 'breast-cancer', 'Solid Tumor', 'cat-breast', 'Personalized systemic therapy protocols based on ER, PR, HER2, Ki-67 status, and genomic risk recurrence profiling.',
 '["Painless lump or thickening in the breast or axilla", "Change in breast shape, size, or skin dimpling", "Nipple inversion, discharge, or localized redness"]',
 '["Digital mammogram and high-resolution breast ultrasound", "Core needle biopsy with immunohistochemistry (ER, PR, HER2, Ki-67)", "Genomic risk profiling (Oncotype DX / MammaPrint)"]',
 '["Neoadjuvant chemotherapy to downstage tumors before breast-conserving surgery", "Adjuvant endocrine therapy (Tamoxifen, Aromatase Inhibitors)", "Anti-HER2 targeted therapy"]',
 'Breast Cancer Oncologist in Mohali | Dr. Bhushan Parmar', 'Personalized breast cancer care by Senior Medical Oncologist Dr. Bhushan Parmar in Mohali.', 1, 'published', CURRENT_TIMESTAMP),

('lung-cancer', 'Lung Cancer (NSCLC & SCLC)', 'lung-cancer', 'Solid Tumor', 'cat-lung', 'Comprehensive molecular testing for actionable mutations (EGFR, ALK, ROS1, PD-L1) and personalized targeted/immuno-chemotherapy.',
 '["Persistent or worsening cough", "Hemoptysis (coughing up blood)", "Unexplained shortness of breath and chest discomfort", "Unintended weight loss and hoarseness"]',
 '["Contrast-enhanced chest CT scan and whole-body PET-CT", "Tissue biopsy via bronchoscopy or CT-guided fine needle/core", "Next-Generation Sequencing (NGS) for EGFR, ALK, ROS1, KRAS, BRAF, RET, MET, and PD-L1"]',
 '["Oral targeted tyrosine kinase inhibitors (TKIs) for mutation-positive NSCLC", "Immune checkpoint inhibitors alone or combined with chemotherapy", "Platinum-doublet chemotherapy"]',
 'Lung Cancer Specialist Doctor in Mohali | Dr. Bhushan Parmar', 'Consult Dr. Bhushan Parmar for advanced lung cancer treatment in Mohali. Expert in EGFR/ALK targeted therapies, immunotherapy, and chemotherapy.', 2, 'published', CURRENT_TIMESTAMP),

('colorectal-cancer', 'Colorectal Cancer', 'colorectal-cancer', 'Solid Tumor', 'cat-gi', 'Staging-directed systemic protocols combining fluoropyrimidine-based regimens with biologic agents and MSI-H screening.',
 '["Persistent change in bowel habits (diarrhea or constipation)", "Rectal bleeding or blood in the stool", "Abdominal cramps, fullness, or iron-deficiency anemia"]',
 '["Colonoscopy with tissue biopsy of suspected lesions", "Contrast-enhanced abdominal CT / pelvic MRI and whole-body PET-CT", "Molecular testing for KRAS, NRAS, BRAF mutations and MSI/MMR status"]',
 '["Adjuvant chemotherapy (FOLFOX / CAPOX) for high-risk stage II and stage III disease", "Biologic targeted therapies", "Immunotherapy (anti-PD-1) for MSI-High / dMMR tumors"]',
 'Colorectal Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Expert gastrointestinal oncology and colorectal cancer care.', 3, 'published', CURRENT_TIMESTAMP),

('stomach-cancer', 'Stomach (Gastric) Cancer', 'stomach-cancer', 'Solid Tumor', 'cat-gi', 'Multidisciplinary systemic strategies including perioperative chemotherapy (FLOT) and HER2/PD-L1 directed therapies.',
 '["Persistent indigestion, heartburn, or early satiety", "Vague upper abdominal pain", "Unexplained weight loss and fatigue"]',
 '["Upper GI endoscopy with targeted biopsies", "Staging CT abdomen/chest and diagnostic laparoscopy", "Testing for HER2 neu expression, MSI status, and PD-L1 CPS score"]',
 '["Perioperative chemotherapy (FLOT regimen) before and after radical surgery", "Trastuzumab combined with chemotherapy for HER2-positive gastric cancers", "Immuno-chemotherapy for advanced PD-L1 expressing tumors"]',
 'Stomach Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Expert gastric and gastrointestinal cancer medical oncology care.', 4, 'published', CURRENT_TIMESTAMP),

('liver-cancer', 'Liver Cancer (Hepatocellular Carcinoma)', 'liver-cancer', 'Solid Tumor', 'cat-gi', 'Modern systemic management balancing tumor eradication with preservation of underlying liver function.',
 '["Right upper quadrant abdominal pain or fullness", "Jaundice (yellowing of skin or eyes)", "Abdominal swelling (ascites) and unexplained weight loss"]',
 '["Triple-phase liver CT or dynamic contrast MRI", "Serum Alpha-Fetoprotein (AFP) biomarker levels", "Child-Pugh and ALBI scoring"]',
 '["First-line immunotherapy + anti-VEGF combinations (Atezolizumab + Bevacizumab)", "Oral multikinase inhibitors (Sorafenib, Lenvatinib)"]',
 'Liver Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Expert management of hepatocellular carcinoma and liver tumors.', 5, 'published', CURRENT_TIMESTAMP),

('pancreatic-cancer', 'Pancreatic Cancer', 'pancreatic-cancer', 'Solid Tumor', 'cat-gi', 'Aggressive systemic chemotherapy combinations, BRCA gene testing, and comprehensive symptom management.',
 '["Painless jaundice and dark urine", "Upper abdominal pain radiating to the mid-back", "Recent-onset diabetes in older adults and significant weight loss"]',
 '["Pancreatic protocol triphasic CT and EUS with biopsy", "Serum CA 19-9 biomarker", "Germline testing for BRCA1/2 mutations"]',
 '["Modified FOLFIRINOX or Gemcitabine + Nab-Paclitaxel chemotherapy regimens", "Neoadjuvant systemic therapy", "PARP inhibitor maintenance"]',
 'Pancreatic Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Specialized medical oncology care for pancreatic adenocarcinoma.', 6, 'published', CURRENT_TIMESTAMP),

('head-and-neck-cancer', 'Head & Neck Cancers', 'head-and-neck-cancer', 'Solid Tumor', 'cat-hn', 'Systemic management of oral cavity, laryngeal, and pharyngeal cancers, emphasizing organ preservation and functional speech/swallowing.',
 '["Non-healing ulcer in the mouth or tongue lasting over 2 weeks", "Difficulty or pain during swallowing (dysphagia)", "Persistent sore throat, ear pain, or neck lump"]',
 '["Clinical head & neck examination with flexible nasopharyngolaryngoscopy", "Incisional or core biopsy", "Contrast MRI/CT and HPV (p16) immunohistochemistry"]',
 '["Concurrent chemoradiotherapy with Cisplatin for locally advanced disease", "Induction chemotherapy (TPF regimen)", "Immunotherapy (Pembrolizumab / Nivolumab)"]',
 'Head and Neck Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Expert medical oncology care for oral, throat, and laryngeal cancers.', 7, 'published', CURRENT_TIMESTAMP),

('prostate-cancer', 'Prostate Cancer', 'prostate-cancer', 'Solid Tumor', 'cat-gu', 'Comprehensive endocrine therapy, next-generation androgen receptor axis inhibitors, and precision chemotherapy.',
 '["Frequent nighttime urination (nocturia) and weak urinary stream", "Hematuria or hematospermia", "Bone pain in back or hips in advanced disease"]',
 '["Serum Total PSA and Free PSA ratios", "Multi-parametric MRI (mpMRI) of the prostate", "PSMA PET-CT scan for high-risk staging"]',
 '["Androgen Deprivation Therapy (LHRH agonists / antagonists)", "Next-generation hormonal agents (Enzalutamide, Abiraterone)", "Chemotherapy (Docetaxel, Cabazitaxel)"]',
 'Prostate Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Advanced genitourinary oncology and prostate cancer care.', 8, 'published', CURRENT_TIMESTAMP),

('kidney-and-bladder-cancer', 'Kidney & Bladder Cancer', 'kidney-and-bladder-cancer', 'Solid Tumor', 'cat-gu', 'Systemic protocols using immune checkpoint doublets, tyrosine kinase inhibitors, and FGFR-targeted agents.',
 '["Painless gross hematuria (blood in urine)", "Flank pain or palpable abdominal mass", "Pelvic pain or persistent urinary urgency"]',
 '["Multiphasic renal CT, cystoscopy with transurethral resection (TURBT)", "Whole-body staging CT or PET-CT", "Histological subtype verification"]',
 '["Combination immunotherapy (Nivolumab + Ipilimumab) or IO + TKI for kidney cancer", "Neoadjuvant platinum-based chemotherapy for muscle-invasive bladder cancer"]',
 'Kidney & Bladder Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Specialized renal and urothelial cancer medical oncology.', 9, 'published', CURRENT_TIMESTAMP),

('ovarian-cancer', 'Ovarian Cancer', 'ovarian-cancer', 'Solid Tumor', 'cat-gu', 'Platinum-based systemic therapy, interval debulking coordination, and maintenance PARP inhibitor protocols.',
 '["Persistent abdominal bloating and early satiety", "Pelvic discomfort or back pain", "Change in bowel or urinary habits"]',
 '["Pelvic ultrasound, contrast CT abdomen-pelvis, and PET-CT", "Serum CA-125 and HE4 biomarker levels", "Germline and somatic BRCA1/2 and HRD testing"]',
 '["Carboplatin + Paclitaxel systemic therapy", "PARP inhibitor maintenance (Olaparib, Niraparib)", "Anti-angiogenic therapy (Bevacizumab)"]',
 'Ovarian Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Expert gynecological oncology and ovarian cancer care.', 10, 'published', CURRENT_TIMESTAMP),

('cervical-cancer', 'Cervical Cancer', 'cervical-cancer', 'Solid Tumor', 'cat-gu', 'Concurrent chemoradiation protocols, anti-angiogenic combinations, and immunotherapy for persistent disease.',
 '["Abnormal vaginal bleeding between periods or after intercourse", "Persistent foul-smelling vaginal discharge", "Pelvic or back pain in advanced stages"]',
 '["Cervical examination with colposcopy and directed punch biopsy", "Pelvic MRI and whole-body PET-CT", "Evaluation of PD-L1 CPS score"]',
 '["Weekly Cisplatin administered concurrently with definitive radiotherapy", "Chemotherapy plus Bevacizumab", "Immunotherapy integration"]',
 'Cervical Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Specialized cervical and gynecological cancer oncology.', 11, 'published', CURRENT_TIMESTAMP),

('lymphoma', 'Lymphoma (Hodgkin & Non-Hodgkin)', 'lymphoma', 'Blood Cancer', 'cat-blood', 'Subtype-specific systemic immunotherapy and chemotherapy protocols guided by detailed immunohistochemistry and PET response.',
 '["Painless swelling of lymph nodes in neck, armpits, or groin", "Unexplained fever, night sweats, and significant weight loss (B-symptoms)", "Persistent fatigue and generalized itching"]',
 '["Excisional lymph node biopsy", "Comprehensive immunohistochemistry (IHC) panel", "Baseline PET-CT scan for Ann Arbor / Lugano staging"]',
 '["ABVD or escalated BEACOPP regimens for Classical Hodgkin Lymphoma", "R-CHOP chemo-immunotherapy for DLBCL", "Targeted BTK inhibitors and antibody-drug conjugates"]',
 'Lymphoma Treatment in Mohali | Dr. Bhushan Parmar', 'Specialized hematological oncology and lymphoma care.', 12, 'published', CURRENT_TIMESTAMP),

('multiple-myeloma', 'Multiple Myeloma', 'multiple-myeloma', 'Blood Cancer', 'cat-blood', 'Modern novel quadruplet and triplet regimens combining proteasome inhibitors, immunomodulators, and monoclonal antibodies.',
 '["Bone pain, particularly in the spine, ribs, or hips", "Fatigue and weakness secondary to anemia", "Recurrent infections and elevated serum creatinine"]',
 '["Serum and urine protein electrophoresis with immunofixation (SPEP/UPEP)", "Serum Free Light Chain (sFLC) assay", "Bone marrow aspiration and biopsy with FISH cytogenetics"]',
 '["Triplet/Quadruplet induction (Daratumumab, Bortezomib, Lenalidomide)", "Autologous Stem Cell Transplantation evaluation", "Continuous maintenance therapy"]',
 'Multiple Myeloma Treatment in Mohali | Dr. Bhushan Parmar', 'Expert plasma cell disorder and multiple myeloma care.', 13, 'published', CURRENT_TIMESTAMP),

('other-blood-malignancies', 'Other Blood Malignancies (Leukemia & MDS)', 'blood-malignancies', 'Blood Cancer', 'cat-blood', 'Precision systemic therapy for Acute and Chronic Leukemias (AML, ALL, CML, CLL) and Myelodysplastic Syndromes.',
 '["Severe fatigue, pale skin, and shortness of breath", "Easy bruising, petechiae, or unusual bleeding from gums", "Frequent fevers, bone aches, and enlarged spleen or liver"]',
 '["Complete blood count with peripheral smear morphology", "Bone marrow aspirate with multi-color flow cytometry", "Molecular genetics (FLT3, NPM1, BCR-ABL, IDH1/2)"]',
 '["Targeted BCR-ABL tyrosine kinase inhibitors for CML", "Targeted Venetoclax + Hypomethylating agent regimens for AML", "Targeted BTK and BCL-2 inhibitors for CLL"]',
 'Blood Cancer & Leukemia Treatment in Mohali | Dr. Bhushan Parmar', 'Expert management of leukemias and myelodysplastic syndromes.', 14, 'published', CURRENT_TIMESTAMP),

('rare-advanced-cancers', 'Rare and Advanced Cancers', 'rare-advanced-cancers', 'Rare & Advanced', 'cat-blood', 'Comprehensive genomic profiling and tumor-agnostic therapies for sarcomas, neuroendocrine tumors, and carcinoma of unknown primary.',
 '["Deep-seated soft tissue masses or lumps", "Flushing, wheezing, or diarrhea (carcinoid syndrome)", "Widespread metastatic symptoms without clear primary tumor origin"]',
 '["Comprehensive Next-Generation Sequencing (tissue and liquid biopsy)", "68Ga-DOTATATE PET-CT for neuroendocrine tumors", "Multidisciplinary rare tumor review"]',
 '["Histology-specific multi-agent chemotherapy regimens for sarcomas", "Somatostatin analogues and PRRT coordination", "Tumor-agnostic targeted therapies (NTRK, BRAF, RET inhibitors)"]',
 'Rare & Advanced Cancer Treatment in Mohali | Dr. Bhushan Parmar', 'Precision oncology and rare tumor clinical management.', 15, 'published', CURRENT_TIMESTAMP);

-- 6. Treatments (6 items)
INSERT OR IGNORE INTO treatments (
  id, title, slug, category, summary, details, benefits, process, display_order, status, updated_at
) VALUES
('chemotherapy-systemic', 'Chemotherapy & Systemic Therapy', 'chemotherapy-systemic', 'Systemic',
 'Evidence-based systemic medications designed to destroy rapidly dividing cells across curative, neoadjuvant, and palliative settings.',
 'Systemic chemotherapy utilizes pharmacological agents distributed via the bloodstream to reach cancer cells throughout the body.',
 '["Addresses micro-metastatic disease", "Synergizes with radiation or targeted therapies", "Standardized international dosing protocols"]',
 '["Outpatient daycare facility monitoring", "Pre-medications given to minimize side effects"]',
 1, 'published', CURRENT_TIMESTAMP),

('immunotherapy', 'Immunotherapy', 'immunotherapy', 'Cellular',
 'Innovative biological therapies that empower the patient’s own immune system to recognize, target, and eliminate cancer cells.',
 'Cancer cells often evade detection by activating immune checkpoint pathways that put the brakes on T-cells.',
 '["Potential for long-term durable responses", "Generally lacks standard chemotherapy side effects like hair loss", "Can be used as monotherapy or combined"]',
 '["Intravenous infusion on outpatient schedule", "Regular monitoring for immune-related adverse events"]',
 2, 'published', CURRENT_TIMESTAMP),

('targeted-therapy', 'Targeted Therapy', 'targeted-therapy', 'Targeted',
 'Precision drugs that selectively inhibit specific genetic mutations, proteins, or blood vessel pathways essential for cancer survival.',
 'Targeted therapies focus on specific molecular vulnerabilities unique to cancer cells guided by molecular diagnostics.',
 '["High specificity for cancer cells", "Often available in convenient oral formulation", "Meaningful clinical benefit with manageable toxicity"]',
 '["Regular outpatient clinic visits and blood tests to verify response"]',
 3, 'published', CURRENT_TIMESTAMP),

('precision-oncology', 'Precision Oncology', 'precision-oncology', 'Targeted',
 'Next-Generation Sequencing (NGS) and genomic biomarker profiling to tailor therapeutic choices to the exact genomic signature of your tumor.',
 'Precision oncology represents a paradigm shift from organ-based treatment to biology-based treatment.',
 '["Avoids therapies unlikely to benefit based on markers", "Unlocks tailored systemic options", "Facilitates molecular tumor board consensus"]',
 '["Biopsy or blood sample dispatched to accredited labs", "Dr. Bhushan Parmar synthesizes genomic report with clinical context"]',
 4, 'published', CURRENT_TIMESTAMP),

('cancer-screening', 'Cancer Screening & Early Detection', 'cancer-screening', 'Preventive',
 'Evidence-based screening protocols and risk assessments to detect premalignant lesions or early-stage cancers when therapeutic outcomes are optimal.',
 'Detecting cancer before symptoms manifest significantly increases curative potential.',
 '["Identifies pre-cancerous conditions early", "Allows for less aggressive, organ-sparing treatment", "Provides peace of mind"]',
 '["Comprehensive consultation reviewing personal medical background and family history"]',
 5, 'published', CURRENT_TIMESTAMP),

('supportive-care', 'Supportive & Palliative Oncology Care', 'supportive-care', 'Supportive',
 'Holistic symptom control, pain management, nutritional support, and emergency oncology management to preserve dignity and quality of life.',
 'Comprehensive oncology care extends beyond tumor reduction to safeguarding the patient’s overall well-being.',
 '["Minimizes treatment interruptions", "Improves patient tolerance and quality of life", "Offers emotional reassurance"]',
 '["Compassionate evaluation at every visit with dedicated symptom assessment tools"]',
 6, 'published', CURRENT_TIMESTAMP);

-- 7. Body Explorer Regions (7 items)
INSERT OR IGNORE INTO body_explorer_regions (
  id, label, title, description, cta, hotspot_x, hotspot_y, conditions, treatments, display_order, is_active, updated_at
) VALUES
('chest-lung', 'Chest & Lung', 'Chest & Lung Cancer Care', 'Explore medical oncology care for lung and thoracic cancers, including systemic treatment options selected according to cancer type, stage and biomarkers.', 'View Specialty', 50.0, 31.0,
 '["Non-Small Cell Lung Cancer (NSCLC)", "Small Cell Lung Cancer (SCLC)", "Advanced & Metastatic Lung Malignancies", "Pleural & Thoracic Tumors"]',
 '["Targeted Therapy (EGFR/ALK/ROS1)", "Immunotherapy (Checkpoint Inhibitors)", "Systemic Chemotherapy", "Precision Biomarker Profiling"]', 1, 1, CURRENT_TIMESTAMP),
('head-neck', 'Head & Neck', 'Head & Neck Cancer Care', 'Explore evidence-based systemic oncology protocols for tumors of the oral cavity, throat, and larynx, coordinated closely with surgical and radiation oncology.', 'View Specialty', 50.0, 19.0,
 '["Oral Cavity & Tongue Malignancies", "Laryngeal & Pharyngeal Cancers", "Nasopharyngeal Tumors", "Salivary Gland Malignancies"]',
 '["Concurrent Chemo-Radiotherapy", "Targeted Monoclonal Antibodies", "Immunotherapy Protocols", "Organ-Preserving Regimens"]', 2, 1, CURRENT_TIMESTAMP),
('breast', 'Breast', 'Breast Cancer Care', 'Personalized cancer care calibrated to specific receptor status (HR+, HER2+, and Triple-Negative), utilizing modern targeted and endocrine therapies.', 'View Specialty', 55.0, 34.0,
 '["Hormone Receptor Positive (HR+) Breast Cancer", "HER2-Enriched Breast Cancer", "Triple-Negative Breast Cancer (TNBC)", "Locally Advanced & Metastatic Breast Cancer"]',
 '["Targeted HER2 Monoclonal Therapy", "CDK4/6 Inhibitor Regimens", "Endocrine & Hormonal Therapies", "Neoadjuvant Systemic Chemotherapy"]', 3, 1, CURRENT_TIMESTAMP),
('gastrointestinal', 'Gastrointestinal', 'Gastrointestinal Cancer Care', 'Multidisciplinary systemic oncology for digestive tract tumors, leveraging molecular profiling, microsatellite instability (MSI) testing, and targeted agents.', 'View Specialty', 50.0, 46.0,
 '["Colorectal & Rectal Cancers", "Stomach (Gastric) & Esophageal Cancers", "Pancreatic Adenocarcinoma", "Hepatocellular (Liver) & Bile Duct Cancers"]',
 '["MSI-H / dMMR Immunotherapy", "VEGF & EGFR Targeted Antibodies", "Perioperative Combination Chemotherapy", "Maintenance Regimens"]', 4, 1, CURRENT_TIMESTAMP),
('genitourinary', 'Genitourinary', 'Genitourinary Cancer Care', 'Systemic care pathways for cancers of the urinary tract and male reproductive organs, including advanced hormonal therapies and novel immunotherapy combinations.', 'View Specialty', 46.0, 55.0,
 '["Prostate Cancer (Castration-Sensitive & Resistant)", "Renal Cell Carcinoma (Kidney Cancer)", "Urothelial & Bladder Carcinoma", "Testicular Germ Cell Tumors"]',
 '["Next-Gen Androgen Receptor Blockers", "Tyrosine Kinase Inhibitors (TKIs)", "Immune Checkpoint Combinations", "Platinum-Based Chemotherapy"]', 5, 1, CURRENT_TIMESTAMP),
('gynecological', 'Gynecological', 'Gynecological Cancer Care', 'Comprehensive medical oncology for female reproductive cancers, integrating genetic testing (BRCA1/2, HRD) to identify patients who benefit from maintenance therapies.', 'View Specialty', 50.0, 63.0,
 '["Ovarian & Fallopian Tube Cancers", "Cervical Cancer", "Endometrial & Uterine Cancers", "Peritoneal Malignancies"]',
 '["PARP Inhibitor Maintenance", "Targeted Anti-Angiogenic Agents", "Immunotherapy for MMRd Cancers", "Taxane-Platinum Chemotherapy"]', 6, 1, CURRENT_TIMESTAMP),
('blood-cancers', 'Blood Cancers', 'Hematological & Blood Cancer Care', 'Systemic management of hematological malignancies, deploying targeted small-molecule inhibitors, monoclonal antibodies, and tailored chemo-immunotherapy.', 'View Specialty', 50.0, 40.0,
 '["Hodgkin & Non-Hodgkin Lymphomas (NHL)", "Multiple Myeloma", "Chronic Lymphocytic & Myeloid Leukemias", "Myelodysplastic Syndromes"]',
 '["Monoclonal Antibody Infusions (CD20/CD38)", "Proteasome Inhibitors & Immunomodulators", "Targeted BTK & BCL-2 Inhibitors", "Systemic Chemo-Immunotherapy"]', 7, 1, CURRENT_TIMESTAMP);

-- 8. Locations (2 items)
INSERT OR IGNORE INTO locations (
  id, hospital_name, department, address_line1, address_line2, city, state, pincode, phone, whatsapp, email, opd_timings, days_available, is_primary, is_active, google_maps_url, display_order, updated_at
) VALUES
('loc-1', 'Max Super Speciality Hospital, Mohali', 'Department of Medical Oncology & Clinical Hematology', 'Near Civil Hospital, Phase 6', 'Sector 56', 'Mohali', 'Punjab', '160055', '+91 98141 23456', '+91 98141 23456', 'drbhushanparmar@gmail.com', '10:00 AM – 04:30 PM', 'Monday to Saturday', 1, 1, 'https://maps.google.com/maps?q=Max+Super+Speciality+Hospital+Mohali', 1, CURRENT_TIMESTAMP),
('loc-2', 'Fortis Hospital, Mohali (Consultant OPD)', 'Medical Oncology OPD Suite', 'Sector 62, Phase VIII', NULL, 'Mohali', 'Punjab', '160062', '+91 98141 23456', '+91 98141 23456', 'drbhushanparmar@gmail.com', '05:00 PM – 07:00 PM', 'Tuesday & Thursday', 0, 1, 'https://maps.google.com/maps?q=Fortis+Hospital+Mohali', 2, CURRENT_TIMESTAMP);

-- 9. Blogs (3 items)
INSERT OR IGNORE INTO blogs (
  id, title, slug, category, excerpt, content, author, read_time, tags, published_at, is_published, seo_title, seo_description, updated_at
) VALUES
('blog-1', 'Understanding Targeted Therapy in Modern Medical Oncology', 'understanding-targeted-therapy-modern-medical-oncology', 'Targeted Therapy',
 'How precision molecular diagnostics and kinase inhibitors target cancer cell specific mutations while sparing healthy tissue.',
 'Precision oncology has revolutionized the treatment landscape of solid tumors and blood cancers. Unlike traditional chemotherapy which affects rapidly dividing cells indiscriminately, targeted therapies home in on specific proteins or genetic mutations that drive tumor growth.\n\nDr. Bhushan Parmar discusses the importance of comprehensive genomic profiling (CGP) prior to initiating therapy, and how personalized treatment selection significantly improves clinical response and patient quality of life.',
 'Dr. Bhushan Parmar', '5 min read', '["Targeted Therapy", "Precision Oncology", "Genomics"]', '2026-03-10', 1, 'Understanding Targeted Therapy | Dr. Bhushan Parmar Oncology', 'Learn how targeted therapy and precision oncology match cancer treatments to genetic profiles for better clinical outcomes.', CURRENT_TIMESTAMP),

('blog-2', 'What Patients Should Know About Immunotherapy Side Effects', 'what-patients-should-know-about-immunotherapy-side-effects', 'Immunotherapy',
 'A comprehensive guide for patients undergoing checkpoint inhibitor immunotherapy and recognizing immune-related adverse events.',
 'Immunotherapy harnesses the body’s own immune system to recognize and attack cancer cells. While often associated with fewer conventional side effects than chemotherapy, checkpoint inhibitors can prompt immune-mediated responses in healthy organs.\n\nEarly detection and timely management of immune-related adverse events (irAEs) by an experienced medical oncologist are vital for patient safety.',
 'Dr. Bhushan Parmar', '4 min read', '["Immunotherapy", "Side Effects", "Patient Guidance"]', '2026-03-05', 1, 'Immunotherapy Side Effects Guide | Dr. Bhushan Parmar', 'Understand checkpoint inhibitors, potential immune-related side effects, and how your oncology team manages them.', CURRENT_TIMESTAMP),

('blog-3', 'Managing Chemotherapy Fatigue & Nutrition During Treatment', 'managing-chemotherapy-fatigue-and-nutrition', 'Patient Guidance',
 'Practical clinical recommendations for maintaining energy, dietary strength, and well-being during systemic oncology therapy.',
 'Fatigue is one of the most common symptoms reported by patients undergoing cancer treatment. Combining structured gentle physical activity with optimal caloric and protein nutrition can make a profound difference.\n\nDr. Bhushan Parmar emphasizes supportive care integration from day one to ensure treatment adherence and preserve overall vitality.',
 'Dr. Bhushan Parmar', '6 min read', '["Chemotherapy Fatigue", "Nutrition", "Supportive Care"]', '2026-02-28', 1, 'Chemotherapy Fatigue & Nutrition Tips | Dr. Bhushan Parmar', 'Expert advice on managing fatigue and maintaining balanced nutrition during cancer treatment.', CURRENT_TIMESTAMP);

-- 10. FAQs (8 items)
INSERT OR IGNORE INTO faqs (id, question, answer, category, display_order, is_published, updated_at) VALUES
('faq-1', 'What should I bring to my first oncology consultation?', 'Please bring all relevant medical records to ensure an exhaustive evaluation: (1) All histopathology slides, tissue blocks, and biopsy reports with immunohistochemistry (IHC) markers; (2) Cross-sectional radiological imaging reports and original digital CD discs (PET-CT, CT, or MRI); (3) Complete blood counts (CBC), liver and kidney function tests; (4) Detailed surgical or prior chemotherapy discharge summaries; and (5) A list of all current medications.', 'Preparation', 1, 1, CURRENT_TIMESTAMP),
('faq-2', 'When should a cancer patient seek a second opinion?', 'Seeking a second opinion is standard medical practice and advisable: (1) Following a newly confirmed cancer diagnosis before beginning invasive treatment; (2) When high-risk surgery or intensive chemotherapy is recommended, to evaluate if targeted or immunotherapy alternatives exist; (3) When the tumor is rare, aggressive, or has recurred; or (4) If you wish to verify that the staging and diagnostic tests meet current international guidelines.', 'Second Opinion', 2, 1, CURRENT_TIMESTAMP),
('faq-3', 'What is the difference between chemotherapy, immunotherapy, and targeted therapy?', 'Chemotherapy uses systemic medications to destroy rapidly dividing cells throughout the body. Targeted therapy uses precision molecules or oral kinase inhibitors designed to block specific genetic alterations and abnormal proteins driving the tumor. Immunotherapy activates the patient’s own immune system (releasing immune checkpoints like PD-1/PD-L1) to recognize, attack, and eliminate cancer cells with long-term memory.', 'Treatments', 3, 1, CURRENT_TIMESTAMP),
('faq-4', 'How is the cancer treatment plan decided?', 'Dr. Bhushan Parmar designs every treatment plan through an individualized, evidence-based approach integrating: (1) Anatomic cancer type and TNM clinical staging; (2) Histopathology and molecular biomarker status (e.g., EGFR, ALK, HER2, PD-L1, BRCA); (3) Overall patient health, age, and organ function performance scores; and (4) International NCCN and ESMO consensus guidelines.', 'Treatment Planning', 4, 1, CURRENT_TIMESTAMP),
('faq-5', 'What are the side effects of chemotherapy, and how are they managed?', 'Common side effects include fatigue, temporary hair thinning, nausea, mild appetite reduction, and temporary dips in white blood cells. Modern oncology has revolutionized supportive care: Dr. Parmar uses advanced antiemetics (neurokinin-1 inhibitors, 5-HT3 antagonists), proactive hydration, protective premedications, and G-CSF growth factors to prevent and manage these side effects so most patients undergo therapy with minimal disruption to daily life.', 'Side Effects', 5, 1, CURRENT_TIMESTAMP),
('faq-6', 'Is precision oncology suitable for all cancer types?', 'Precision oncology is suitable for any cancer where actionable genomic or molecular alterations can be detected. It is most commonly applied in non-small cell lung cancer, colorectal cancer, breast cancer, ovarian cancer, prostate cancer, melanoma, gastrointestinal stromal tumors (GIST), and hematologic malignancies. Next-Generation Sequencing (NGS) is performed to identify whether an actionable mutation exists.', 'Precision Oncology', 6, 1, CURRENT_TIMESTAMP),
('faq-7', 'Can I consult Dr. Bhushan Parmar online?', 'Yes. Remote virtual consultations and tele-second-opinions are available for patients residing outside Mohali, outstation patients across North India, and international families. You can upload digital biopsy reports and scan reports securely through the second opinion portal to receive an expert medical oncology assessment.', 'Consultation', 7, 1, CURRENT_TIMESTAMP),
('faq-8', 'Where does Dr. Bhushan Parmar practice, and how can I book an appointment?', 'Dr. Bhushan Parmar consults in Mohali (SAS Nagar), Punjab. In-person outpatient consultations take place Monday through Saturday between 10:00 AM and 4:00 PM. You can easily schedule an appointment via our online booking form on this website, call the OPD desk directly at +91 98765 43210, or message our oncology clinical coordination desk via WhatsApp.', 'Appointment', 8, 1, CURRENT_TIMESTAMP);

-- 11. Testimonials (4 items)
INSERT OR IGNORE INTO testimonials (id, patient_name, cancer_type, treatment_received, feedback, rating, date, is_published, updated_at) VALUES
('review-1', 'Gurpreet Singh', 'Lung Cancer (NSCLC)', 'Targeted Therapy & Immunotherapy', 'Dr. Bhushan Parmar was a beacon of clarity and compassion for our family when my father was diagnosed with advanced lung cancer. He conducted thorough molecular testing and explained targeted therapy options clearly without making false promises. My father has tolerated treatment remarkably well under his care.', 5, '2026-08-15', 1, CURRENT_TIMESTAMP),
('review-2', 'Meenakshi Sharma', 'Breast Cancer', 'Neoadjuvant Chemotherapy & Targeted Care', 'Finding a doctor who listens patiently to all your fears is rare. Dr. Parmar took the time to explain the rationale for neoadjuvant chemotherapy and supported me at every step. His calm demeanor and scientific approach gave me immense courage throughout.', 5, '2026-08-02', 1, CURRENT_TIMESTAMP),
('review-3', 'Col. R. K. Verma (Retd.)', 'Multiple Myeloma', 'Multiple Myeloma Management', 'I sought a second opinion with Dr. Bhushan Parmar for my brother’s multiple myeloma. His depth of knowledge in hematologic malignancies and novel triplet regimens was immediately apparent. He reviewed every bone marrow report with meticulous attention.', 5, '2026-07-20', 1, CURRENT_TIMESTAMP),
('review-4', 'Sunita Aggarwal', 'Lymphoma', 'Lymphoma Treatment', 'Dr. Parmar’s prompt response and meticulous handling of my lymphoma treatment in Mohali ensured zero delays. He managed chemotherapy side effects with proactive supportive medicines so I experienced minimal nausea. Truly a dedicated medical oncologist.', 5, '2026-06-10', 1, CURRENT_TIMESTAMP);

-- 12. Media Slots (All 28 permanent slots - NO anatomy slots)
INSERT OR IGNORE INTO media_slots (slot_key, slot_name, section, target_table, target_field, published_value, draft_value, status, alt_text, mobile_value, updated_at) VALUES
('slot-branding-logo', 'Website Primary Logo', 'Header / Navigation', 'site_settings', 'logoText', '', '', 'published', 'Website Logo', '', CURRENT_TIMESTAMP),
('slot-branding-logo-light', 'Website Light Logo', 'Footer / Dark Backgrounds', 'site_settings', 'logoLight', '', '', 'published', 'Light Logo', '', CURRENT_TIMESTAMP),
('slot-branding-logo-dark', 'Website Dark Logo', 'Header / Light Backgrounds', 'site_settings', 'logoDark', '', '', 'published', 'Dark Logo', '', CURRENT_TIMESTAMP),
('slot-favicon', 'Website Favicon', 'Browser Tab', 'site_settings', 'favicon', '', '', 'published', 'Favicon', '', CURRENT_TIMESTAMP),
('slot-og-social', 'Default Open Graph Social Share Image', 'Social Media Previews', 'seo_global', 'socialImage', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=80', '', 'published', 'Social Preview', '', CURRENT_TIMESTAMP),
('slot-hero-doctor', 'Homepage Hero Doctor Image', 'Hero', 'doctor_profile', 'hero_photo', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=85', '', 'published', 'Dr. Bhushan Parmar Hero Portrait', '', CURRENT_TIMESTAMP),
('slot-hero-bg', 'Homepage Hero Background Image', 'Hero Background', 'homepage_sections', 'heroBackground', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1920&q=80', '', 'published', 'Hero background texture', '', CURRENT_TIMESTAMP),
('slot-hero-doctor-mobile', 'Homepage Hero Mobile Doctor Image', 'Mobile Hero', 'doctor_profile', 'mobile_photo', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=85', '', 'published', 'Hero mobile portrait', '', CURRENT_TIMESTAMP),
('slot-about-doctor', 'About Section Doctor Portrait', 'Meet Your Oncologist', 'doctor_profile', 'about_photo', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=1000&q=85', '', 'published', 'Dr. Bhushan Parmar About Portrait', '', CURRENT_TIMESTAMP),
('slot-about-doctor-mobile', 'About Doctor Mobile Portrait', 'Meet Your Oncologist Mobile', 'doctor_profile', 'aboutMobilePhoto', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&q=85', '', 'published', 'About mobile portrait', '', CURRENT_TIMESTAMP),
('slot-pathway-consultation', 'Consultation & Diagnosis Image', 'Patient Care Pathways', 'homepage_sections', 'pathwayConsultation', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80', '', 'published', 'Consultation pathway', '', CURRENT_TIMESTAMP),
('slot-pathway-systemic', 'Systemic Therapy Planning Image', 'Patient Care Pathways', 'homepage_sections', 'pathwaySystemic', 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80', '', 'published', 'Systemic therapy pathway', '', CURRENT_TIMESTAMP),
('slot-pathway-second-opinion', 'Second Opinion Reviews Image', 'Patient Care Pathways', 'homepage_sections', 'pathwaySecondOpinion', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80', '', 'published', 'Second opinion pathway', '', CURRENT_TIMESTAMP),
('slot-evidence-oncology', 'Evidence-Based Oncology Feature Image', 'Evidence-Based Oncology', 'homepage_sections', 'evidenceOncology', 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=80', '', 'published', 'Evidence-based oncology', '', CURRENT_TIMESTAMP),
('slot-cancer-solid-tumors', 'Solid Tumors Image', 'Cancer Care Categories', 'cancer_categories', 'solidTumors', 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80', '', 'published', 'Solid tumors category', '', CURRENT_TIMESTAMP),
('slot-cancer-blood-malignancies', 'Blood Malignancies Image', 'Cancer Care Categories', 'cancer_categories', 'bloodMalignancies', 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80', '', 'published', 'Blood malignancies category', '', CURRENT_TIMESTAMP),
('slot-treatment-chemotherapy', 'Chemotherapy & Systemic Therapy Image', 'Medical Treatments', 'treatments', 'chemotherapy', 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80', '', 'published', 'Chemotherapy treatment', '', CURRENT_TIMESTAMP),
('slot-treatment-targeted', 'Targeted Therapy & Kinase Inhibitors Image', 'Medical Treatments', 'treatments', 'targeted', 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80', '', 'published', 'Targeted therapy treatment', '', CURRENT_TIMESTAMP),
('slot-treatment-immunotherapy', 'Immunotherapy & Checkpoint Inhibitors Image', 'Medical Treatments', 'treatments', 'immunotherapy', 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80', '', 'published', 'Immunotherapy treatment', '', CURRENT_TIMESTAMP),
('slot-treatment-precision', 'Precision Oncology Image', 'Medical Treatments', 'treatments', 'precision', 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80', '', 'published', 'Precision oncology', '', CURRENT_TIMESTAMP),
('slot-second-opinion-doctor', 'Second Opinion Doctor Consultation Image', 'Consultation Overview', 'doctor_profile', 'second_opinion_photo', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=1000&q=85', '', 'published', 'Second opinion doctor consultation', '', CURRENT_TIMESTAMP),
('slot-second-opinion-banner', 'Second Opinion Review Banner Background', 'Banner Background', 'homepage_sections', 'secondOpinionBanner', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=80', '', 'published', 'Second opinion banner', '', CURRENT_TIMESTAMP),
('slot-resource-feature-1', 'Featured Resource Card 1 Image', 'Featured Insights', 'blogs', 'resource1', 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80', '', 'published', 'Resource card 1', '', CURRENT_TIMESTAMP),
('slot-resource-feature-2', 'Featured Resource Card 2 Image', 'Featured Insights', 'blogs', 'resource2', 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80', '', 'published', 'Resource card 2', '', CURRENT_TIMESTAMP),
('slot-resource-feature-3', 'Featured Resource Card 3 Image', 'Featured Insights', 'blogs', 'resource3', 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80', '', 'published', 'Resource card 3', '', CURRENT_TIMESTAMP),
('slot-final-cta-doc', 'Final Consultation CTA Doctor Portrait', 'Final CTA', 'doctor_profile', 'cta_photo', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=85', '', 'published', 'Final CTA portrait', '', CURRENT_TIMESTAMP),
('slot-final-cta-mobile', 'Final Consultation CTA Mobile Image', 'Final CTA Mobile', 'doctor_profile', 'ctaMobilePhoto', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=85', '', 'published', 'Final CTA mobile portrait', '', CURRENT_TIMESTAMP),
('slot-location-primary', 'Primary Clinic Image', 'Primary Location', 'locations', 'image_id', 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80', '', 'published', 'Max Hospital Mohali Clinic', '', CURRENT_TIMESTAMP);

-- 13. Navigation Items (9 items)
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

-- 15. Cancer Pages (2 items)
INSERT OR IGNORE INTO cancer_pages (
  id, slug, title, h1, meta_description, intro, why_choose, services, clinical_focus, status, updated_at
) VALUES
('cp-lung', 'lung-cancer', 'Non-Small Cell & Small Cell Lung Cancer', 'Lung Cancer Care & Precision Treatment', 'Consult Dr. Bhushan Parmar for advanced lung cancer treatment in Mohali. Expert in EGFR/ALK targeted therapies, immunotherapy, and chemotherapy.', 'Advanced systemic medical oncology protocols customized to exact mutation profiles and PD-L1 expression.', '["Comprehensive molecular biomarker testing (NGS)", "Personalized targeted therapy and immunotherapy", "Experienced senior oncology care"]', '["Targeted oral tyrosine kinase inhibitors", "Immune checkpoint inhibitors", "Platinum-doublet systemic chemotherapy"]', 'Precision thoracic oncology and molecular biomarker-driven systemic therapy.', 'published', CURRENT_TIMESTAMP),
('cp-breast', 'breast-cancer', 'Breast Cancer Treatment & Receptor Subtypes', 'Breast Cancer Care & Precision Oncology', 'Personalized breast cancer care by Senior Medical Oncologist Dr. Bhushan Parmar in Mohali. Targeted HER2 therapy, CDK4/6 inhibitors, immunotherapy.', 'Evidence-based protocols tailored to HR-positive, HER2-enriched, and Triple-Negative breast malignancies.', '["Receptor-specific personalized treatment planning", "Dual HER2 blockade and modern antibody-drug conjugates", "Expert management of side effects and supportive care"]', '["Neoadjuvant chemotherapy", "Adjuvant endocrine therapy", "Targeted anti-HER2 therapies"]', 'Breast oncology, recurrence prevention, and biomarker-guided systemic protocols.', 'published', CURRENT_TIMESTAMP);
