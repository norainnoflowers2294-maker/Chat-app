import React from 'react';
import {
  Grid,
  Heart,
  Flame,
  Users,
  User,
  BookOpen,
  MapPin,
  Image as ImageIcon,
  Shirt,
  Puzzle,
} from 'lucide-react';

export type CategoryFilter =
  | 'all'
  | 'favorites'
  | 'recent'
  | 'characters'
  | 'personas'
  | 'lorebooks'
  | 'locations'
  | 'images'
  | 'wardrobe'
  | 'plugins';

interface CategoryPillsProps {
  activeCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  activeCategory,
  onSelectCategory,
}) => {
  const categories: Array<{ id: CategoryFilter; label: string; icon: React.ReactNode; glow: string }> = [
    { id: 'all', label: 'All', icon: <Grid className="w-4 h-4" />, glow: 'from-pink-500 to-rose-600' },
    { id: 'favorites', label: 'Favorites', icon: <Heart className="w-4 h-4 fill-current" />, glow: 'from-rose-500 to-pink-600' },
    { id: 'recent', label: 'Recent', icon: <Flame className="w-4 h-4" />, glow: 'from-orange-500 to-red-600' },
    { id: 'characters', label: 'Characters', icon: <Users className="w-4 h-4" />, glow: 'from-purple-500 to-indigo-600' },
    { id: 'personas', label: 'Personas', icon: <User className="w-4 h-4" />, glow: 'from-cyan-500 to-blue-600' },
    { id: 'lorebooks', label: 'Lorebooks', icon: <BookOpen className="w-4 h-4" />, glow: 'from-fuchsia-500 to-pink-600' },
    { id: 'locations', label: 'Locations', icon: <MapPin className="w-4 h-4" />, glow: 'from-blue-500 to-cyan-600' },
    { id: 'images', label: 'Images', icon: <ImageIcon className="w-4 h-4" />, glow: 'from-sky-500 to-teal-600' },
    { id: 'wardrobe', label: 'Wardrobe', icon: <Shirt className="w-4 h-4" />, glow: 'from-violet-500 to-purple-600' },
    { id: 'plugins', label: 'Plugins', icon: <Puzzle className="w-4 h-4" />, glow: 'from-blue-600 to-indigo-600' },
  ];

  return (
    <div className="w-full px-4 sm:px-6 py-2">
      <div className="bg-[#12040e]/85 backdrop-blur-md border border-[#ff3399]/40 rounded-3xl p-3 shadow-[0_0_25px_rgba(255,51,153,0.25)] overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between min-w-[700px] gap-2">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="flex flex-col items-center justify-center space-y-1.5 group flex-1 py-1 transition-all"
              >
                <div
                  className={`relative p-0.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-tr from-white via-[#ff007f] to-white scale-110 shadow-[0_0_20px_rgba(255,0,128,0.9)]'
                      : 'bg-white/30 hover:bg-white/60 group-hover:scale-105'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-full bg-gradient-to-br ${cat.glow} flex items-center justify-center text-white border border-white/40 shadow-inner`}
                  >
                    {cat.icon}
                  </div>
                  <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
                </div>

                <span
                  className={`text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-white drop-shadow-[0_0_6px_#ff007f]' : 'text-[#ffd6eb]/70 group-hover:text-white'
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
