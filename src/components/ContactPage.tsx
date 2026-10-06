import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getFieldConfig, validateFormFields } from '../utils/formBuilder';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, ExternalLink, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

interface ContactPageProps {
  onBackToHome?: () => void;
  onOpenAppointment?: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onBackToHome, onOpenAppointment }) => {
  const { locations, submitContactEnquiry, formBuilderConfig } = useData();

  const [selectedLocationId, setSelectedLocationId] = useState<string>(locations[0]?.id || '');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const contactConfig = formBuilderConfig?.contactForm;
  const fields = contactConfig?.fields;

  const fieldRules = useMemo(() => ({
    name: getFieldConfig(fields, 'name', { label: 'Your Full Name', placeholder: 'e.g. Rajesh Kumar', required: true }),
    phone: getFieldConfig(fields, 'phone', { label: 'Phone / WhatsApp', placeholder: 'Enter phone number', required: true }),
    email: getFieldConfig(fields, 'email', { label: 'Email Address', placeholder: 'name@example.com', required: false }),
    message: getFieldConfig(fields, 'message', { label: 'Message / Clinical Query', placeholder: 'Describe your query or appointment request...', required: true })
  }), [fields]);

  const activeLocation = locations.find((l) => l.id === selectedLocationId) || locations[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (honeypot) return;

    const validation = validateFormFields(
      {
        name: formName,
        phone: formPhone,
        email: formEmail,
        message: formMessage
      },
      fieldRules
    );

    if (!validation.valid) {
      setErrorMessage(validation.error || 'Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await submitContactEnquiry({
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        message: formMessage.trim(),
        sourcePage: 'Contact Page'
      });

      if (success) {
        setIsSubmitted(true);
        setFormName('');
        setFormPhone('');
        setFormEmail('');
        setFormMessage('');
      } else {
        setErrorMessage('Could not send your message. Please try again.');
      }
    } catch {
      setErrorMessage('Could not send your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const successMessageText = contactConfig?.successMessage?.trim() || 'Your message has been received successfully.';

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 font-sans antialiased text-left">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 sm:px-8 py-4 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="flex items-center space-x-2 text-xs font-bold text-teal-800 hover:text-teal-950 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Main Website</span>
        </button>
        {onOpenAppointment && (
          <button
            onClick={onOpenAppointment}
            className="px-4 py-2 rounded-xl bg-[#073F3D] hover:bg-[#0A4D4A] text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            Book Appointment
          </button>
        )}
      </header>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[#073F3D] to-[#0A4D4A] text-white py-16 px-4 sm:px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#18B8B4_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-[#18B8B4] text-xs font-bold uppercase tracking-widest inline-block mb-4">
            Hospital Locations & Contact
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight mb-4">
            Connect With Dr. Bhushan Parmar
          </h1>
          <p className="text-stone-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Visit our medical oncology OPD suites or send a confidential clinical enquiry.
          </p>
        </div>
      </section>

      {/* Main Content: Two-Column Split */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Location Cards & Form */}
          <div className="lg:col-span-5 space-y-6">
            {locations.length > 0 && (
              <div>
                <div className="mb-2">
                  <h2 className="text-xl font-bold font-heading text-slate-900">Hospital & OPD Centers</h2>
                  <p className="text-xs text-slate-500">Select a center to view location details and map directions.</p>
                </div>

                <div className="space-y-4">
                  {locations.map((loc) => {
                    const isSelected = loc.id === activeLocation?.id;
                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedLocationId(loc.id)}
                        className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? 'bg-white border-teal-700 shadow-lg ring-2 ring-teal-700/20'
                            : 'bg-white/85 border-stone-200/80 hover:border-stone-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            {loc.isPrimary && (
                              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-900 text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                                Primary Practice Center
                              </span>
                            )}
                            <h3 className="text-base font-bold font-heading text-slate-900">{loc.hospitalName}</h3>
                            {loc.department && <p className="text-xs text-teal-800 font-medium">{loc.department}</p>}
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-teal-800 text-white' : 'bg-stone-100 text-slate-400'}`}>
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 mb-4 pt-3 border-t border-stone-100">
                          {(loc.addressLine1 || loc.city) && (
                            <p className="flex items-start space-x-2">
                              <MapPin className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
                              <span>{[loc.addressLine1, loc.addressLine2, loc.city, loc.state ? `${loc.state}${loc.pincode ? ` - ${loc.pincode}` : ''}` : loc.pincode].filter(Boolean).join(', ')}</span>
                            </p>
                          )}
                          {(loc.consultationDays || loc.openingTime) && (
                            <p className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-teal-800 shrink-0" />
                              <span>{loc.consultationDays}{loc.openingTime ? ` (${loc.openingTime}${loc.closingTime ? ` - ${loc.closingTime}` : ''})` : ''}</span>
                            </p>
                          )}
                          {loc.phonePrimary && (
                            <p className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-teal-800 shrink-0" />
                              <a href={`tel:${loc.phonePrimary.replace(/[^\d+]/g, '')}`} className="text-teal-900 font-semibold hover:underline">
                                {loc.phonePrimary}
                              </a>
                            </p>
                          )}
                          {loc.emailContact && (
                            <p className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-teal-800 shrink-0" />
                              <a href={`mailto:${loc.emailContact}`} className="text-teal-900 font-semibold hover:underline">
                                {loc.emailContact}
                              </a>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-3 pt-2">
                          {loc.googleMapsDirectionsUrl && (
                            <a
                              href={loc.googleMapsDirectionsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Get Directions</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                          )}
                          {loc.whatsappNumber && (
                            <a
                              href={`https://wa.me/${loc.whatsappNumber.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                            >
                              <span>WhatsApp OPD</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* General Enquiry Form Card (CMS Controlled) */}
            <div className="bg-white p-8 rounded-3xl border border-stone-200/80 shadow-xs">
              <h3 className="text-lg font-bold font-heading text-slate-900 mb-1">
                Send a Direct Enquiry
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Our patient care team will respond to your clinical query.
              </p>

              {isSubmitted ? (
                <div className="p-6 bg-teal-50 border border-teal-200 rounded-2xl text-center space-y-2">
                  <CheckCircle className="w-10 h-10 text-teal-700 mx-auto" />
                  <h4 className="text-sm font-bold text-teal-900">Enquiry Sent Successfully</h4>
                  <p className="text-xs text-teal-700 leading-relaxed">{successMessageText}</p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setErrorMessage(null);
                    }}
                    className="mt-2 text-xs font-semibold text-teal-900 underline cursor-pointer"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot */}
                  <input
                    type="text"
                    name="hp_contact_url"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Name field */}
                  {fieldRules.name.enabled !== false && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {fieldRules.name.label} {fieldRules.name.required && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={fieldRules.name.required}
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                        placeholder={fieldRules.name.placeholder}
                      />
                    </div>
                  )}

                  {/* Phone & Email fields */}
                  {(fieldRules.phone.enabled !== false || fieldRules.email.enabled !== false) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {fieldRules.phone.enabled !== false && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            {fieldRules.phone.label} {fieldRules.phone.required && <span className="text-rose-500">*</span>}
                          </label>
                          <input
                            type="tel"
                            required={fieldRules.phone.required}
                            value={formPhone}
                            onChange={(e) => setFormPhone(e.target.value)}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                            placeholder={fieldRules.phone.placeholder}
                          />
                        </div>
                      )}
                      {fieldRules.email.enabled !== false && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            {fieldRules.email.label} {fieldRules.email.required && <span className="text-rose-500">*</span>}
                          </label>
                          <input
                            type="email"
                            required={fieldRules.email.required}
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                            placeholder={fieldRules.email.placeholder}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message field */}
                  {fieldRules.message.enabled !== false && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {fieldRules.message.label} {fieldRules.message.required && <span className="text-rose-500">*</span>}
                      </label>
                      <textarea
                        rows={3}
                        required={fieldRules.message.required}
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                        placeholder={fieldRules.message.placeholder}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-[#073F3D] hover:bg-[#0A4D4A] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors shadow-md cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#18B8B4]" />
                        <span>Sending Enquiry...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-[#18B8B4]" />
                        <span>Send Confidential Enquiry</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Map (Strict: Only if configured) */}
          <div className="lg:col-span-7 sticky top-24">
            <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-md">
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {activeLocation?.hospitalName ? `Interactive Location Map — ${activeLocation.hospitalName}` : 'Clinic Location Map'}
                  </span>
                </div>
                {activeLocation?.googleMapsDirectionsUrl && (
                  <a
                    href={activeLocation.googleMapsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-teal-800 hover:underline flex items-center space-x-1"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Map Container: Only render iframe if real embed URL exists */}
              {activeLocation?.googleMapsEmbedUrl && activeLocation.googleMapsEmbedUrl.trim() ? (
                <div className="aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden bg-stone-200 relative shadow-inner border border-stone-200">
                  <iframe
                    title={`Map for ${activeLocation.hospitalName || 'Clinic Location'}`}
                    src={activeLocation.googleMapsEmbedUrl.trim()}
                    className="w-full h-full border-0"
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="aspect-[4/3] sm:aspect-[16/11] rounded-2xl bg-stone-100 border border-stone-200 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                  <MapPin className="w-8 h-8 text-teal-700/60 mb-2" />
                  <p className="text-xs font-medium text-slate-600">
                    {activeLocation?.hospitalName
                      ? `Map coordinates for ${activeLocation.hospitalName} are available upon appointment confirmation.`
                      : 'Submit a consultation request or view verified clinic details when available.'}
                  </p>
                  {activeLocation?.googleMapsDirectionsUrl && (
                    <a
                      href={activeLocation.googleMapsDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 px-4 py-2 rounded-xl bg-teal-50 text-teal-900 text-xs font-bold hover:bg-teal-100 transition-colors inline-flex items-center space-x-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Get Directions</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Active Location Summary Footer (Only if location has details) */}
              {activeLocation && (activeLocation.hospitalName || activeLocation.addressLine1 || activeLocation.city) && (
                <div className="mt-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-left">
                    {activeLocation.hospitalName && <h4 className="text-xs font-bold text-slate-900">{activeLocation.hospitalName}</h4>}
                    {(activeLocation.addressLine1 || activeLocation.city) && (
                      <p className="text-[11px] text-slate-500">
                        {[activeLocation.addressLine1, activeLocation.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  {onOpenAppointment && (
                    <button
                      onClick={onOpenAppointment}
                      className="px-5 py-2.5 rounded-xl bg-[#18B8B4] hover:bg-[#149E9A] text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      Book OPD Slot Here
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
