import React, { useState } from 'react';
import { Pin, Calendar, Heart, MessageSquare, ChevronDown } from 'lucide-react';
import { GuestbookMessage } from '../types';

interface GuestbookGridProps {
  messages: GuestbookMessage[];
  isLoading?: boolean;
  onSelectPhoto?: (url: string, author: string, caption?: string) => void;
  onWriteClick?: () => void;
}

export const GuestbookGrid: React.FC<GuestbookGridProps> = ({
  messages,
  isLoading,
  onSelectPhoto,
  onWriteClick,
}) => {
  const [visibleCount, setVisibleCount] = useState<number>(6);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch {
      return '';
    }
  };

  const visibleMessages = messages.slice(0, visibleCount);
  const hasMore = messages.length > visibleCount;

  return (
    <section id="mural" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      
      {/* Section Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 mb-2 text-[#879783]">
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-semibold">Mural comemorativo</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#612A44] mb-3">
          Mural de Carinho
        </h2>
        <p className="text-sm sm:text-base text-[#612A44]/75 max-w-lg mx-auto font-sans leading-relaxed">
          Palavras que aquecem a alma e celebram a trajetória de quem tanto amamos.
        </p>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-white/60 animate-pulse rounded-2xl border border-[#F6D5D5]" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        /* Empty State */
        <div className="max-w-md mx-auto text-center py-16 px-6 bg-white/70 backdrop-blur-sm border border-[#F6D5D5] rounded-3xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#FFF3EC] flex items-center justify-center text-[#C49C62]">
            <Heart className="w-6 h-6 fill-current text-[#F5B5A4]" />
          </div>
          <h3 className="text-xl font-display font-semibold text-[#612A44]">
            Primeiras Palavras de Afeto
          </h3>
          <p className="text-sm text-[#612A44]/70 leading-relaxed font-sans">
            Este espaço está esperando as primeiras palavras de carinho para Waleska. Seja a primeira pessoa a deixar uma mensagem especial!
          </p>
          {onWriteClick && (
            <div className="pt-2">
              <button
                onClick={onWriteClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#612A44] hover:bg-[#451B30] text-white rounded-full text-xs sm:text-sm font-medium transition-colors"
              >
                <Heart className="w-3.5 h-3.5 text-[#F5B5A4] fill-current" />
                <span>Deixar o primeiro recado</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Messages Grid */
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {visibleMessages.map((msg) => (
              <article
                key={msg.id}
                className={`relative bg-white/95 rounded-2xl p-6 sm:p-7 border shadow-xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 flex flex-col justify-between ${
                  msg.featured
                    ? 'border-[#C49C62] ring-1 ring-[#C49C62]/30 bg-gradient-to-b from-white to-[#FFF9F5]'
                    : 'border-[#F6D5D5]/80'
                }`}
              >
                {/* Featured Badge */}
                {msg.featured && (
                  <div className="absolute -top-3 right-5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#612A44] text-[#F5B5A4] text-[10px] font-semibold uppercase tracking-wider shadow-xs">
                    <Pin className="w-3 h-3 fill-current rotate-45" />
                    <span>Destaque</span>
                  </div>
                )}

                {/* Message Body */}
                <div className="space-y-4">
                  {/* Subtle stationery quote mark */}
                  <span className="font-serif text-3xl leading-none text-[#F6D5D5] select-none block">
                    “
                  </span>
                  
                  <p className="text-sm sm:text-base text-[#612A44]/90 font-serif leading-relaxed italic whitespace-pre-line">
                    {msg.message}
                  </p>

                  {/* Attached Photos Carousel / Grid */}
                  {msg.photos && msg.photos.length > 0 && (
                    <div className="pt-2">
                      <div className="grid grid-cols-3 gap-2">
                        {msg.photos.map((photo) => (
                          <div
                            key={photo.id}
                            onClick={() => {
                              if (onSelectPhoto) {
                                onSelectPhoto(photo.public_path, msg.author_name, msg.message);
                              }
                            }}
                            className="aspect-square rounded-lg overflow-hidden border border-[#F6D5D5] cursor-pointer group bg-[#FFF9F5] relative"
                          >
                            <img
                              src={photo.public_path}
                              alt={`Foto anexada por ${msg.author_name}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-[#612A44]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Author & Date */}
                <div className="pt-6 mt-4 border-t border-[#F6D5D5]/50 flex items-center justify-between text-xs text-[#879783]">
                  <div>
                    <h4 className="font-display font-bold text-base text-[#612A44] tracking-tight">
                      {msg.author_name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-[#612A44]/60">
                    <Calendar className="w-3 h-3 text-[#C49C62]" />
                    <span>{formatDate(msg.created_at)}</span>
                  </div>
                </div>

              </article>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#F6D5D5] hover:bg-[#FFF9F5] text-[#612A44] rounded-full text-xs sm:text-sm font-medium shadow-2xs transition-colors"
              >
                <span>Carregar mais mensagens</span>
                <ChevronDown className="w-4 h-4 text-[#C49C62]" />
              </button>
            </div>
          )}
        </div>
      )}

    </section>
  );
};
