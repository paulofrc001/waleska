import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Heart } from 'lucide-react';
import { PhotoLightbox } from './PhotoLightbox';
import { MessagePhoto } from '../types';

interface MemoryGalleryProps {
  photos: MessagePhoto[];
  messageAuthorMap?: Record<string, { author: string; message: string }>;
  onAddPhotoClick?: () => void;
}

export const MemoryGallery: React.FC<MemoryGalleryProps> = ({
  photos,
  messageAuthorMap = {},
  onAddPhotoClick,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const formattedPhotos = photos.map((p) => {
    const meta = messageAuthorMap[p.message_id];
    return {
      url: p.public_path,
      author: meta?.author,
      caption: meta?.message,
    };
  });

  const handleOpenPhoto = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section id="lembrancas" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 mb-2 text-[#C49C62]">
          <Camera className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-semibold">Álbum coletivo</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#612A44] mb-3">
          Nossas Lembranças
        </h2>
        <p className="text-sm sm:text-base text-[#612A44]/75 max-w-lg mx-auto font-sans leading-relaxed">
          Momentos especiais merecem um lugar para viver para sempre.
        </p>
      </div>

      {/* Empty State */}
      {photos.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16 px-6 bg-white/70 backdrop-blur-sm border border-[#F6D5D5] rounded-3xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#FFF3EC] flex items-center justify-center text-[#C49C62]">
            <ImageIcon className="w-6 h-6 text-[#C49C62]" />
          </div>
          <h3 className="text-xl font-display font-semibold text-[#612A44]">
            O Álbum Aguarda Suas Histórias
          </h3>
          <p className="text-sm text-[#612A44]/70 leading-relaxed font-sans">
            A galeria será preenchida com as fotografias e recordações compartilhadas por amigos e familiares nos recados de carinho.
          </p>
          {onAddPhotoClick && (
            <div className="pt-2">
              <button
                onClick={onAddPhotoClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#612A44] hover:bg-[#451B30] text-white rounded-full text-xs sm:text-sm font-medium transition-colors"
              >
                <Heart className="w-3.5 h-3.5 text-[#F5B5A4] fill-current" />
                <span>Enviar uma lembrança no mural</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Photo Grid / Masonry */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {photos.map((photo, index) => {
            const meta = messageAuthorMap[photo.message_id];
            return (
              <div
                key={photo.id}
                onClick={() => handleOpenPhoto(index)}
                className="group relative bg-white p-2.5 sm:p-3 rounded-2xl border border-[#F6D5D5] shadow-xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col"
              >
                {/* Photo frame */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#FFF9F5]">
                  <img
                    src={photo.public_path}
                    alt={meta?.author ? `Lembrança enviada por ${meta.author}` : 'Lembrança comemorativa de Waleska'}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[#612A44]/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1 bg-white/90 text-[#612A44] text-xs font-medium rounded-full shadow-xs">
                      Ampliar
                    </span>
                  </div>
                </div>

                {/* Polaroid-style caption strip */}
                <div className="pt-2.5 px-1 text-center truncate">
                  {meta?.author ? (
                    <span className="text-xs font-medium text-[#612A44] truncate block">
                      {meta.author}
                    </span>
                  ) : (
                    <span className="text-[11px] font-script text-[#C49C62] text-sm">
                      Memória especial
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox */}
      <PhotoLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={formattedPhotos}
        currentIndex={selectedIndex}
        onNavigate={setSelectedIndex}
      />

    </section>
  );
};
