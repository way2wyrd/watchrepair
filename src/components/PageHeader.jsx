import React from 'react';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="border-b border-stone-800 bg-stone-900/50 px-4 sm:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-100">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-stone-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
