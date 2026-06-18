import React from 'react';

// Colors progress through the repair workflow, ending in green for the final stage.
const statusColors = {
  Received: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'In Progress': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Awaiting Parts': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Completed: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Ready for Pickup': 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  Delivered: 'bg-green-500/20 text-green-400 border-green-500/40',
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
