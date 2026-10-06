import React, { useState, useRef } from 'react';
import { Plus, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { MaskedHeading, EDITORIAL_EASE } from './MotionUtils';
import { useData } from '../context/DataContext';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { faqs } = useData();

  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  const faqList = Array.isArray(faqs) ? faqs : [];
  if (faqList.length === 0) return null;

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-24 lg:py-28 bg-white border-b border-stone-200/60"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Two-Column Spacious FAQ Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          
          {/* LEFT: Label, Masked Heading, Short Description */}
          <div className="lg:col-span-5 text-left space-y-4">
            <motion.span
              initial={{ opacity: 0, y: -6 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.45, ease: EDITORIAL_EASE }}
              className="text-[11px] sm:text-xs font-bold tracking-[0.18em] text-teal-800 uppercase block"
            >
              PATIENT QUESTIONS
            </motion.span>

            <MaskedHeading
              lines={['Common questions from patients']}
              as="h2"
              className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-[1.12] font-heading"
              delay={0.1}
            />

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.5, delay: 0.22, ease: EDITORIAL_EASE }}
              className="text-slate-600 text-base sm:text-lg leading-relaxed pt-1"
            >
              Clear answers to the essential questions patients and families often have about medical oncology, treatment alternatives, and clinical evaluations.
            </motion.p>
          </div>

          {/* RIGHT: Accordion (Smooth height animation & icon rotate) */}
          <div className="lg:col-span-7 space-y-3.5 text-left">
            {faqList.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <motion.div
                  key={`${faq.id || 'faq'}-${index}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.15 + index * 0.06,
                    ease: EDITORIAL_EASE
                  }}
                  className={`rounded-2xl border transition-colors duration-200 overflow-hidden ${
                    isOpen
                      ? 'bg-stone-50/80 border-teal-600/40 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left space-x-4 cursor-pointer focus:outline-none group"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base sm:text-lg font-bold text-slate-900 font-heading group-hover:text-teal-900 transition-colors">
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{
                        rotate: isOpen ? 45 : 0,
                        backgroundColor: isOpen ? '#073F3D' : '#f5f5f4',
                        color: isOpen ? '#ffffff' : '#475569'
                      }}
                      transition={{ duration: 0.25, ease: EDITORIAL_EASE }}
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: EDITORIAL_EASE }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-stone-200/50">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
