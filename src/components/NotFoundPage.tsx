import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Home, Calendar } from 'lucide-react';
import { useData } from '../context/DataContext';

export const NotFoundPage: React.FC = () => {
  const { openAppointmentModal } = useData();

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-[#FDFBF7]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#149A96] shadow-sm">
          <Stethoscope className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#149A96]">
            Clinical Directory • 404
          </p>
          <h1 className="text-3xl font-extrabold text-[#071D2D] font-heading">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            The requested cancer care resource, clinic location, or publication is unavailable or has been relocated.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-[#073F3D] hover:bg-[#071D2D] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>

          <button
            type="button"
            onClick={() => openAppointmentModal()}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-[#149A96] hover:bg-teal-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Consultation</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Dr. Bhushan Parmar • Senior Consultant Medical Oncology
        </p>
      </div>
    </div>
  );
};
