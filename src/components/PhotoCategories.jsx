import { Eye, Cog, Diamond, CircleDot, Watch, Shield, Wrench, Tag } from 'lucide-react';

export const PHOTO_CATEGORIES = [
  { value: 'Crystal', icon: Diamond, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
  { value: 'Movement', icon: Cog, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  { value: 'Dial', icon: Eye, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
  { value: 'Case Back', icon: Shield, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
  { value: 'Case', icon: Watch, color: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
  { value: 'Crown', icon: CircleDot, color: 'text-gold-400 bg-gold-500/15 border-gold-500/30' },
  { value: 'Bracelet', icon: Tag, color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' },
  { value: 'Repair', icon: Wrench, color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
  { value: 'Other', icon: Tag, color: 'text-stone-400 bg-stone-500/15 border-stone-500/30' },
];

export function getCategoryStyle(category) {
  return PHOTO_CATEGORIES.find(c => c.value === category) || PHOTO_CATEGORIES[PHOTO_CATEGORIES.length - 1];
}

export function CategoryBadge({ category }) {
  if (!category) return null;
  const cat = getCategoryStyle(category);
  const Icon = cat.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cat.color}`}>
      <Icon className="w-3 h-3" />
      {category}
    </span>
  );
}
