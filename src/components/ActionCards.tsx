import React from 'react';
import {
  UserPlus,
  BookOpen,
  Contact,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ActionCardsProps {
  onCreateCharacter: () => void;
  onCreateLorebook: () => void;
  onCreatePersona: () => void;
  onOpenMyChats: () => void;
}

export const ActionCards: React.FC<ActionCardsProps> = ({
  onCreateCharacter,
  onCreateLorebook,
  onCreatePersona,
  onOpenMyChats,
}) => {
  const cards = [
    {
      id: 'char',
      title: 'Create Character',
      subtitle: 'BRING THEM TO LIFE',
      gradient: 'from-[#ff007f] via-[#ff3399] to-[#d6006c]',
      glow: 'shadow-[0_0_30px_rgba(255,0,128,0.5)] hover:shadow-[0_0_40px_rgba(255,0,128,0.8)]',
      border: 'border-[#ff66b2]',
      icon: <UserPlus className="w-8 h-8 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" />,
      onClick: onCreateCharacter,
    },
    {
      id: 'lore',
      title: 'Create Lorebook',
      subtitle: 'BUILD DEEPER WORLDS',
      gradient: 'from-[#ff6f61] via-[#ff8577] to-[#e05244]',
      glow: 'shadow-[0_0_30px_rgba(255,111,97,0.5)] hover:shadow-[0_0_40px_rgba(255,111,97,0.8)]',
      border: 'border-[#ffa094]',
      icon: <BookOpen className="w-8 h-8 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" />,
      onClick: onCreateLorebook,
    },
    {
      id: 'persona',
      title: 'Create Persona',
      subtitle: 'YOURSELF IN STORIES',
      gradient: 'from-[#9b51e0] via-[#b26ee8] to-[#8035cb]',
      glow: 'shadow-[0_0_30px_rgba(155,81,224,0.5)] hover:shadow-[0_0_40px_rgba(155,81,224,0.8)]',
      border: 'border-[#ca95f5]',
      icon: <Contact className="w-8 h-8 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" />,
      onClick: onCreatePersona,
    },
    {
      id: 'chats',
      title: 'My Chats',
      subtitle: 'CONTINUE YOUR STORIES',
      gradient: 'from-[#00c4cc] via-[#26d6dd] to-[#009da3]',
      glow: 'shadow-[0_0_30px_rgba(0,196,204,0.5)] hover:shadow-[0_0_40px_rgba(0,196,204,0.8)]',
      border: 'border-[#5ce5eb]',
      icon: <MessageSquare className="w-8 h-8 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" />,
      onClick: onOpenMyChats,
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={card.onClick}
            className={`group relative rounded-3xl p-6 bg-gradient-to-br ${card.gradient} border-2 ${card.border} ${card.glow} flex flex-col items-center text-center justify-between min-h-[220px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/20 pointer-events-none" />

            <div className="absolute top-3 right-3 text-white/70 group-hover:text-white transition-colors">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>

            <div className="mt-2 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              {card.icon}
            </div>

            <div className="my-2 space-y-1">
              <h3 className="text-xl font-black text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                {card.title}
              </h3>
              <p className="text-[10px] tracking-wider font-extrabold uppercase text-white/80">
                {card.subtitle}
              </p>
            </div>

            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md group-hover:scale-110 group-hover:bg-[#ffebf5] transition-all">
              <ArrowRight className="w-4 h-4 text-pink-600 font-bold" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
