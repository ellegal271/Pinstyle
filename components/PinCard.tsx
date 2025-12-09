import React from 'react';
import { Pin, Language, I18N } from '../types';
import { Heart, Download, Share2, Bookmark } from 'lucide-react';

interface PinCardProps {
  pin: Pin;
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  lang: Language;
  onOpen: (id: string) => void;
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
}

export const PinCard: React.FC<PinCardProps> = ({
  pin,
  isLiked,
  isSaved,
  likesCount,
  lang,
  onOpen,
  onToggleLike,
  onToggleSave,
}) => {
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = pin.src;
    const text = `${pin.title} — ${pin.cat}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: pin.title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        // Toast handled by parent if needed, strictly purely UI here
        alert(I18N[lang].toastLinkCopied);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="break-inside-avoid mb-4 group">
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-lg hover:border-[#3a4258] transition-colors duration-200">
        <div className="relative overflow-hidden cursor-zoom-in" onClick={() => onOpen(pin.id)}>
           <img 
            src={pin.src} 
            alt={pin.title} 
            className="w-full h-auto block object-cover bg-card hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
        </div>

        <div className="p-3">
          <h3 className="font-semibold text-text text-sm mb-1 truncate">{pin.title}</h3>
          
          <div className="flex justify-between items-center text-xs text-muted mb-3">
            <span>{pin.author}</span>
            <span>{new Date(pin.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleSave(pin.id); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-sm transition-all duration-200 ${
                isSaved 
                ? 'bg-ok border-transparent text-[#091015]' 
                : 'bg-card border-border text-muted hover:text-text hover:border-[#3a4258]'
              }`}
            >
              <Bookmark size={14} className={isSaved ? "fill-current" : ""} />
              <span className="hidden min-[400px]:inline">{I18N[lang].save}</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onToggleLike(pin.id); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-sm transition-all duration-200 ${
                isLiked 
                ? 'bg-[#ff7b7b] border-transparent text-[#190a0a]' 
                : 'bg-card border-border text-muted hover:text-text hover:border-[#3a4258]'
              }`}
            >
              <Heart size={14} className={isLiked ? "fill-current" : ""} />
              <span className="hidden min-[400px]:inline">{likesCount}</span>
            </button>

            <button 
              onClick={handleShare}
              className="p-2 rounded-lg bg-card border border-border text-muted hover:text-text hover:border-[#3a4258] transition-all"
              title={I18N[lang].share}
            >
              <Share2 size={16} />
            </button>

             <a 
              href={pin.src} 
              download 
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg bg-card border border-border text-muted hover:text-text hover:border-[#3a4258] transition-all flex items-center justify-center"
              title={I18N[lang].download}
            >
              <Download size={16} />
            </a>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {pin.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-[#222838] border border-[#2f3648] text-[#c3c9da] text-[10px]">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};