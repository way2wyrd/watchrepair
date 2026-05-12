import React from 'react';

const statusColors = {
  Received: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'In Progress': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Awaiting Parts': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Ready for Pickup': 'bg-gold-500/15 text-gold-400 border-gold-500/30',
  Delivered: 'bg-stone-500/15 text-stone-400 border-stone-500/30',
};

export const STATUSES = Object.keys(statusColors);

export default function StatusBadge({ status }) {
  const color = statusColors[status] || 'bg-stone-500/15 text-stone-400 border-stone-500/30';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${color}`}>
      {status || 'Unknown'}
    </span>
  );
}
