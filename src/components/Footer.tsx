import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { getMediaUrl } from '../lib/cloudflareMedia';
import { Phone, Mail, MapPin, Clock, ArrowRight, ShieldCheck, Heart, MessageSquare } from 'lucide-react';

export const Footer: React.FC = () => {
  const { doctorProfile, siteSettings, footerConfig, navigationMenu, mediaAssets, openAppointmentModal, openSecondOpinionModal } = useData();

  const handleNavClick = (link: any) => {
    if (link.isExternal) {
      window.open(link.url, link.openInNewTab ? '_blank' : '_self');
      return;
    }
    if (link.url.startsWith('/')) {
      window.location.href = link.url;
      return;
    }
    if (link.url.startsWith('#')) {
      const sectionId = link.url.substring(1);
      const element = document.getElementById(sectionId);
      if (element) {
        const yOffset = -76;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  const phone = footerConfig?.phone?.trim() || '';
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const email = footerConfig?.email?.trim() || '';
  const address = footerConfig?.address?.trim() || '';
  const whatsapp = footerConfig?.whatsapp?.trim() || '';
  const cleanWhatsapp = whatsapp.replace(/[^\d+]/g, '');

  const rawFooterLogo = siteSettings.footerLogoUrl || siteSettings.darkLogoUrl || siteSettings.logoUrl;
  const footerLogo = getMediaUrl(rawFooterLogo, mediaAssets) || rawFooterLogo || '';

  const footerLinks = (Array.isArray(navigationMenu) ? navigationMenu : [])
    .filter(item => item.isVisible !== false)
    .sort((a, b) => a.order - b.order);

  return (
    <footer id="contact" className="relative bg-[#073F3D] text-stone-300 pt-20 pb-12 overflow-hidden border-t border-white/10">
      
      {/* Large Low-Opacity Typography in Footer Background: "Oncology" */}
      <div className="absolute -bottom-10 right-4 lg:right-16 text-[clamp(5rem,14vw,14rem)] font-extrabold text-white/[0.03] select-none pointer-events-none tracking-tighter leading-none font-heading">
        Oncology
      </div>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* 4 Spacious Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-16 border-b border-white/10 text-left">
          
          {/* Col 1: Doctor Profile (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {Boolean(footerLogo.trim()) && (
              <img
                src={footerLogo.trim()}
                alt={doctorProfile.name}
                className="h-10 w-auto max-w-[140px] object-contain mb-2 filter brightness-110"
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight">
                {doctorProfile.name}
              </h3>
              <p className="text-xs font-semibold text-[#18B8B4] uppercase tracking-widest mt-0.5">
                Senior Consultant • Medical Oncology
              </p>
            </div>
            <p className="text-sm text-stone-300 leading-relaxed font-normal max-w-sm">
              {footerConfig?.doctorDescription || 'Evidence-based medical oncology care for solid tumors and hematological cancers, prioritizing genomic precision, patient clarity, and compassionate treatment planning.'}
            </p>
            <div className="pt-2 flex items-center space-x-2 text-xs text-stone-400">
              <ShieldCheck className="w-4 h-4 text-[#18B8B4]" />
              <span>DrNB • PGIMER • MD • 10+ Years Oncology</span>
            </div>
          </div>

          {/* Col 2: Quick Links (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              {footerLinks.map(link => (
                <li key={link.id}>
                  <button
                    onClick={() => handleNavClick(link)}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Patient Support (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">
              Patient Support
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={openSecondOpinionModal}
                  className="hover:text-[#18B8B4] transition-colors flex items-center space-x-1.5 cursor-pointer text-left"
                >
                  <span>Second Opinion Review</span>
                  <ArrowRight className="w-3 h-3 text-[#18B8B4]" />
                </button>
              </li>
              <li>
                <button
                  onClick={openAppointmentModal}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Book Consultation
                </button>
              </li>
              <li>
                <a
                  href="/admin"
                  className="text-stone-400 hover:text-stone-200 text-xs transition-colors"
                >
                  Admin Portal
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact Practice (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">
              Contact Practice
            </h4>
            <div className="space-y-2.5 text-sm text-stone-300">
              {phone && (
                <div className="flex items-center space-x-2.5">
                  <Phone className="w-4 h-4 text-[#18B8B4] shrink-0" />
                  <a href={`tel:${cleanPhone}`} className="hover:text-white transition-colors">
                    {phone}
                  </a>
                </div>
              )}
              {whatsapp && (
                <div className="flex items-center space-x-2.5">
                  <MessageSquare className="w-4 h-4 text-[#18B8B4] shrink-0" />
                  <a href={`https://wa.me/${cleanWhatsapp}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                    WhatsApp: {whatsapp}
                  </a>
                </div>
              )}
              {email && (
                <div className="flex items-center space-x-2.5">
                  <Mail className="w-4 h-4 text-[#18B8B4] shrink-0" />
                  <a href={`mailto:${email}`} className="hover:text-white transition-colors">
                    {email}
                  </a>
                </div>
              )}
              {address && (
                <div className="flex items-start space-x-2.5">
                  <MapPin className="w-4 h-4 text-[#18B8B4] shrink-0 mt-0.5" />
                  <span>{address}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Legal / Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-stone-400 space-y-4 md:space-y-0">
          <div>
            {footerConfig?.copyright || `© ${new Date().getFullYear()} Dr. Bhushan Parmar. All rights reserved.`}
          </div>
          <div className="flex items-center space-x-6">
            {footerConfig?.medicalDisclaimer && (
              <span className="text-stone-400 italic">
                {footerConfig.medicalDisclaimer}
              </span>
            )}
            {footerConfig?.privacyPolicyLink && (
              <a
                href={footerConfig.privacyPolicyLink}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors underline"
              >
                Privacy Policy
              </a>
            )}
          </div>
        </div>

      </div>
    </footer>
  );
};
