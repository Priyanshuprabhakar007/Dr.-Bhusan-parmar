import React from 'react';
import { useData } from '../context/DataContext';
import { Phone, MessageCircle, Calendar } from 'lucide-react';

export const MobileBottomBar: React.FC = () => {
  const { practiceLocation, openAppointmentModal } = useData();

  const phone = practiceLocation?.phonePrimary?.trim() || '';
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  const whatsapp = practiceLocation?.whatsappNumber?.trim() || '';
  const cleanWhatsApp = whatsapp.replace(/[^\d]/g, '');
  const whatsAppUrl = cleanWhatsApp
    ? `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(
        'Hello Dr. Bhushan Parmar Oncology Clinic, I would like to inquire regarding consultation / cancer second opinion.'
      )}`
    : '';

  const hasPhone = Boolean(cleanPhone);
  const hasWhatsApp = Boolean(cleanWhatsApp);

  const buttonsCount = 1 + (hasPhone ? 1 : 0) + (hasWhatsApp ? 1 : 0);
  const gridColsClass =
    buttonsCount === 3
      ? 'grid-cols-3'
      : buttonsCount === 2
      ? 'grid-cols-2'
      : 'grid-cols-1';

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200/90 px-3 py-2.5 shadow-lg"
      id="mobile-action-bar"
    >
      <div className={`grid ${gridColsClass} gap-2.5 items-center`}>
        {/* Call Button */}
        {hasPhone && (
          <a
            href={`tel:${cleanPhone}`}
            id="mobile-call-btn"
            className="flex flex-col items-center justify-center py-2 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 transition-colors text-center"
          >
            <Phone className="w-4 h-4 text-slate-700 mb-0.5" />
            <span className="text-xs font-semibold">Call</span>
          </a>
        )}

        {/* WhatsApp Button */}
        {hasWhatsApp && (
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="mobile-whatsapp-btn"
            className="flex flex-col items-center justify-center py-2 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 transition-colors text-center"
          >
            <MessageCircle className="w-4 h-4 text-teal-800 mb-0.5" />
            <span className="text-xs font-semibold">WhatsApp</span>
          </a>
        )}

        {/* Book Button */}
        <button
          onClick={openAppointmentModal}
          id="mobile-book-btn"
          className="flex flex-col items-center justify-center py-2 px-2 rounded-xl bg-[#073F3D] text-white shadow-xs transition-colors text-center cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-[#18B8B4] mb-0.5" />
          <span className="text-xs font-semibold">Book</span>
        </button>
      </div>
    </div>
  );
};
