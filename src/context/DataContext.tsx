import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DoctorProfile,
  PracticeLocation,
  Treatment,
  CancerType,
  BloodCancerDetail,
  BlogPost,
  FAQItem,
  Testimonial,
  AppointmentSubmission,
  SecondOpinionSubmission,
  LocalSeoPageData,
  UploadedFileMeta
} from '../types';
import {
  AdminRole,
  AdminUser,
  ActivityLogItem,
  HeroContent,
  AboutDoctorSectionContent,
  SecondOpinionSectionContent,
  HeroAnimationSettings,
  GlobalAnimationSettings,
  HomepageSectionConfig,
  LocationItem,
  BodyExplorerRegionConfig,
  CancerCategoryItem,
  CancerPageRecord,
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
  ContentRevision,
  FinalCtaSectionContent,
  BlogPostRecord
} from '../types/admin';
import {
  initialDoctorProfile,
  initialPracticeLocation,
  initialTreatments,
  initialCancers,
  bloodCancerDetails,
  initialBlogPosts,
  initialFAQs,
  initialTestimonials,
  localSeoPages
} from '../data/initialData';
import {
  defaultAdminUsers,
  defaultHeroContent,
  defaultAboutDoctorContent,
  defaultSecondOpinionContent,
  defaultFinalCtaContent,
  defaultHeroAnimationSettings,
  defaultGlobalAnimationSettings,
  defaultHomepageSections,
  defaultLocations,
  defaultBodyExplorerRegions,
  defaultCancerCategories,
  defaultCancerPages,
  defaultHowCanWeHelp,
  defaultJourneySteps,
  defaultContactEnquiries,
  defaultMediaAssets,
  defaultNavigation,
  defaultFooterConfig,
  defaultSiteSettings,
  defaultSeoGlobalConfig,
  defaultRedirectRules,
  defaultFormBuilderConfig,
  defaultActivityLogs,
  defaultBlogPosts
} from '../data/adminDefaults';
import { api, apiUrl } from '../lib/api';
import { getMediaSlotDefinition } from '../data/mediaSlotRegistry';
import { resolveMediaUrl } from '../lib/cloudflareMedia';

interface DataContextType {
  // Public Data
  doctorProfile: DoctorProfile;
  practiceLocation: PracticeLocation;
  treatments: Treatment[];
  cancers: CancerType[];
  bloodCancers: BloodCancerDetail[];
  blogPosts: BlogPostRecord[];
  faqs: FAQItem[];
  testimonials: Testimonial[];
  appointments: AppointmentSubmission[];
  secondOpinions: SecondOpinionSubmission[];
  localSeoList: LocalSeoPageData[];

  // CMS Collections & Extended Settings
  heroContent: HeroContent;
  aboutDoctorContent: AboutDoctorSectionContent;
  secondOpinionContent: SecondOpinionSectionContent;
  finalCtaContent: FinalCtaSectionContent;
  heroAnimationSettings: HeroAnimationSettings;
  globalAnimationSettings: GlobalAnimationSettings;
  homepageSections: HomepageSectionConfig[];
  locations: LocationItem[];
  bodyExplorerRegions: BodyExplorerRegionConfig[];
  cancerCategories: CancerCategoryItem[];
  cancerPages: CancerPageRecord[];
  howCanWeHelp: HowCanWeHelpItem[];
  treatmentJourney: JourneyStepItem[];
  contactEnquiries: ContactEnquiryItem[];
  mediaAssets: MediaAsset[];
  navigationMenu: NavigationMenuItem[];
  footerConfig: FooterConfig;
  siteSettings: SiteSettingsConfig;
  seoGlobalConfig: SeoGlobalConfig;
  redirectRules: RedirectRule[];
  formBuilderConfig: FormBuilderConfig;
  activityLogs: ActivityLogItem[];
  adminUsers: AdminUser[];
  currentAdminUser: AdminUser | null;
  adminRole: AdminRole | null;

  // Routing and Navigation States
  activeSection: string;
  setActiveSection: (sec: string) => void;
  selectedCancerSlug: string | null;
  setSelectedCancerSlug: (slug: string | null) => void;
  selectedTreatmentId: string | null;
  setSelectedTreatmentId: (id: string | null) => void;
  selectedBlogSlug: string | null;
  setSelectedBlogSlug: (slug: string | null) => void;
  selectedLocalSeoSlug: string | null;
  setSelectedLocalSeoSlug: (slug: string | null) => void;
  isAdminRoute: boolean;
  navigateToAdmin: () => void;
  navigateToPublic: () => void;

  // Modals
  isAppointmentModalOpen: boolean;
  openAppointmentModal: () => void;
  closeAppointmentModal: () => void;
  isSecondOpinionModalOpen: boolean;
  openSecondOpinionModal: () => void;
  closeSecondOpinionModal: () => void;
  isAdminModalOpen: boolean;
  openAdminModal: () => void;
  closeAdminModal: () => void;

  // Admin Auth
  isAdminLoggedIn: boolean;
  adminLogin: (email: string, pass: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; user?: AdminUser }>;
  loginAdmin: (password: string) => boolean; // backward compatibility
  adminLogout: () => void;
  logoutAdmin: () => void; // backward compatibility

  // CMS Updaters
  updateDoctorProfile: (profile: Partial<DoctorProfile>) => Promise<boolean>;
  updatePracticeLocation: (loc: Partial<PracticeLocation>) => void;
  updateHeroContent: (content: Partial<HeroContent>) => Promise<boolean>;
  updateAboutDoctorContent: (content: Partial<AboutDoctorSectionContent>) => Promise<boolean>;
  updateSecondOpinionContent: (content: Partial<SecondOpinionSectionContent>) => Promise<boolean>;
  updateFinalCtaContent: (content: Partial<FinalCtaSectionContent>) => Promise<boolean>;
  updateHeroAnimationSettings: (settings: Partial<HeroAnimationSettings>) => Promise<boolean>;
  updateGlobalAnimationSettings: (settings: Partial<GlobalAnimationSettings>) => Promise<boolean>;
  updateHomepageSections: (sections: HomepageSectionConfig[]) => Promise<boolean>;
  updateLocations: (locations: LocationItem[]) => void;
  addLocation: (location: LocationItem) => void;
  deleteLocation: (id: string) => void;
  updateBodyExplorerRegion: (id: string, region: Partial<BodyExplorerRegionConfig>) => void;
  resetBodyExplorerRegions: () => void;
  updateCancerCategories: (cats: CancerCategoryItem[]) => void;
  updateCancerPage: (id: string, page: Partial<CancerPageRecord>) => void;
  addCancerPage: (page: CancerPageRecord) => void;
  deleteCancerPage: (id: string) => void;
  updateHowCanWeHelp: (items: HowCanWeHelpItem[]) => Promise<boolean>;
  updateTreatmentJourney: (steps: JourneyStepItem[]) => Promise<boolean>;
  updateTreatment: (id: string, data: Partial<Treatment>) => void;
  addTreatment: (treatment: Treatment) => void;
  deleteTreatment: (id: string) => void;
  updateCancer: (id: string, data: Partial<CancerType>) => void;
  addCancer: (cancer: CancerType) => void;
  deleteCancer: (id: string) => void;
  updateBlogPost: (id: string, data: Partial<BlogPost>) => void;
  updateBlogPosts: (posts: BlogPostRecord[]) => void;
  addBlogPost: (post: BlogPost) => void;
  deleteBlogPost: (id: string) => void;
  updateFAQ: (id: string, data: Partial<FAQItem>) => void;
  addFAQ: (faq: FAQItem) => void;
  deleteFAQ: (id: string) => void;
  updateTestimonials: (testimonials: Testimonial[]) => void;
  addMediaAsset: (asset: MediaAsset) => void;
  deleteMediaAsset: (id: string) => void;
  mediaSlots: Record<string, any>;
  getSlotMediaUrl: (slotKey: string, fallback?: string) => string;
  saveSlotDraft: (slotKey: string, draftValue: string, meta?: any) => Promise<boolean>;
  publishSlot: (slotKey: string) => Promise<boolean>;
  publishAllSlots: () => Promise<boolean>;
  updateNavigationMenu: (menu: NavigationMenuItem[]) => Promise<boolean>;
  updateFooterConfig: (footer: Partial<FooterConfig>) => Promise<boolean>;
  updateSiteSettings: (settings: Partial<SiteSettingsConfig>) => Promise<boolean>;
  updateSeoGlobalConfig: (seo: Partial<SeoGlobalConfig>) => void;
  updateRedirectRules: (rules: RedirectRule[]) => void;
  updateFormBuilderConfig: (config: Partial<FormBuilderConfig>) => Promise<boolean>;

  // Submissions & Enquiries
  submitAppointment: (data: Omit<AppointmentSubmission, 'id' | 'submittedAt' | 'status'>) => Promise<boolean>;
  updateAppointmentStatus: (id: string, status: AppointmentSubmission['status'], notes?: string) => Promise<boolean>;
  deleteAppointment: (id: string) => Promise<boolean>;
  submitSecondOpinion: (opinion: Omit<SecondOpinionSubmission, 'id' | 'submittedAt' | 'status'> & { requestId?: string }) => Promise<boolean>;
  updateSecondOpinionStatus: (id: string, status: SecondOpinionSubmission['status'], notes?: string) => Promise<boolean>;
  deleteSecondOpinion: (id: string) => Promise<boolean>;
  submitContactEnquiry: (enquiry: Omit<ContactEnquiryItem, 'id' | 'submittedDate' | 'status'>) => Promise<boolean>;
  updateContactEnquiryStatus: (id: string, status: ContactEnquiryItem['status'], notes?: string) => Promise<boolean>;
  deleteContactEnquiry: (id: string) => Promise<boolean>;

  // User Management
  addAdminUser: (user: Omit<AdminUser, 'id' | 'createdAt'>, passwordPlain: string) => Promise<boolean>;
  updateAdminUserRole: (id: string, role: AdminRole) => Promise<boolean>;
  updateAdminUserStatus: (id: string, status: 'active' | 'disabled') => Promise<boolean>;
  deleteAdminUser: (id: string) => Promise<boolean>;

  // Activity Log & Reset
  logActivity: (action: string, entityType: string, entityId?: string, details?: string) => void;
  resetAllDataToDefaults: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILE: 'dr_bhushan_profile_v2',
  LOCATION: 'dr_bhushan_location_v2',
  TREATMENTS: 'dr_bhushan_treatments_v2',
  CANCERS: 'dr_bhushan_cancers_v2',
  BLOGS: 'dr_bhushan_blogs_v2',
  FAQS: 'dr_bhushan_faqs_v2',
  TESTIMONIALS: 'dr_bhushan_testimonials_v2',
  APPOINTMENTS: 'dr_bhushan_appointments_v2',
  SECOND_OPINIONS: 'dr_bhushan_second_opinions_v2',
  CONTACT_ENQUIRIES: 'dr_bhushan_contact_enquiries_v2',
  HERO_CONTENT: 'dr_bhushan_hero_content_v2',
  ABOUT_DOCTOR_CONTENT: 'dr_bhushan_about_doc_content_v2',
  SECOND_OPINION_CONTENT: 'dr_bhushan_second_op_content_v2',
  HERO_ANIMATION: 'dr_bhushan_hero_anim_v2',
  GLOBAL_ANIMATION: 'dr_bhushan_global_anim_v2',
  HOMEPAGE_SECTIONS: 'dr_bhushan_hp_sections_v2',
  LOCATIONS_LIST: 'dr_bhushan_locations_list_v2',
  BODY_REGIONS: 'dr_bhushan_body_regions_v2',
  CANCER_CATEGORIES: 'dr_bhushan_cancer_cats_v2',
  CANCER_PAGES: 'dr_bhushan_cancer_pages_v2',
  HOW_CAN_HELP: 'dr_bhushan_how_help_v2',
  JOURNEY_STEPS: 'dr_bhushan_journey_steps_v2',
  MEDIA_ASSETS: 'dr_bhushan_media_assets_v2',
  NAVIGATION: 'dr_bhushan_nav_menu_v2',
  FOOTER: 'dr_bhushan_footer_v2',
  SITE_SETTINGS: 'dr_bhushan_site_settings_v2',
  SEO_GLOBAL: 'dr_bhushan_seo_global_v2',
  REDIRECT_RULES: 'dr_bhushan_redirect_rules_v2',
  FORM_BUILDER: 'dr_bhushan_form_builder_v2',
  ADMIN_USERS: 'dr_bhushan_admin_users_v2',
  CURRENT_USER: 'dr_bhushan_current_user_v2',
  ACTIVITY_LOGS: 'dr_bhushan_activity_logs_v2',
  FINAL_CTA_CONTENT: 'dr_bhushan_final_cta_content_v2'
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State Declarations initialized with defaults, populated from Cloudflare D1
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>(initialDoctorProfile);
  const [practiceLocation, setPracticeLocation] = useState<PracticeLocation>(initialPracticeLocation);
  const [treatments, setTreatments] = useState<Treatment[]>(initialTreatments);
  const [cancers, setCancers] = useState<CancerType[]>(initialCancers);
  const [blogPosts, setBlogPosts] = useState<BlogPostRecord[]>(defaultBlogPosts);
  const [faqs, setFaqs] = useState<FAQItem[]>(initialFAQs);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
  const [appointments, setAppointments] = useState<AppointmentSubmission[]>([]);
  const [secondOpinions, setSecondOpinions] = useState<SecondOpinionSubmission[]>([]);
  const [contactEnquiries, setContactEnquiries] = useState<ContactEnquiryItem[]>([]);

  // Extended CMS Collections
  const [heroContent, setHeroContent] = useState<HeroContent>(defaultHeroContent);
  const [aboutDoctorContent, setAboutDoctorContent] = useState<AboutDoctorSectionContent>(defaultAboutDoctorContent);
  const [secondOpinionContent, setSecondOpinionContent] = useState<SecondOpinionSectionContent>(defaultSecondOpinionContent);
  const [finalCtaContent, setFinalCtaContent] = useState<FinalCtaSectionContent>(defaultFinalCtaContent);
  const [heroAnimationSettings, setHeroAnimationSettings] = useState<HeroAnimationSettings>(defaultHeroAnimationSettings);
  const [globalAnimationSettings, setGlobalAnimationSettings] = useState<GlobalAnimationSettings>(defaultGlobalAnimationSettings);
  const [homepageSections, setHomepageSections] = useState<HomepageSectionConfig[]>(defaultHomepageSections);
  const [locations, setLocations] = useState<LocationItem[]>(defaultLocations);
  const [bodyExplorerRegions, setBodyExplorerRegions] = useState<BodyExplorerRegionConfig[]>(defaultBodyExplorerRegions);
  const [cancerCategories, setCancerCategories] = useState<CancerCategoryItem[]>(defaultCancerCategories);
  const [cancerPages, setCancerPages] = useState<CancerPageRecord[]>(defaultCancerPages);
  const [howCanWeHelp, setHowCanWeHelp] = useState<HowCanWeHelpItem[]>(defaultHowCanWeHelp);
  const [treatmentJourney, setTreatmentJourney] = useState<JourneyStepItem[]>(defaultJourneySteps);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(defaultMediaAssets);
  const [mediaSlots, setMediaSlots] = useState<Record<string, any>>({});
  const [navigationMenu, setNavigationMenu] = useState<NavigationMenuItem[]>(defaultNavigation);
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(defaultFooterConfig);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsConfig>(defaultSiteSettings);
  const [seoGlobalConfig, setSeoGlobalConfig] = useState<SeoGlobalConfig>(defaultSeoGlobalConfig);
  const [redirectRules, setRedirectRules] = useState<RedirectRule[]>(defaultRedirectRules);
  const [formBuilderConfig, setFormBuilderConfig] = useState<FormBuilderConfig>(defaultFormBuilderConfig);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(null);

  const [isLoadingFromCloudflare, setIsLoadingFromCloudflare] = useState(true);

  // FETCH AUTHENTICATED ADMIN DATA FROM D1
  const fetchAuthenticatedAdminData = useCallback(async (user: AdminUser) => {
    const { role } = user;

    // Enquiries & Second Opinions (Super Admin + Enquiry Manager)
    if (role === 'super_admin' || role === 'enquiry_manager') {
      try {
        const enqRes = await api.get('/api/admin/enquiries');
        if (enqRes.ok && enqRes.data?.enquiries) {
          const rawEnquiries = enqRes.data.enquiries;
          const apps: AppointmentSubmission[] = [];
          const contacts: ContactEnquiryItem[] = [];

          for (const row of rawEnquiries) {
            const type = row.type || 'contact';
            const statusNorm = (row.status || 'new').toLowerCase();
            const mappedStatus = 
              statusNorm === 'replied' ? 'Replied' :
              statusNorm === 'archived' ? 'Archived' :
              statusNorm === 'confirmed' ? 'Confirmed' :
              statusNorm === 'completed' ? 'Completed' :
              statusNorm === 'cancelled' ? 'Cancelled' :
              statusNorm === 'in_progress' ? 'In Progress' :
              statusNorm === 'contacted' ? 'Contacted' : 'New';

            if (type === 'appointment') {
              apps.push({
                id: row.id,
                patientName: row.name,
                phone: row.phone,
                email: row.email || '',
                consultationType: row.consultation_type || 'In-Person (Hospital)',
                cancerTypeOrConcern: row.cancer_type || '',
                preferredDate: row.preferred_date || '',
                preferredSlot: row.preferred_time || '',
                patientNotes: row.message || '',
                notes: row.admin_notes || '',
                submittedAt: row.created_at || new Date().toISOString(),
                status: mappedStatus as any
              });
            } else {
              contacts.push({
                id: row.id,
                name: row.name,
                phone: row.phone,
                email: row.email || '',
                message: row.message || '',
                sourcePage: 'Website Contact',
                submittedDate: row.created_at || new Date().toISOString(),
                status: mappedStatus as any,
                notes: row.admin_notes || ''
              });
            }
          }
          setAppointments(apps);
          setContactEnquiries(contacts);
        }
      } catch (err) {
        console.warn('Failed to fetch enquiries:', err);
        setAppointments([]);
        setContactEnquiries([]);
      }

      try {
        const soRes = await api.get('/api/admin/second-opinions');
        if (soRes.ok && soRes.data?.requests) {
          const rawSo = soRes.data.requests;
          const mappedSo: SecondOpinionSubmission[] = rawSo.map((r: any) => {
            const statusNorm = (r.status || 'pending').toLowerCase();
            const mappedStatus =
              statusNorm === 'reviewed' ? 'Reviewed' :
              statusNorm === 'completed' ? 'Completed' :
              statusNorm === 'archived' ? 'Archived' : 'Pending Review';

            return {
              id: r.id,
              name: r.patient_name || r.name,
              phone: r.phone || '',
              email: r.email || '',
              cityCountry: r.city || '',
              cancerType: r.cancer_type || '',
              currentDiagnosis: r.stage || '',
              previousTreatment: r.current_treatment || r.previousTreatment || '',
              message: r.specific_questions || r.message || '',
              attachedFiles: (r.files || []).map((f: any) => ({
                id: f.id,
                name: f.original_filename || f.name,
                size: f.file_size || f.size || 0,
                type: f.mime_type || f.type || 'application/octet-stream',
                category: f.file_type || 'Other'
              })),
              submittedAt: r.created_at || new Date().toISOString(),
              status: (['new', 'pending', 'pending_review', 'under_review'].includes((r.status || '').toLowerCase()) 
                       ? 'Pending Review' 
                       : (r.status || '').toLowerCase() === 'contacted' 
                         ? 'Contacted' 
                         : ['reviewed', 'report_ready', 'completed'].includes((r.status || '').toLowerCase()) 
                           ? 'Reviewed' 
                           : 'Pending Review') as any,
              notes: r.doctor_notes || r.notes || ''
            };
          });
          setSecondOpinions(mappedSo);
        }
      } catch (err) {
        console.warn('Failed to fetch second opinions:', err);
        setSecondOpinions([]);
      }
    }

    // Admin Users (Super Admin Only)
    if (role === 'super_admin') {
      try {
        const usersRes = await api.get('/api/admin/users');
        if (usersRes.ok && usersRes.data?.users) {
          const rawUsers = usersRes.data.users;
          const mappedUsers: AdminUser[] = rawUsers.map((u: any) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            status: u.status || 'active',
            lastLogin: u.last_login || u.lastLogin,
            createdAt: u.created_at ? u.created_at.split('T')[0] : (u.createdAt || new Date().toISOString().split('T')[0])
          }));
          setAdminUsers(mappedUsers);
        }
      } catch (err) {
        console.warn('Failed to fetch admin users:', err);
        setAdminUsers([]);
      }
    }
  }, []);

  // FETCH ALL DATA FROM CLOUDFLARE D1 WORKER API ON MOUNT & ROUTE CHANGE
  const fetchCloudflareData = useCallback(async () => {
    try {
      setIsLoadingFromCloudflare(true);
      try {
        const sessionRes = await api.get('/api/admin/auth/session');
        if (sessionRes.data?.user) {
          const user = sessionRes.data.user;
          setCurrentAdminUser(user);
          await fetchAuthenticatedAdminData(user);
        } else {
          setCurrentAdminUser(null);
        }
      } catch {
        setCurrentAdminUser(null);
      }

      const res = await api.get('/api/public/site');
      if (res.ok && res.data) {
        const data = res.data;
        if (data.siteSettings) {
          setSiteSettings(data.siteSettings);
          if (data.siteSettings.seoGlobalConfig) {
            setSeoGlobalConfig(data.siteSettings.seoGlobalConfig);
          } else if (data.siteSettings.seo) {
            setSeoGlobalConfig(data.siteSettings.seo);
          }
          if (Array.isArray(data.siteSettings.redirectRules)) {
            setRedirectRules(data.siteSettings.redirectRules);
          }
          if (data.siteSettings.formBuilderConfig) {
            setFormBuilderConfig(data.siteSettings.formBuilderConfig);
          }
        }
        if (data.doctorProfile) {
          setDoctorProfile({
            ...initialDoctorProfile,
            ...data.doctorProfile,
            fullBio: Array.isArray(data.doctorProfile.fullBio) ? data.doctorProfile.fullBio : (initialDoctorProfile.fullBio || []),
            qualifications: Array.isArray(data.doctorProfile.qualifications) ? data.doctorProfile.qualifications : (initialDoctorProfile.qualifications || []),
            coreExpertise: Array.isArray(data.doctorProfile.coreExpertise) ? data.doctorProfile.coreExpertise : (initialDoctorProfile.coreExpertise || []),
            memberships: Array.isArray(data.doctorProfile.memberships) ? data.doctorProfile.memberships : (initialDoctorProfile.memberships || [])
          });
        }
        if (data.heroContent) setHeroContent(data.heroContent);
        if (data.aboutDoctorContent) setAboutDoctorContent(data.aboutDoctorContent);
        if (data.secondOpinionContent) setSecondOpinionContent(data.secondOpinionContent);
        if (data.finalCtaContent) setFinalCtaContent(data.finalCtaContent);
        if (data.heroAnimationSettings) setHeroAnimationSettings(data.heroAnimationSettings);
        if (data.globalAnimationSettings) setGlobalAnimationSettings(data.globalAnimationSettings);
        if (data.homepageSections) setHomepageSections(data.homepageSections);
        if (data.howCanWeHelp) setHowCanWeHelp(Array.isArray(data.howCanWeHelp) ? data.howCanWeHelp : []);
        if (data.treatmentJourney) setTreatmentJourney(Array.isArray(data.treatmentJourney) ? data.treatmentJourney : []);
        if (data.cancers) setCancers(Array.isArray(data.cancers) ? data.cancers : []);
        if (data.cancerCategories) setCancerCategories(Array.isArray(data.cancerCategories) ? data.cancerCategories : []);
        if (data.cancerPages) setCancerPages(Array.isArray(data.cancerPages) ? data.cancerPages : []);
        if (data.treatments) setTreatments(Array.isArray(data.treatments) ? data.treatments : []);
        if (data.bodyExplorerRegions) {
          const normalized = data.bodyExplorerRegions.map((r: any) => {
            const normId = r.id === 'chest-lungs' ? 'chest-lung' : (r.id === 'abdomen-gi' ? 'gastrointestinal' : (r.id === 'pelvis-gu' ? 'genitourinary' : r.id));
            const matchedDefault = defaultBodyExplorerRegions.find((d: any) => d.id === normId);
            return {
              ...matchedDefault,
              ...r,
              id: r.id, // preserve database ID
              hotspot: r.hotspot || matchedDefault?.hotspot || { x: r.x_percent ?? r.xPercent ?? 50, y: r.y_percent ?? r.yPercent ?? 50 },
              connectorOffset: r.connectorOffset || matchedDefault?.connectorOffset || { dx: 38, dy: -6 },
              conditions: Array.isArray(r.conditions) ? r.conditions : (matchedDefault?.conditions || []),
              treatments: Array.isArray(r.treatments) ? r.treatments : (matchedDefault?.treatments || [])
            };
          });
          setBodyExplorerRegions(normalized);
        }
        const locs = Array.isArray(data.locations) ? data.locations : [];
        setLocations(locs);
        const primary = locs.find((l: any) => Boolean(l.is_primary ?? l.isPrimary)) || locs[0];
        if (primary) {
          setPracticeLocation({
            hospitalName: primary.hospital_name || primary.hospitalName || '',
            department: primary.department || '',
            addressLine1: primary.address_line1 || primary.addressLine1 || '',
            addressLine2: primary.address_line2 || primary.addressLine2 || '',
            city: primary.city || '',
            state: primary.state || '',
            pincode: primary.pincode || '',
            consultationTimings: primary.opd_timings || primary.consultationTimings || '',
            daysAvailable: primary.days_available || primary.daysAvailable || '',
            phonePrimary: primary.phone || primary.phonePrimary || '',
            phoneSecondary: primary.phone_secondary || primary.phoneSecondary || '',
            whatsappNumber: primary.whatsapp || primary.whatsappNumber || '',
            emailContact: primary.email || primary.emailContact || '',
            googleMapsEmbedUrl: primary.google_maps_embed_url || primary.googleMapsEmbedUrl || '',
            googleMapsDirectionsUrl: primary.google_maps_url || primary.googleMapsDirectionsUrl || ''
          });
        } else {
          setPracticeLocation(initialPracticeLocation);
        }
        if (data.blogPosts) setBlogPosts(Array.isArray(data.blogPosts) ? data.blogPosts : []);
        if (data.faqs) setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
        if (data.testimonials) setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : []);
        if (data.navigationMenu) setNavigationMenu(data.navigationMenu);
        if (data.footerConfig) setFooterConfig(data.footerConfig);
        if (data.mediaAssets) setMediaAssets(data.mediaAssets);
        if (data.mediaSlots) setMediaSlots(data.mediaSlots);
      }
    } catch (err) {
      console.warn('Unable to load from Cloudflare Worker API, using active memory state:', err);
    } finally {
      setIsLoadingFromCloudflare(false);
    }
  }, []);

  useEffect(() => {
    fetchCloudflareData();
  }, [fetchCloudflareData]);

  // Route & Modal States
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
  });

  const [activeSection, setActiveSection] = useState<string>('home');
  const [selectedCancerSlug, setSelectedCancerSlug] = useState<string | null>(null);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
  const [selectedBlogSlug, setSelectedBlogSlug] = useState<string | null>(null);
  const [selectedLocalSeoSlug, setSelectedLocalSeoSlug] = useState<string | null>(null);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isSecondOpinionModalOpen, setIsSecondOpinionModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Sync route on popstate and hashchange
  useEffect(() => {
    const checkRoute = () => {
      const isAdm = window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
      setIsAdminRoute(isAdm);
    };
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  const navigateToAdmin = useCallback(() => {
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToPublic = useCallback(() => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Activity Logger
  const logActivity = useCallback((action: string, entityType: string, entityId?: string, details?: string) => {
    const uniqueEntropy = Math.random().toString(36).substring(2, 9);
    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}-${uniqueEntropy}`,
      userEmail: currentAdminUser?.email || 'admin',
      userName: currentAdminUser?.name || 'Administrator',
      action,
      entityType,
      entityId,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      details
    };
    setActivityLogs(prev => {
      const existing = prev.filter(l => l.id !== newLog.id);
      return [newLog, ...existing.slice(0, 199)];
    });
  }, [currentAdminUser]);

  // Authentication Logic
  const adminLogin = async (
    email: string,
    pass: string,
    rememberMe = false
  ): Promise<{ success: boolean; error?: string; user?: AdminUser }> => {
    try {
      const response = await api.post('/api/admin/auth/login', {
        email,
        password: pass,
        rememberMe
      });
      if (response.data?.user) {
        const user = response.data.user;
        setCurrentAdminUser(user);
        await fetchAuthenticatedAdminData(user);
        logActivity('LOGIN', 'AUTH', user.id, `Signed in as ${user.role} (${user.email})`);
        return { success: true, user };
      }
      return { success: false, error: 'Invalid response from authentication server.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed. Please verify credentials.' };
    }
  };

  const loginAdmin = (_password: string): boolean => {
    return false;
  };

  const adminLogout = async () => {
    try {
      await api.post('/api/admin/auth/logout');
    } catch {}
    if (currentAdminUser) {
      logActivity('LOGOUT', 'AUTH', currentAdminUser.id, `Signed out (${currentAdminUser.email})`);
    }
    setCurrentAdminUser(null);
    setAppointments([]);
    setSecondOpinions([]);
    setContactEnquiries([]);
    setAdminUsers([]);
    setActivityLogs([]);
  };

  const logoutAdmin = () => {
    adminLogout();
  };

  // CMS Updaters - Send updates directly to Cloudflare D1 Worker API using centralized api client
  const updateDoctorProfile = async (profile: Partial<DoctorProfile>): Promise<boolean> => {
    try {
      await api.put('/api/admin/doctor', profile);
      setDoctorProfile(prev => ({ ...prev, ...profile }));
      logActivity('UPDATE', 'DOCTOR_PROFILE', 'dr-bhushan', 'Doctor profile updated in D1');
      return true;
    } catch (error) {
      console.warn('Failed to update doctor profile in D1', error);
      return false;
    }
  };

  const updatePracticeLocation = (loc: Partial<PracticeLocation>) => {
    setPracticeLocation(prev => ({ ...prev, ...loc }));
    logActivity('UPDATE', 'LOCATION', 'primary-loc', 'Primary practice location updated');
  };

  const updateHeroContent = async (content: Partial<HeroContent>): Promise<boolean> => {
    try {
      const updatedHero = { ...heroContent, ...content };
      await api.put('/api/admin/homepage', { hero: updatedHero });
      setHeroContent(updatedHero);
      logActivity('UPDATE', 'HERO', 'sec-hero', 'Hero headlines, CTA or credentials updated in D1');
      return true;
    } catch (error) {
      console.warn('Failed to update hero content', error);
      return false;
    }
  };

  const updateAboutDoctorContent = async (content: Partial<AboutDoctorSectionContent>): Promise<boolean> => {
    try {
      const updatedAbout = { ...aboutDoctorContent, ...content };
      await api.put('/api/admin/homepage', { about: updatedAbout });
      setAboutDoctorContent(updatedAbout);
      logActivity('UPDATE', 'ABOUT_DOCTOR', 'sec-about', 'About doctor section content / photo updated in D1');
      return true;
    } catch (error) {
      console.warn('Failed to update about doctor content', error);
      return false;
    }
  };

  const updateSecondOpinionContent = async (content: Partial<SecondOpinionSectionContent>): Promise<boolean> => {
    try {
      const updatedSec = { ...secondOpinionContent, ...content };
      await api.put('/api/admin/homepage', { second_opinion: updatedSec });
      setSecondOpinionContent(updatedSec);
      logActivity('UPDATE', 'SECOND_OPINION', 'sec-second-opinion', 'Second opinion section content / photo updated in D1');
      return true;
    } catch (error) {
      console.warn('Failed to update second opinion content', error);
      return false;
    }
  };

  const updateFinalCtaContent = async (content: Partial<FinalCtaSectionContent>): Promise<boolean> => {
    try {
      const updatedCta = { ...finalCtaContent, ...content };
      await api.put('/api/admin/homepage', { final_cta: updatedCta });
      setFinalCtaContent(updatedCta);
      logActivity('UPDATE', 'FINAL_CTA', 'sec-final-cta', 'Final Consultation CTA section content / doctor image updated in D1');
      return true;
    } catch (error) {
      console.warn('Failed to update final cta content', error);
      return false;
    }
  };

  const updateHeroAnimationSettings = async (settings: Partial<HeroAnimationSettings>): Promise<boolean> => {
    try {
      const updated = { ...heroAnimationSettings, ...settings };
      await api.put('/api/admin/homepage', { animations: updated });
      setHeroAnimationSettings(updated);
      logActivity('UPDATE', 'ANIMATION', 'hero-anim', 'Hero animations adjusted in D1');
      return true;
    } catch (error) {
      console.warn('Failed to update hero animation settings', error);
      return false;
    }
  };

  const updateGlobalAnimationSettings = async (settings: Partial<GlobalAnimationSettings>): Promise<boolean> => {
    try {
      const updated = { ...globalAnimationSettings, ...settings };
      await api.put('/api/admin/homepage', { globalAnimationSettings: updated });
      setGlobalAnimationSettings(updated);
      logActivity('UPDATE', 'ANIMATION', 'global-anim', 'Global animation and marquee updated in D1');
      return true;
    } catch (error) {
      console.warn('Failed to update global animation settings', error);
      return false;
    }
  };

  const updateHomepageSections = async (sections: HomepageSectionConfig[]): Promise<boolean> => {
    try {
      await api.put('/api/admin/homepage', { sections });
      setHomepageSections(sections);
      logActivity('REORDER', 'HOMEPAGE_SECTIONS', 'homepage', 'Homepage section order and visibility modified in D1');
      return true;
    } catch (error) {
      console.warn('Failed to update homepage sections', error);
      return false;
    }
  };

  const updateLocations = async (newLocs: LocationItem[]) => {
    await api.put('/api/admin/locations', { locations: newLocs });
    setLocations(newLocs);
    logActivity('UPDATE', 'LOCATIONS', 'all', 'Hospital and clinic consultation locations updated');
  };

  const updateBlogPosts = async (posts: BlogPostRecord[]) => {
    await api.put('/api/admin/blogs', { blogs: posts });
    setBlogPosts(posts);
    logActivity('UPDATE', 'BLOGS', 'all', 'Patient education blog posts and guides updated in D1');
  };

  const addLocation = async (location: LocationItem) => {
    await api.post('/api/admin/locations', location);
    setLocations(prev => [...prev, location]);
    logActivity('CREATE', 'LOCATION', location.id, `Added new consultation location: ${location.hospitalName}`);
  };

  const deleteLocation = async (id: string) => {
    await api.delete(`/api/admin/locations/${id}`);
    setLocations(prev => prev.filter(l => l.id !== id));
    logActivity('DELETE', 'LOCATION', id, 'Deleted location record');
  };

  const updateBodyExplorerRegion = async (id: string, region: Partial<BodyExplorerRegionConfig>) => {
    const updated = bodyExplorerRegions.map(r => (r.id === id ? { ...r, ...region } : r));
    await api.put('/api/admin/body-explorer', { bodyExplorerRegions: updated });
    setBodyExplorerRegions(updated);
    logActivity('UPDATE', 'BODY_EXPLORER', id, `Updated interactive anatomy hotspot coordinates and conditions for ${id}`);
  };

  const resetBodyExplorerRegions = async () => {
    await api.put('/api/admin/body-explorer', { bodyExplorerRegions: defaultBodyExplorerRegions });
    setBodyExplorerRegions(defaultBodyExplorerRegions);
    logActivity('RESET', 'BODY_EXPLORER', 'all', 'Reset anatomy hotspot positions to factory defaults');
  };

  const updateCancerCategories = async (cats: CancerCategoryItem[]) => {
    await api.put('/api/admin/cancer-categories', { categories: cats });
    setCancerCategories(cats);
    logActivity('UPDATE', 'CANCER_CATEGORIES', 'all', 'Cancer categories updated');
  };

  const updateCancerPage = async (id: string, page: Partial<CancerPageRecord>) => {
    const updated = cancerPages.map(p =>
      p.id === id ? { ...p, ...page, updatedAt: new Date().toISOString().split('T')[0] } : p
    );
    await api.put('/api/admin/cancer-pages', { cancerPages: updated });
    setCancerPages(updated);
    logActivity('UPDATE', 'CANCER_PAGE', id, `Updated cancer page: ${page.pageTitle || id}`);
  };

  const addCancerPage = async (page: CancerPageRecord) => {
    const updated = [page, ...cancerPages];
    await api.put('/api/admin/cancer-pages', { cancerPages: updated });
    setCancerPages(updated);
    logActivity('CREATE', 'CANCER_PAGE', page.id, `Created new cancer care page: ${page.pageTitle}`);
  };

  const deleteCancerPage = async (id: string) => {
    const updated = cancerPages.filter(p => p.id !== id);
    await api.put('/api/admin/cancer-pages', { cancerPages: updated });
    setCancerPages(updated);
    logActivity('DELETE', 'CANCER_PAGE', id, 'Deleted cancer page');
  };

  const updateHowCanWeHelp = async (items: HowCanWeHelpItem[]): Promise<boolean> => {
    try {
      await api.put('/api/admin/homepage', { how_can_we_help: items });
      setHowCanWeHelp(items);
      logActivity('UPDATE', 'HOW_HELP', 'all', 'Updated How Can We Help patient cards in D1');
      return true;
    } catch (error) {
      console.warn('Failed to update how can we help cards', error);
      return false;
    }
  };

  const updateTreatmentJourney = async (steps: JourneyStepItem[]): Promise<boolean> => {
    try {
      await api.put('/api/admin/homepage', { treatment_journey: steps });
      setTreatmentJourney(steps);
      logActivity('UPDATE', 'JOURNEY', 'all', 'Updated treatment journey stages in D1');
      return true;
    } catch (error) {
      console.warn('Failed to update treatment journey', error);
      return false;
    }
  };

  const updateTreatment = async (id: string, data: Partial<Treatment>) => {
    await api.put(`/api/admin/treatments/${id}`, data);
    const updated = treatments.map(t => (t.id === id ? { ...t, ...data } : t));
    setTreatments(updated);
    logActivity('UPDATE', 'TREATMENT', id, `Updated treatment: ${data.title || id}`);
  };

  const addTreatment = async (treatment: Treatment) => {
    await api.post('/api/admin/treatments', treatment);
    setTreatments(prev => [...prev, treatment]);
    logActivity('CREATE', 'TREATMENT', treatment.id, `Added treatment: ${treatment.title}`);
  };

  const deleteTreatment = async (id: string) => {
    await api.delete(`/api/admin/treatments/${id}`);
    setTreatments(prev => prev.filter(t => t.id !== id));
    logActivity('DELETE', 'TREATMENT', id, 'Deleted treatment');
  };

  const updateCancer = async (id: string, data: Partial<CancerType>) => {
    await api.put(`/api/admin/cancers/${id}`, data);
    const updated = cancers.map(c => (c.id === id ? { ...c, ...data } : c));
    setCancers(updated);
    logActivity('UPDATE', 'CANCER_TYPE', id, `Updated cancer type: ${data.name || id}`);
  };

  const addCancer = async (cancer: CancerType) => {
    await api.post('/api/admin/cancers', cancer);
    setCancers(prev => [...prev, cancer]);
    logActivity('CREATE', 'CANCER_TYPE', cancer.id, `Added cancer type: ${cancer.name}`);
  };

  const deleteCancer = async (id: string) => {
    await api.delete(`/api/admin/cancers/${id}`);
    setCancers(prev => prev.filter(c => c.id !== id));
    logActivity('DELETE', 'CANCER_TYPE', id, 'Deleted cancer type');
  };

  const updateBlogPost = async (id: string, data: any) => {
    await api.put(`/api/admin/blogs/${id}`, data);
    const updated = blogPosts.map(b => (b.id === id ? { ...b, ...data } : b));
    setBlogPosts(updated);
    logActivity('UPDATE', 'BLOG_POST', id, `Updated article: ${data.title || id}`);
  };

  const addBlogPost = async (post: any) => {
    await api.post('/api/admin/blogs', post);
    setBlogPosts(prev => [post as any, ...prev]);
    logActivity('CREATE', 'BLOG_POST', post.id, `Published new article: ${post.title}`);
  };

  const deleteBlogPost = async (id: string) => {
    await api.delete(`/api/admin/blogs/${id}`);
    setBlogPosts(prev => prev.filter(b => b.id !== id));
    logActivity('DELETE', 'BLOG_POST', id, 'Deleted blog article');
  };

  const updateFAQ = async (id: string, data: Partial<FAQItem>) => {
    await api.put(`/api/admin/faqs/${id}`, data);
    const updated = faqs.map(f => (f.id === id ? { ...f, ...data } : f));
    setFaqs(updated);
    logActivity('UPDATE', 'FAQ', id, 'Updated FAQ question/answer');
  };

  const addFAQ = async (faq: FAQItem) => {
    await api.post('/api/admin/faqs', faq);
    setFaqs(prev => [...prev, faq]);
    logActivity('CREATE', 'FAQ', faq.id, 'Created new FAQ item');
  };

  const deleteFAQ = async (id: string) => {
    await api.delete(`/api/admin/faqs/${id}`);
    setFaqs(prev => prev.filter(f => f.id !== id));
    logActivity('DELETE', 'FAQ', id, 'Deleted FAQ item');
  };

  const updateTestimonials = async (newTestimonials: Testimonial[]) => {
    await api.put('/api/admin/testimonials', { testimonials: newTestimonials });
    setTestimonials(newTestimonials);
    logActivity('UPDATE', 'TESTIMONIALS', 'all', 'Updated patient testimonials and reviews');
  };

  const addMediaAsset = (asset: MediaAsset) => {
    setMediaAssets(prev => [asset, ...prev]);
    logActivity('CREATE', 'MEDIA', asset.id, `Uploaded media asset: ${asset.title}`);
  };

  const deleteMediaAsset = (id: string) => {
    setMediaAssets(prev => prev.filter(m => m.id !== id));
    logActivity('DELETE', 'MEDIA', id, 'Removed media asset');
  };

  const saveSlotDraft = async (slotKey: string, draftValue: string, meta?: any): Promise<boolean> => {
    const res = await api.put(`/api/admin/media-slots/${slotKey}`, { draftValue, ...meta });
    if (res.ok) {
      setMediaSlots(prev => ({
        ...prev,
        [slotKey]: {
          ...(prev[slotKey] || { slotKey }),
          draftValue,
          status: 'draft_saved',
          updatedAt: new Date().toISOString(),
          ...meta
        }
      }));
      logActivity('SAVE_DRAFT', 'MEDIA_SLOT', slotKey, `Saved draft image assignment for ${slotKey}`);
      return true;
    }
    return false;
  };

  const publishSlot = async (slotKey: string): Promise<boolean> => {
    const res = await api.post(`/api/admin/media-slots/${slotKey}/publish`);
    if (res.ok) {
      if (res.data?.slot) {
        setMediaSlots(prev => ({ ...prev, [slotKey]: res.data.slot }));
      }
      await fetchCloudflareData();
      logActivity('PUBLISH', 'MEDIA_SLOT', slotKey, `Published image assignment for ${slotKey} to live website`);
      return true;
    }
    return false;
  };

  const publishAllSlots = async (): Promise<boolean> => {
    const res = await api.post('/api/admin/media-slots/publish-all');
    if (res.ok) {
      await fetchCloudflareData();
      logActivity('PUBLISH_ALL', 'MEDIA_SLOTS', 'all', 'Published all pending media drafts to live website');
      return true;
    }
    return false;
  };

  const SLOT_ALIASES: Record<string, string[]> = {
    'slot-hero-doc': ['slot-hero-doc', 'slot-hero-doctor'],
    'slot-hero-doctor': ['slot-hero-doctor', 'slot-hero-doc'],
    'slot-about-doc': ['slot-about-doc', 'slot-about-doctor'],
    'slot-about-doctor': ['slot-about-doctor', 'slot-about-doc'],
    'slot-final-cta-doc': ['slot-final-cta-doc', 'slot-final-cta-doctor'],
    'slot-final-cta-doctor': ['slot-final-cta-doctor', 'slot-final-cta-doc'],
    'slot-second-opinion-doctor': ['slot-second-opinion-doctor', 'slot-second-opinion-doc', 'slot-second-opinion'],
    'slot-second-opinion-doc': ['slot-second-opinion-doc', 'slot-second-opinion-doctor', 'slot-second-opinion'],
    'slot-second-opinion': ['slot-second-opinion', 'slot-second-opinion-doctor', 'slot-second-opinion-doc'],
    'slot-branding-logo': ['slot-branding-logo', 'slot-branding-logo-dark', 'slot-logo'],
    'slot-branding-logo-dark': ['slot-branding-logo-dark', 'slot-branding-logo'],
    'slot-branding-logo-light': ['slot-branding-logo-light', 'slot-branding-logo'],
    'slot-favicon': ['slot-favicon', 'slot-branding-favicon'],
    'slot-og-social': ['slot-og-social', 'slot-social-og']
  };

  const getSlotMediaUrl = useCallback((slotKey: string, customFallback?: string): string => {
    const candidates = SLOT_ALIASES[slotKey] || [slotKey];
    let slotRecord: any = null;
    for (const key of candidates) {
      if (mediaSlots[key]) {
        slotRecord = mediaSlots[key];
        break;
      }
    }

    const slotDef = getMediaSlotDefinition(slotKey) || (candidates[1] ? getMediaSlotDefinition(candidates[1]) : undefined);
    const rawFallback = customFallback || slotDef?.defaultFallbackUrl || '';
    const fallback = rawFallback ? resolveMediaUrl(rawFallback, mediaAssets) : '';

    if (!slotRecord) return fallback;

    const isDraftPreview = typeof window !== 'undefined' && window.location.search.includes('preview=draft');
    const rawTarget = isDraftPreview
      ? (slotRecord.draftValue || slotRecord.publishedValue)
      : slotRecord.publishedValue;

    if (!rawTarget || !rawTarget.trim()) return fallback;

    const resolved = resolveMediaUrl(rawTarget, mediaAssets);
    return (resolved && resolved.trim()) ? resolved.trim() : fallback;
  }, [mediaSlots, mediaAssets]);

  const updateNavigationMenu = async (menu: NavigationMenuItem[]): Promise<boolean> => {
    try {
      await api.put('/api/admin/navigation', { navigation: menu });
      setNavigationMenu(menu);
      logActivity('UPDATE', 'NAVIGATION', 'header', 'Updated header navigation menu');
      return true;
    } catch (error) {
      console.warn('Failed to update navigation menu', error);
      return false;
    }
  };

  const updateFooterConfig = async (footer: Partial<FooterConfig>): Promise<boolean> => {
    try {
      const updated = { ...footerConfig, ...footer };
      await api.put('/api/admin/footer', updated);
      setFooterConfig(updated);
      logActivity('UPDATE', 'FOOTER', 'footer', 'Updated footer content and disclaimer');
      return true;
    } catch (error) {
      console.warn('Failed to update footer config', error);
      return false;
    }
  };

  const updateSiteSettings = async (settings: Partial<SiteSettingsConfig>): Promise<boolean> => {
    try {
      const updated = { ...siteSettings, ...settings };
      await api.put('/api/admin/site-settings', updated);
      setSiteSettings(updated);
      logActivity('UPDATE', 'SITE_SETTINGS', 'global', 'Updated site settings, emergency notice or announcement bar');
      return true;
    } catch (error) {
      console.warn('Failed to update site settings', error);
      return false;
    }
  };

  const updateSeoGlobalConfig = async (seo: Partial<SeoGlobalConfig>) => {
    const updated = { ...seoGlobalConfig, ...seo };
    await api.put('/api/admin/site-settings', { seoGlobalConfig: updated });
    setSeoGlobalConfig(updated);
    logActivity('UPDATE', 'SEO', 'global', 'Updated global SEO meta and schema properties in D1');
  };

  const updateRedirectRules = async (rules: RedirectRule[]) => {
    await api.put('/api/admin/site-settings', { redirectRules: rules });
    setRedirectRules(rules);
    logActivity('UPDATE', 'REDIRECTS', 'all', 'Updated URL 301/302 redirect rules in D1');
  };

  const updateFormBuilderConfig = async (
    config: Partial<FormBuilderConfig>
  ): Promise<boolean> => {
    try {
      const updated = {
        ...formBuilderConfig,
        ...config
      };

      await api.put('/api/admin/site-settings', {
        formBuilderConfig: updated
      });

      setFormBuilderConfig(updated);

      logActivity(
        'UPDATE',
        'FORMS',
        'all',
        'Updated public form configuration in D1'
      );

      return true;
    } catch (error) {
      console.warn('Failed to update form builder configuration', error);
      return false;
    }
  };

  // Submissions
  const submitAppointment = async (
    data: Omit<AppointmentSubmission, 'id' | 'submittedAt' | 'status'>
  ): Promise<boolean> => {
    try {
      const res = await api.post('/api/public/enquiries', {
        type: 'appointment',
        name: data.patientName,
        phone: data.phone,
        email: data.email,
        preferred_date: data.preferredDate,
        preferred_time: data.preferredSlot,
        cancer_type: data.cancerTypeOrConcern,
        consultation_type: data.consultationType,
        message: data.notes || ''
      });
      if (!res.ok) {
        return false;
      }
      const id = res.data?.enquiryId || `app-${Date.now()}`;
      const newSubmission: AppointmentSubmission = {
        ...data,
        id,
        submittedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        status: 'New'
      };
      setAppointments(prev => [newSubmission, ...prev]);
      logActivity('NEW_SUBMISSION', 'APPOINTMENT', newSubmission.id, `New appointment booked by ${data.patientName}`);
      return true;
    } catch (e) {
      console.warn('API error submitting appointment:', e);
      return false;
    }
  };

  const updateAppointmentStatus = async (id: string, status: AppointmentSubmission['status'], notes?: string): Promise<boolean> => {
    try {
      await api.put(`/api/admin/enquiries/${id}`, { status, notes });
      setAppointments(prev =>
        prev.map(a => (a.id === id ? { ...a, status, ...(notes ? { notes } : {}) } : a))
      );
      logActivity('STATUS_CHANGE', 'APPOINTMENT', id, `Changed appointment status to ${status}`);
      return true;
    } catch (error) {
      console.warn('Failed to update appointment status', error);
      return false;
    }
  };

  const deleteAppointment = async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/admin/enquiries/${id}`);
      setAppointments(prev => prev.filter(a => a.id !== id));
      logActivity('DELETE', 'APPOINTMENT', id, 'Deleted appointment lead');
      return true;
    } catch (error) {
      console.warn('Failed to delete appointment', error);
      return false;
    }
  };

  const submitSecondOpinion = async (
    data: Omit<SecondOpinionSubmission, 'id' | 'submittedAt' | 'status'> & { requestId?: string }
  ): Promise<boolean> => {
    try {
      const res = await api.post('/api/public/second-opinion', {
        requestId: data.requestId,
        patient_name: data.name,
        phone: data.phone,
        email: data.email,
        city: data.cityCountry,
        cancer_type: data.cancerType,
        stage: data.currentDiagnosis,
        current_treatment: data.previousTreatment,
        specific_questions: data.message,
        fileIds: (data.attachedFiles || []).map((f: any) => f.fileId || f.id)
      });
      if (!res.ok) {
        return false;
      }
      const id = res.data?.requestId || data.requestId || `so-${Date.now()}`;
      const newSubmission: SecondOpinionSubmission = {
        ...data,
        id,
        submittedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        status: 'Pending Review'
      };
      setSecondOpinions(prev => [newSubmission, ...prev]);
      logActivity('NEW_SUBMISSION', 'SECOND_OPINION', newSubmission.id, `Second opinion requested by ${data.name}`);
      return true;
    } catch (e) {
      console.warn('API error submitting second opinion:', e);
      return false;
    }
  };

  const updateSecondOpinionStatus = async (id: string, status: SecondOpinionSubmission['status'], notes?: string): Promise<boolean> => {
    try {
      await api.put(`/api/admin/second-opinions/${id}`, { status, doctorNotes: notes });
      setSecondOpinions(prev =>
        prev.map(s => (s.id === id ? { ...s, status } : s))
      );
      logActivity('STATUS_CHANGE', 'SECOND_OPINION', id, `Changed second opinion status to ${status}`);
      return true;
    } catch (error) {
      console.warn('Failed to update second opinion status', error);
      return false;
    }
  };

  const deleteSecondOpinion = async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/admin/second-opinions/${id}`);
      setSecondOpinions(prev => prev.filter(s => s.id !== id));
      logActivity('DELETE', 'SECOND_OPINION', id, 'Deleted second opinion submission');
      return true;
    } catch (error) {
      console.warn('Failed to delete second opinion', error);
      return false;
    }
  };

  const submitContactEnquiry = async (
    enquiry: Omit<ContactEnquiryItem, 'id' | 'submittedDate' | 'status'>
  ): Promise<boolean> => {
    try {
      const res = await api.post('/api/public/enquiries', {
        type: 'contact',
        name: enquiry.name,
        phone: enquiry.phone,
        email: enquiry.email,
        message: enquiry.message
      });
      if (!res.ok) {
        return false;
      }
      const id = res.data?.enquiryId || `enq-${Date.now()}`;
      const newEnq: ContactEnquiryItem = {
        ...enquiry,
        id,
        submittedDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        status: 'New'
      };
      setContactEnquiries(prev => [newEnq, ...prev]);
      logActivity('NEW_SUBMISSION', 'CONTACT_ENQUIRY', newEnq.id, `New contact enquiry from ${enquiry.name}`);
      return true;
    } catch (e) {
      console.warn('API error submitting contact enquiry:', e);
      return false;
    }
  };

  const updateContactEnquiryStatus = async (id: string, status: ContactEnquiryItem['status'], notes?: string): Promise<boolean> => {
    try {
      await api.put(`/api/admin/enquiries/${id}`, { status, notes });
      setContactEnquiries(prev =>
        prev.map(e => (e.id === id ? { ...e, status, ...(notes ? { notes } : {}) } : e))
      );
      logActivity('STATUS_CHANGE', 'CONTACT_ENQUIRY', id, `Updated enquiry status to ${status}`);
      return true;
    } catch (error) {
      console.warn('Failed to update contact enquiry status', error);
      return false;
    }
  };

  const deleteContactEnquiry = async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/admin/enquiries/${id}`);
      setContactEnquiries(prev => prev.filter(e => e.id !== id));
      logActivity('DELETE', 'CONTACT_ENQUIRY', id, 'Deleted contact enquiry');
      return true;
    } catch (error) {
      console.warn('Failed to delete contact enquiry', error);
      return false;
    }
  };

  // User Management (Super Admin)
  const addAdminUser = async (
    user: Omit<AdminUser, 'id' | 'createdAt'>,
    passwordPlain: string
  ): Promise<boolean> => {
    try {
      const res = await api.post('/api/admin/users', {
        email: user.email,
        name: user.name,
        role: user.role,
        password: passwordPlain
      });
      if (res.data?.user) {
        const newUser: AdminUser = {
          ...res.data.user,
          createdAt: new Date().toISOString().split('T')[0]
        };
        setAdminUsers(prev => [...prev, newUser]);
        logActivity('USER_CREATED', 'SECURITY', newUser.id, `Created admin user ${newUser.name} with role ${newUser.role}`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updateAdminUserRole = async (id: string, role: AdminRole): Promise<boolean> => {
    try {
      await api.put(`/api/admin/users/${id}`, { role });
      setAdminUsers(prev => prev.map(u => (u.id === id ? { ...u, role } : u)));
      logActivity('USER_ROLE_CHANGED', 'SECURITY', id, `Changed user role to ${role}`);
      return true;
    } catch (error) {
      console.warn('Failed to update admin role', error);
      return false;
    }
  };

  const updateAdminUserStatus = async (id: string, status: 'active' | 'disabled'): Promise<boolean> => {
    try {
      await api.put(`/api/admin/users/${id}`, { status });
      setAdminUsers(prev => prev.map(u => (u.id === id ? { ...u, status } : u)));
      logActivity('USER_STATUS_CHANGED', 'SECURITY', id, `Changed user status to ${status}`);
      return true;
    } catch (error) {
      console.warn('Failed to update admin user status', error);
      return false;
    }
  };

  const deleteAdminUser = async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/admin/users/${id}`);
      setAdminUsers(prev => prev.filter(u => u.id !== id));
      logActivity('USER_DELETED', 'SECURITY', id, 'Deleted administrator account');
      return true;
    } catch (error) {
      console.warn('Failed to delete admin user', error);
      return false;
    }
  };

  const resetAllDataToDefaults = () => {
    setDoctorProfile(initialDoctorProfile);
    setPracticeLocation(initialPracticeLocation);
    setTreatments([]);
    setCancers([]);
    setBlogPosts([]);
    setFaqs([]);
    setTestimonials([]);
    setHeroContent(defaultHeroContent);
    setAboutDoctorContent(defaultAboutDoctorContent);
    setSecondOpinionContent(defaultSecondOpinionContent);
    setHeroAnimationSettings(defaultHeroAnimationSettings);
    setGlobalAnimationSettings(defaultGlobalAnimationSettings);
    setHomepageSections(defaultHomepageSections);
    setLocations([]);
    setPracticeLocation(initialPracticeLocation);
    setBodyExplorerRegions([]);
    setCancerCategories([]);
    setCancerPages([]);
    setHowCanWeHelp([]);
    setTreatmentJourney([]);
    setMediaAssets([]);
    setNavigationMenu([]);
    setFooterConfig(defaultFooterConfig);
    setSiteSettings(defaultSiteSettings);
    setSeoGlobalConfig(defaultSeoGlobalConfig);
    setRedirectRules([]);
    setFormBuilderConfig(defaultFormBuilderConfig);
    setActivityLogs([]);
    setAdminUsers([]);
    setAppointments([]);
    setSecondOpinions([]);
    setContactEnquiries([]);
    localStorage.clear();
  };

  return (
    <DataContext.Provider
      value={{
        doctorProfile,
        practiceLocation,
        treatments,
        cancers,
        bloodCancers: bloodCancerDetails,
        blogPosts,
        faqs,
        testimonials,
        appointments,
        secondOpinions,
        contactEnquiries,
        localSeoList: localSeoPages,

        heroContent,
        aboutDoctorContent,
        secondOpinionContent,
        finalCtaContent,
        heroAnimationSettings,
        globalAnimationSettings,
        homepageSections,
        locations,
        bodyExplorerRegions,
        cancerCategories,
        cancerPages,
        howCanWeHelp,
        treatmentJourney,
        mediaAssets,
        navigationMenu,
        footerConfig,
        siteSettings,
        seoGlobalConfig,
        redirectRules,
        formBuilderConfig,
        activityLogs,
        adminUsers,
        currentAdminUser,
        adminRole: currentAdminUser?.role || null,

        activeSection,
        setActiveSection,
        selectedCancerSlug,
        setSelectedCancerSlug,
        selectedTreatmentId,
        setSelectedTreatmentId,
        selectedBlogSlug,
        setSelectedBlogSlug,
        selectedLocalSeoSlug,
        setSelectedLocalSeoSlug,
        isAdminRoute,
        navigateToAdmin,
        navigateToPublic,

        isAppointmentModalOpen,
        openAppointmentModal: () => setIsAppointmentModalOpen(true),
        closeAppointmentModal: () => setIsAppointmentModalOpen(false),
        isSecondOpinionModalOpen,
        openSecondOpinionModal: () => setIsSecondOpinionModalOpen(true),
        closeSecondOpinionModal: () => setIsSecondOpinionModalOpen(false),
        isAdminModalOpen,
        openAdminModal: () => setIsAdminModalOpen(true),
        closeAdminModal: () => setIsAdminModalOpen(false),

        isAdminLoggedIn: !!currentAdminUser,
        adminLogin,
        loginAdmin,
        adminLogout,
        logoutAdmin,

        updateDoctorProfile,
        updatePracticeLocation,
        updateHeroContent,
        updateAboutDoctorContent,
        updateSecondOpinionContent,
        updateFinalCtaContent,
        updateHeroAnimationSettings,
        updateGlobalAnimationSettings,
        updateHomepageSections,
        updateLocations,
        addLocation,
        deleteLocation,
        updateBodyExplorerRegion,
        resetBodyExplorerRegions,
        updateCancerCategories,
        updateCancerPage,
        addCancerPage,
        deleteCancerPage,
        updateHowCanWeHelp,
        updateTreatmentJourney,
        updateTreatment,
        addTreatment,
        deleteTreatment,
        updateCancer,
        addCancer,
        deleteCancer,
        updateBlogPost,
        updateBlogPosts,
        addBlogPost,
        deleteBlogPost,
        updateFAQ,
        addFAQ,
        deleteFAQ,
        updateTestimonials,
        addMediaAsset,
        deleteMediaAsset,
        mediaSlots,
        getSlotMediaUrl,
        saveSlotDraft,
        publishSlot,
        publishAllSlots,
        updateNavigationMenu,
        updateFooterConfig,
        updateSiteSettings,
        updateSeoGlobalConfig,
        updateRedirectRules,
        updateFormBuilderConfig,

        submitAppointment,
        updateAppointmentStatus,
        deleteAppointment,
        submitSecondOpinion,
        updateSecondOpinionStatus,
        deleteSecondOpinion,
        submitContactEnquiry,
        updateContactEnquiryStatus,
        deleteContactEnquiry,

        addAdminUser,
        updateAdminUserRole,
        updateAdminUserStatus,
        deleteAdminUser,

        logActivity,
        resetAllDataToDefaults
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
