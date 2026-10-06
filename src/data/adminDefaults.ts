import {
  AdminUser,
  HeroContent,
  AboutDoctorSectionContent,
  SecondOpinionSectionContent,
  FinalCtaSectionContent,
  HeroAnimationSettings,
  GlobalAnimationSettings,
  HomepageSectionConfig,
  LocationItem,
  BodyExplorerRegionConfig,
  CancerCategoryItem,
  CancerPageRecord,
  TreatmentRecord,
  HowCanWeHelpItem,
  JourneyStepItem,
  ContactEnquiryItem,
  MediaAsset,
  NavigationMenuItem,
  FooterConfig,
  SiteSettingsConfig,
  SeoGlobalConfig,
  RedirectRule,
  FormBuilderConfig,
  ActivityLogItem,
  BlogPostRecord
} from '../types/admin';

// Initial Admin Users metadata (authentication and credentials verified securely server-side)
export const defaultAdminUsers: AdminUser[] = [];

export const defaultHeroContent: HeroContent = {
  smallLabel: 'MEDICAL ONCOLOGY • PERSONALIZED CANCER CARE',
  mainHeading: 'Personalized Cancer Care.',
  highlightedHeading: 'Evidence-Based Treatment.',
  subHeading: 'Compassion at Every Step.',
  description:
    'Senior Consultant Medical Oncology with 10+ years of dedicated experience across premier cancer centers. Specializing in precision oncology, targeted therapy, immunotherapy, and blood cancers with clinical empathy.',
  primaryCtaLabel: 'Book Consultation',
  primaryCtaUrl: '#appointment',
  secondaryCtaLabel: 'Explore Care Options',
  secondaryCtaUrl: '#cancers',
  doctorHeroImage: '',
  mobileDoctorHeroImage: '',
  doctorHeroFocalPoint: '50% 50%',
  doctorHeroAltText: 'Dr. Bhushan Parmar, Senior Consultant Medical Oncology',
  heroBackgroundImage: '',
  heroOverlayStrength: 85,
  credentials: [
    {
      id: 'cred-1',
      isCount: true,
      countTarget: 10,
      suffix: '+ Years',
      label: 'Oncology Experience',
      iconName: 'Shield',
      enabled: true,
      order: 1
    },
    {
      id: 'cred-2',
      isCount: false,
      highlight: 'DrNB',
      label: 'Medical Oncology',
      iconName: 'Award',
      enabled: true,
      order: 2
    },
    {
      id: 'cred-3',
      isCount: false,
      highlight: 'PGIMER',
      label: 'Senior Residency',
      iconName: 'Stethoscope',
      enabled: true,
      order: 3
    },
    {
      id: 'cred-4',
      isCount: false,
      highlight: 'MD',
      label: 'Clinical Oncology',
      iconName: 'GraduationCap',
      enabled: true,
      order: 4
    }
  ]
};

export const defaultAboutDoctorContent: AboutDoctorSectionContent = {
  smallLabel: 'MEET YOUR ONCOLOGIST',
  mainHeading: 'Experience, evidence and compassionate cancer care',
  subHeading: 'Bridging cutting-edge oncology science with deeply personalized patient support.',
  aboutDoctorImage: '',
  aboutDoctorMobileImage: '',
  aboutDoctorFocalPoint: '50% 50%',
  aboutDoctorAltText: 'Dr. Bhushan Parmar - Compassionate and evidence-based oncology care',
  quote:
    '“No two cancer journeys are identical. Our commitment is delivering precise, biomarker-guided therapies while standing firmly by our patients with clarity and genuine empathy.”',
  ctaLabel: 'View Full Medical Credentials'
};

export const defaultSecondOpinionContent: SecondOpinionSectionContent = {
  smallLabel: 'EXPERT ONCOLOGY REVIEW',
  mainHeading: 'A second opinion can bring clarity',
  description:
    'If you already have a diagnosis or treatment plan, you can request a review of your reports before deciding your next step. Confirm your staging, explore molecular therapies, and gain peace of mind.',
  secondOpinionImage: '',
  secondOpinionMobileImage: '',
  secondOpinionFocalPoint: '50% 50%',
  secondOpinionAltText: 'Oncology report review and clinical documentation',
  secondOpinionOverlayStrength: 85,
  primaryCtaLabel: 'Get a Second Opinion',
  secondaryCtaLabel: 'Required Reports Checklist'
};

export const defaultFinalCtaContent: FinalCtaSectionContent = {
  smallLabel: 'SPECIALIST MEDICAL ONCOLOGY',
  mainHeading: 'Need guidance about your cancer treatment?',
  description: 'Schedule a consultation or request a second opinion. Receive thoughtful, evidence-based recommendations tailored to your diagnosis.',
  primaryCtaLabel: 'Book Consultation',
  secondaryCtaLabel: 'Get Second Opinion',
  finalCtaImage: '',
  finalCtaMobileImage: '',
  finalCtaImagePositionX: 50,
  finalCtaImagePositionY: 30,
  finalCtaMobileImagePositionX: 50,
  finalCtaMobileImagePositionY: 30,
  finalCtaAltText: 'Dr. Bhushan Parmar, Senior Consultant Medical Oncology'
};

export const defaultHeroAnimationSettings: HeroAnimationSettings = {
  headingAnimation: 'mask',
  doctorImageAnimation: 'clip',
  credentialAnimation: 'stagger',
  globalSpeed: 'normal',
  enableHeroAnimations: true
};

export const defaultGlobalAnimationSettings: GlobalAnimationSettings = {
  enabled: true,
  intensity: 'standard',
  marquee: {
    enabled: true,
    speed: 'normal',
    direction: 'left',
    phrases: [
      'Personalized Cancer Care',
      'Precision Oncology & Biomarker Profiling',
      'Evidence-Based Chemotherapy',
      'Next-Gen Immunotherapy',
      'Compassionate Cancer Management'
    ]
  }
};

export const defaultHomepageSections: HomepageSectionConfig[] = [
  { id: 'sec-hero', name: 'Hero Banner', visible: true, order: 1, theme: 'teal' },
  { id: 'sec-marquee', name: 'Editorial Marquee', visible: true, order: 2, theme: 'teal' },
  { id: 'sec-intro', name: 'Practice Introduction', visible: true, order: 3, theme: 'light' },
  { id: 'sec-about', name: 'Doctor Biography & Qualifications', visible: true, order: 4, theme: 'teal' },
  { id: 'sec-how-help', name: 'How Can We Help? (Patient Cards)', visible: true, order: 5, theme: 'light' },
  { id: 'sec-cancers', name: 'Cancer Care Catalog', visible: true, order: 6, theme: 'light' },
  { id: 'sec-body-explorer', name: 'Interactive Body Area Explorer', visible: true, order: 7, theme: 'light' },
  { id: 'sec-treatments', name: 'Medical Oncology Treatments', visible: true, order: 8, theme: 'teal' },
  { id: 'sec-typography', name: 'Oversized Typography Watermark', visible: true, order: 9, theme: 'light' },
  { id: 'sec-journey', name: 'Treatment Journey Timeline', visible: true, order: 10, theme: 'light' },
  { id: 'sec-second-opinion', name: 'Second Opinion Banner', visible: true, order: 11, theme: 'teal' },
  { id: 'sec-blog', name: 'Patient Education & Resources', visible: true, order: 12, theme: 'light' },
  { id: 'sec-faqs', name: 'Frequently Asked Questions', visible: true, order: 13, theme: 'light' },
  { id: 'sec-final-cta', name: 'Consultation Final CTA', visible: true, order: 14, theme: 'teal' }
];

export const defaultLocations: LocationItem[] = [];

export const defaultBodyExplorerRegions: BodyExplorerRegionConfig[] = [];

export const defaultCancerCategories: CancerCategoryItem[] = [];

export const defaultCancerPages: CancerPageRecord[] = [];

export const defaultHowCanWeHelp: HowCanWeHelpItem[] = [];

export const defaultJourneySteps: JourneyStepItem[] = [];

export const defaultContactEnquiries: ContactEnquiryItem[] = [];

export const defaultMediaAssets: MediaAsset[] = [];

export const defaultNavigation: NavigationMenuItem[] = [
  { id: 'nav-home', label: 'Home', url: '#home', isExternal: false, order: 1, isVisible: true, openInNewTab: false },
  { id: 'nav-about', label: 'About Dr. Parmar', url: '#about', isExternal: false, order: 2, isVisible: true, openInNewTab: false },
  { id: 'nav-cancers', label: 'Cancer Care', url: '#cancers', isExternal: false, order: 3, isVisible: true, openInNewTab: false },
  { id: 'nav-treatments', label: 'Treatments', url: '#treatments', isExternal: false, order: 4, isVisible: true, openInNewTab: false },
  { id: 'nav-journey', label: 'Treatment Journey', url: '#journey', isExternal: false, order: 5, isVisible: true, openInNewTab: false },
  { id: 'nav-second-opinion', label: 'Second Opinion', url: '#second-opinion', isExternal: false, order: 6, isVisible: true, openInNewTab: false },
  { id: 'nav-blog', label: 'Patient Guides', url: '#resources', isExternal: false, order: 7, isVisible: true, openInNewTab: false },
  { id: 'nav-faq', label: 'FAQs', url: '#faqs', isExternal: false, order: 8, isVisible: true, openInNewTab: false },
  { id: 'nav-contact', label: 'Locations', url: '#locations', isExternal: false, order: 9, isVisible: true, openInNewTab: false }
];

export const defaultFooterConfig: FooterConfig = {
  doctorDescription: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  copyright: '© 2026 Dr. Bhushan Parmar. All Rights Reserved.',
  medicalDisclaimer:
    'Medical Disclaimer: The clinical information presented on this website is for patient education and informational purposes only. It is not intended as a substitute for professional clinical medical advice, definitive diagnosis, or individualized treatment. Always consult a qualified medical oncologist for evaluation.',
  privacyPolicyLink: '',
  socialLinks: {},
  footerCta: {
    title: 'Begin Your Personalized Cancer Care Journey',
    subtitle: 'Consult Dr. Bhushan Parmar for an evidence-based evaluation, biomarker testing review, or comprehensive second opinion.',
    buttonText: 'Book an Appointment',
    buttonLink: '#appointment'
  }
};

export const defaultSiteSettings: SiteSettingsConfig = {
  websiteName: 'Dr. Bhushan Parmar – Senior Medical Oncologist',
  siteUrl: 'https://drbhushanparmar.com',
  logoText: 'Dr. Bhushan Parmar',
  doctorTitle: 'Senior Consultant Medical Oncologist',
  favicon: '/favicon.ico',
  primaryColor: '#073F3D',
  secondaryColor: '#149A96',
  accentColor: '#18B8B4',
  defaultPhone: '',
  defaultWhatsapp: '',
  defaultEmail: '',
  emergencyNotice: '',
  maintenanceMode: false,
  maintenanceMessage: '',
  announcementBar: {
    enabled: false,
    text: '',
    ctaText: '',
    ctaUrl: ''
  }
};

export const defaultSeoGlobalConfig: SeoGlobalConfig = {
  siteName: 'Dr. Bhushan Parmar – Medical Oncology Practice',
  defaultTitleFormat: '%s | Dr. Bhushan Parmar – Medical Oncologist Mohali',
  defaultMetaDescription: 'Official website of Dr. Bhushan Parmar, Senior Consultant Medical Oncologist in Mohali & Chandigarh. Specialist in chemotherapy, immunotherapy, targeted therapy, solid tumors & blood cancers.',
  defaultSocialImage: '',
  robotsIndex: true,
  robotsFollow: true,
  sitemapEnabled: true,
  googleSearchConsole: '',
  googleAnalyticsId: '',
  metaPixelId: '',
  orgName: 'Dr. Bhushan Parmar Medical Oncology Practice',
  orgType: 'Physician',
  physicianSpecialty: 'MedicalOncology'
};

export const defaultRedirectRules: RedirectRule[] = [
  { id: 'red-1', oldUrl: '/doctor-profile', newUrl: '/#about', type: '301', enabled: true },
  { id: 'red-2', oldUrl: '/chemotherapy-clinic', newUrl: '/#treatments', type: '301', enabled: true },
  { id: 'red-3', oldUrl: '/second-opinion-desk', newUrl: '/#second-opinion', type: '301', enabled: true }
];

export const defaultFormBuilderConfig: FormBuilderConfig = {
  appointmentForm: {
    fields: {
      patientName: { label: 'Patient Full Name', placeholder: 'Enter patient legal name', required: true, enabled: true },
      phone: { label: 'Phone / WhatsApp Number', placeholder: 'Enter contact number', required: true, enabled: true },
      email: { label: 'Email Address', placeholder: 'name@example.com', required: true, enabled: true },
      preferredDate: { label: 'Preferred Date', placeholder: 'Select preferred date', required: true, enabled: true },
      preferredSlot: { label: 'Preferred Time Slot', placeholder: 'Morning / Afternoon', required: false, enabled: true },
      consultationType: { label: 'Consultation Mode', placeholder: 'In-Person or Video', required: true, enabled: true },
      cancerTypeOrConcern: { label: 'Cancer Type / Primary Concern', placeholder: 'e.g. Lung cancer, Breast biopsy review', required: true, enabled: true },
      notes: { label: 'Clinical Background / Current Symptoms', placeholder: 'Describe biopsy results or previous treatment received', required: false, enabled: true }
    },
    notificationEmail: '',
    successMessage: 'Your request has been received successfully.'
  },
  contactForm: {
    fields: {
      name: { label: 'Full Name', placeholder: 'Your name', required: true, enabled: true },
      phone: { label: 'Phone Number', placeholder: 'Enter contact number', required: true, enabled: true },
      email: { label: 'Email Address', placeholder: 'Your email address', required: true, enabled: true },
      message: { label: 'Message / Question', placeholder: 'How can Dr. Bhushan Parmar help you?', required: true, enabled: true }
    },
    notificationEmail: '',
    successMessage: 'Your request has been received successfully.'
  },
  secondOpinionForm: {
    fields: {
      name: { label: 'Patient Name', placeholder: 'Full patient name', required: true, enabled: true },
      phone: { label: 'Contact Phone / WhatsApp', placeholder: 'Enter contact number', required: true, enabled: true },
      email: { label: 'Email Address', placeholder: 'name@example.com', required: true, enabled: true },
      cityCountry: { label: 'City & Country', placeholder: 'e.g. Mohali / Chandigarh', required: true, enabled: true },
      cancerType: { label: 'Primary Cancer Site', placeholder: 'e.g. Colon Cancer Stage 3', required: true, enabled: true },
      currentDiagnosis: { label: 'Current Biopsy / Histopathology Diagnosis', placeholder: 'Details of tissue diagnosis', required: true, enabled: true },
      previousTreatment: { label: 'Treatment Received So Far', placeholder: 'Chemo cycles, surgery, or radiation details', required: false, enabled: true },
      message: { label: 'Specific Question for Dr. Bhushan Parmar', placeholder: 'What clinical question would you like addressed in the second opinion?', required: true, enabled: true }
    },
    notificationEmail: '',
    successMessage: 'Your second opinion request has been submitted securely.'
  }
};

export const defaultActivityLogs: ActivityLogItem[] = [];

export const defaultBlogPosts: BlogPostRecord[] = [];
