import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getFieldConfig, validateFormFields } from '../utils/formBuilder';
import { TurnstileWidget } from './common/TurnstileWidget';
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Loader2,
  Building2
} from 'lucide-react';

export const ContactSection: React.FC = () => {
  const { practiceLocation, submitAppointment, formBuilderConfig } = useData();

  const [formData, setFormData] = useState({
    patientName: '',
    phone: '',
    email: '',
    preferredDate: '',
    preferredSlot: 'No preference',
    consultationType: 'In-Person (Hospital)' as 'In-Person (Hospital)' | 'Video Consultation',
    cancerTypeOrConcern: '',
    notes: '',
    honeypot: ''
  });

  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || '';
  const isTurnstileConfigured = Boolean(rawSiteKey && rawSiteKey !== 'NOT_CONFIGURED');

  // Field configurations from CMS Form Builder
  const appointmentConfig = formBuilderConfig?.appointmentForm;
  const fields = appointmentConfig?.fields;

  const fieldRules = useMemo(() => ({
    patientName: getFieldConfig(fields, 'patientName', { label: 'Patient Full Name', placeholder: 'Patient Full Name', required: true }),
    phone: getFieldConfig(fields, 'phone', { label: 'Phone Number', placeholder: 'Enter contact number', required: true }),
    email: getFieldConfig(fields, 'email', { label: 'Email Address', placeholder: 'name@example.com', required: false }),
    preferredDate: getFieldConfig(fields, 'preferredDate', { label: 'Preferred Date', placeholder: 'Select date', required: true }),
    preferredSlot: getFieldConfig(fields, 'preferredSlot', { label: 'Preferred Time Slot', placeholder: 'Select slot', required: false }),
    consultationType: getFieldConfig(fields, 'consultationType', { label: 'Consultation Mode', placeholder: 'In-Person or Video', required: true }),
    cancerTypeOrConcern: getFieldConfig(fields, 'cancerTypeOrConcern', { label: 'Cancer Type or Primary Concern', placeholder: 'e.g. Breast Cancer Staging, Lung Nodule, Second Opinion', required: false }),
    notes: getFieldConfig(fields, 'notes', { label: 'Additional Clinical Notes', placeholder: 'Any prior chemotherapy, surgery date, or specific questions...', required: false })
  }), [fields]);

  const cleanPhone = (practiceLocation?.phonePrimary || '').replace(/[^\d+]/g, '');
  const cleanWhatsApp = (practiceLocation?.whatsappNumber || '').replace(/[^\d]/g, '');

  const hasLocationDetails = Boolean(
    practiceLocation?.hospitalName?.trim() ||
    practiceLocation?.department?.trim() ||
    practiceLocation?.addressLine1?.trim() ||
    practiceLocation?.city?.trim() ||
    cleanPhone ||
    practiceLocation?.consultationTimings?.trim()
  );

  const hasMapEmbed = Boolean(practiceLocation?.googleMapsEmbedUrl?.trim());
  const hasDirections = Boolean(practiceLocation?.googleMapsDirectionsUrl?.trim());

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.honeypot) return;

    // Validate using shared CMS field rules
    const validation = validateFormFields(
      {
        patientName: formData.patientName,
        phone: formData.phone,
        email: formData.email,
        preferredDate: formData.preferredDate,
        preferredSlot: formData.preferredSlot,
        consultationType: formData.consultationType,
        cancerTypeOrConcern: formData.cancerTypeOrConcern,
        notes: formData.notes
      },
      fieldRules
    );

    if (!validation.valid) {
      setError(validation.error || 'Please complete all required fields.');
      return;
    }

    if (isTurnstileConfigured && !turnstileToken) {
      setError('Please complete the security verification.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitAppointment({
        patientName: formData.patientName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        preferredDate: formData.preferredDate.trim(),
        preferredSlot: formData.preferredSlot.trim(),
        consultationType: formData.consultationType,
        cancerTypeOrConcern: formData.cancerTypeOrConcern.trim(),
        notes: formData.notes.trim(),
        turnstileToken,
        website: formData.honeypot
      });

      if (!res) {
        setError('Could not process your request. Please try again.');
        return;
      }

      setSuccess(true);
      setFormData({
        patientName: '',
        phone: '',
        email: '',
        preferredDate: '',
        preferredSlot: 'No preference',
        consultationType: 'In-Person (Hospital)',
        cancerTypeOrConcern: '',
        notes: '',
        honeypot: ''
      });
    } catch (err) {
      setError('Could not process your request. Please try again.');
    } finally {
      setIsSubmitting(false);
      setTurnstileToken('');
      setTurnstileResetSignal(prev => prev + 1);
    }
  };

  const successMessage = appointmentConfig?.successMessage?.trim() || 'Your consultation request has been received successfully.';

  return (
    <section id="locations" className="py-20 lg:py-28 bg-white border-b border-stone-200/60 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center space-x-2 bg-teal-50 border border-teal-200/80 px-4 py-1.5 rounded-full mb-3 shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-teal-700 mr-1" />
            <span className="text-xs font-bold text-teal-800 tracking-wider uppercase">
              Outpatient Clinic & Practice Location
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight font-heading leading-tight">
            Where to Consult
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Submit a consultation request or view verified clinic details when available.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Info Column (rendered if location details or map exist) */}
          {(hasLocationDetails || hasMapEmbed) && (
            <div className="lg:col-span-5 space-y-6">
              {/* Hospital & Timings Card */}
              {hasLocationDetails && (
                <div className="bg-slate-50 p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-5">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
                        Practice Center
                      </span>
                      {practiceLocation?.hospitalName && (
                        <h3 className="text-base font-bold text-slate-900 font-heading">
                          {practiceLocation.hospitalName}
                        </h3>
                      )}
                      {practiceLocation?.department && (
                        <p className="text-xs text-slate-500 font-medium">
                          {practiceLocation.department}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 text-xs text-slate-600 border-t border-slate-200/80">
                    {(practiceLocation?.addressLine1 || practiceLocation?.city) && (
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <span>
                          {[
                            practiceLocation?.addressLine1,
                            practiceLocation?.addressLine2,
                            practiceLocation?.city,
                            practiceLocation?.state ? `${practiceLocation.state}${practiceLocation?.pincode ? ` – ${practiceLocation.pincode}` : ''}` : practiceLocation?.pincode
                          ].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}

                    {(practiceLocation?.consultationTimings || practiceLocation?.daysAvailable) && (
                      <div className="flex items-start space-x-3">
                        <Clock className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          {practiceLocation?.consultationTimings && (
                            <span className="font-semibold text-slate-800 block">
                              {practiceLocation.consultationTimings}
                            </span>
                          )}
                          {practiceLocation?.daysAvailable && (
                            <span className="text-slate-500">Days: {practiceLocation.daysAvailable}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {cleanPhone && (
                      <div className="flex items-start space-x-3">
                        <Phone className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="font-bold text-slate-900 hover:text-sky-700"
                          >
                            {practiceLocation.phonePrimary}
                          </a>
                          {practiceLocation.phoneSecondary && (
                            <span className="text-slate-500 block">
                              Alt: {practiceLocation.phoneSecondary}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {practiceLocation?.emailContact && (
                      <div className="flex items-start space-x-3">
                        <Mail className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <a
                          href={`mailto:${practiceLocation.emailContact}`}
                          className="text-slate-700 hover:text-sky-700 underline"
                        >
                          {practiceLocation.emailContact}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Direct Action Buttons */}
                  {(cleanPhone || cleanWhatsApp) && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {cleanPhone && (
                        <a
                          href={`tel:${cleanPhone}`}
                          className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call OPD Desk</span>
                        </a>
                      )}
                      {cleanWhatsApp && (
                        <a
                          href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(
                            'Hello Dr. Bhushan Parmar Oncology Clinic, I would like to schedule an appointment.'
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Google Maps Embed (Only if configured) */}
              {hasMapEmbed && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <iframe
                    title="Dr. Bhushan Parmar Oncology Clinic Location"
                    src={practiceLocation.googleMapsEmbedUrl!.trim()}
                    width="100%"
                    height="220"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  {(practiceLocation.city || hasDirections) && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        {[practiceLocation.city, practiceLocation.state].filter(Boolean).join(', ')}
                      </span>
                      {hasDirections && (
                        <a
                          href={practiceLocation.googleMapsDirectionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs font-bold text-sky-700 hover:text-sky-900"
                        >
                          <Navigation className="w-3.5 h-3.5 mr-1" />
                          Get Directions
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right Column: In-Person / Video Consultation Booking Form */}
          <div className={hasLocationDetails || hasMapEmbed ? 'lg:col-span-7' : 'lg:col-span-8 lg:col-start-3'}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold font-heading text-slate-900">
                  Book a Consultation
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Schedule your consultation request with Dr. Bhushan Parmar.
                </p>
              </div>

              {success ? (
                <div className="text-center py-10 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 font-heading">
                    Appointment Request Received
                  </h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    {successMessage}
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-3 px-5 py-2 rounded-xl bg-sky-700 text-white text-xs font-semibold hover:bg-sky-800"
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="space-y-4">
                  {/* Honeypot */}
                  <input
                    type="text"
                    name="phone_check"
                    value={formData.honeypot}
                    onChange={e => setFormData({ ...formData, honeypot: e.target.value })}
                    className="hidden"
                    tabIndex={-1}
                  />

                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Consultation Type Selector */}
                  {fieldRules.consultationType.enabled && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {fieldRules.consultationType.label} {fieldRules.consultationType.required && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['In-Person (Hospital)', 'Video Consultation'] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setFormData({ ...formData, consultationType: mode })}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                              formData.consultationType === mode
                                ? 'bg-sky-50 border-sky-500 text-sky-800 shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patient Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fieldRules.patientName.enabled && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {fieldRules.patientName.label} {fieldRules.patientName.required && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="text"
                          required={fieldRules.patientName.required}
                          placeholder={fieldRules.patientName.placeholder}
                          value={formData.patientName}
                          onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    )}

                    {fieldRules.phone.enabled && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {fieldRules.phone.label} {fieldRules.phone.required && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="tel"
                          required={fieldRules.phone.required}
                          placeholder={fieldRules.phone.placeholder}
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  {fieldRules.email.enabled && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {fieldRules.email.label} {fieldRules.email.required && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="email"
                        required={fieldRules.email.required}
                        placeholder={fieldRules.email.placeholder}
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  )}

                  {/* Preferred Date & Time Window */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fieldRules.preferredDate.enabled && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {fieldRules.preferredDate.label} {fieldRules.preferredDate.required && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="date"
                          required={fieldRules.preferredDate.required}
                          value={formData.preferredDate}
                          onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    )}

                    {fieldRules.preferredSlot.enabled && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {fieldRules.preferredSlot.label} {fieldRules.preferredSlot.required && <span className="text-rose-500">*</span>}
                        </label>
                        <select
                          value={formData.preferredSlot}
                          onChange={e => setFormData({ ...formData, preferredSlot: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
                        >
                          <option value="No preference">No preference</option>
                          <option value="Morning">Morning</option>
                          <option value="Afternoon">Afternoon</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Cancer Type / Concern */}
                  {fieldRules.cancerTypeOrConcern.enabled && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {fieldRules.cancerTypeOrConcern.label} {fieldRules.cancerTypeOrConcern.required && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={fieldRules.cancerTypeOrConcern.required}
                        placeholder={fieldRules.cancerTypeOrConcern.placeholder}
                        value={formData.cancerTypeOrConcern}
                        onChange={e => setFormData({ ...formData, cancerTypeOrConcern: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  {fieldRules.notes.enabled && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {fieldRules.notes.label} {fieldRules.notes.required && <span className="text-rose-500">*</span>}
                      </label>
                      <textarea
                        rows={2}
                        required={fieldRules.notes.required}
                        placeholder={fieldRules.notes.placeholder}
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  )}

                  {/* Invisible Honeypot */}
                  <input
                    type="text"
                    name="website"
                    value={formData.honeypot}
                    onChange={e => setFormData({ ...formData, honeypot: e.target.value })}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden opacity-0 absolute -z-10 pointer-events-none"
                  />

                  {/* Turnstile Security Widget */}
                  <TurnstileWidget
                    action="appointment"
                    onToken={setTurnstileToken}
                    onExpired={() => setTurnstileToken('')}
                    onError={() => setTurnstileToken('')}
                    resetSignal={turnstileResetSignal}
                  />

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-6 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-sky-900/10 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Request...</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4 mr-1 text-sky-200" />
                          <span>Request Consultation Slot</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
