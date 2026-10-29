import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, User } from 'lucide-react';

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  photos: {
    url: string;
    author?: string;
    caption?: string;
  }[];
  currentIndex: number;
  onNavigate: (newIndex: number) => void;
}

export const PhotoLightbox: React.FC<LightboxProps> = ({
  isOpen,
  onClose,
  photos,
  currentIndex,
  onNavigate,
}) => {
  const currentPhoto = photos[currentIndex];

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(photos.length - 1);
    }
  }, [currentIndex, photos.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0);
    }
  }, [currentIndex, photos.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentPhoto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Fechar visualização da fotografia"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation Left */}
      {photos.length > 1 && (
        <button
          onClick={handlePrev}
          className="absolute left-3 sm:left-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Fotografia anterior"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Navigation Right */}
      {photos.length > 1 && (
        <button
          onClick={handleNext}
          className="absolute right-3 sm:right-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Próxima fotografia"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Container */}
      <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
        
        {/* Image Frame */}
        <div className="relative max-h-[75vh] overflow-hidden rounded-xl bg-black flex items-center justify-center">
          <img
            src={currentPhoto.url}
            alt={currentPhoto.caption || 'Lembrança comemorativa de Waleska'}
            referrerPolicy="no-referrer"
            className="max-h-[75vh] w-auto max-w-full object-contain select-none"
          />
        </div>

        {/* Caption & Metadata */}
        {(currentPhoto.author || currentPhoto.caption) && (
          <div className="mt-4 max-w-xl text-center px-4">
            {currentPhoto.author && (
              <div className="inline-flex items-center gap-1.5 text-xs text-[#F5B5A4] font-medium mb-1">
                <User className="w-3.5 h-3.5" />
                <span>Compartilhado por {currentPhoto.author}</span>
              </div>
            )}
            {currentPhoto.caption && (
              <p className="text-sm text-white/90 font-serif italic line-clamp-2">
                "{currentPhoto.caption}"
              </p>
            )}
          </div>
        )}

        {/* Counter indicator */}
        {photos.length > 1 && (
          <div className="mt-2 text-xs font-mono text-white/60">
            {currentIndex + 1} / {photos.length}
          </div>
        )}

      </div>
    </div>
  );
};
