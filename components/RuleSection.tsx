
import React from 'react';

interface RuleSectionProps {
  japaneseTitle: string;
  englishTitle: string;
  children: React.ReactNode;
  id: string;
}

export const RuleSection: React.FC<RuleSectionProps> = ({ japaneseTitle, englishTitle, children, id }) => {
  return (
    <section id={id} className="mb-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl sm:text-3xl font-semibold text-sky-600 mb-1">{japaneseTitle}</h2>
      <h3 className="text-lg sm:text-xl font-medium text-slate-500 mb-4 border-b border-slate-300 pb-2">{englishTitle}</h3>
      <div className="prose prose-sm sm:prose-base max-w-none text-slate-700 space-y-4">
        {children}
      </div>
    </section>
  );
};