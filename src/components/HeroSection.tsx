import React from 'react';
import { Heart, Image as ImageIcon, ChevronDown, Calendar, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  mainMessage?: string;
  heroPhoto?: string | null;
  onLeaveMessageClick: () => void;
  onViewMemoriesClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  title = 'Waleska',
  subtitle = 'Um dia especial merece ser celebrado com muito amor.',
  mainMessage = 'Cada mensagem, cada lembrança e cada gesto de carinho tornam essa data ainda mais inesquecível.',
  heroPhoto,
  onLeaveMessageClick,
  onViewMemoriesClick,
}) => {
  const defaultArtwork = '/assets/aistudio/Retrato_elegante_em_tons_creme_ec45ed4e.png';
  const displayPhoto = heroPhoto || defaultArtwork;

  return (
    <section
      id="inicio"
      className="relative min-h-[92vh] pt-28 pb-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#FFF9F5] via-[#FFF3EC] to-[#FFF9F5]"
    >
      {/* Delicate floating background blur blobs */}
      <div className="absolute top-12 left-1/4 w-72 h-72 bg-[#F6D5D5]/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#F5B5A4]/25 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Typography & Intent */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            
            {/* Sub-kicker */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 border border-[#F6D5D5] shadow-xs text-xs sm:text-sm text-[#612A44] font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#C49C62]" />
              <span>Contagem para um dia inesquecível</span>
              <span className="text-[#879783]">·</span>
              <span className="text-[#612A44]/80">27 de Março de 2027</span>
            </div>

            {/* Main Title */}
            <div>
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-display font-bold text-[#612A44] tracking-tight leading-none">
                {title}
              </h1>
              <span className="block font-script text-3xl sm:text-4xl text-[#C49C62] mt-2">
                Celebrando um coração especial
              </span>
            </div>

            {/* Subtitle & Message */}
            <div className="space-y-3 max-w-xl mx-auto lg:mx-0">
              <p className="text-xl sm:text-2xl font-serif italic text-[#612A44]/90 leading-snug">
                "{subtitle}"
              </p>
              <p className="text-sm sm:text-base text-[#612A44]/75 font-sans leading-relaxed">
                {mainMessage}
              </p>
            </div>

            {/* Official Date Badge */}
            <div className="pt-2 flex items-center justify-center lg:justify-start gap-3 text-sm text-[#879783] font-medium">
              <Calendar className="w-4 h-4 text-[#C49C62]" />
              <span className="tracking-wide uppercase text-xs sm:text-sm font-semibold text-[#612A44]/90">
                27 de Março de 2027
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={onLeaveMessageClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-[#612A44] hover:bg-[#451B30] text-white rounded-full font-medium shadow-sm hover:shadow transition-all duration-200"
              >
                <Heart className="w-4 h-4 fill-current text-[#F5B5A4]" />
                <span>Deixar meu carinho</span>
              </button>

              <button
                onClick={onViewMemoriesClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/90 hover:bg-white text-[#612A44] border border-[#F6D5D5] hover:border-[#F5B5A4] rounded-full font-medium shadow-2xs transition-all duration-200"
              >
                <ImageIcon className="w-4 h-4 text-[#879783]" />
                <span>Ver as lembranças</span>
              </button>
            </div>
          </div>

          {/* Right Column: Delicate Commemorative Artwork / Portrait Frame */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative group w-full max-w-sm sm:max-w-md">
              
              {/* Outer decorative halo */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-[#F6D5D5] via-[#FFF3EC] to-[#C49C62]/20 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition duration-500" />
              
              {/* Card Container */}
              <div className="relative bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-[#F6D5D5]">
                <div className="relative aspect-[4/5] w-full rounded-xl overflow-hidden bg-[#FFF9F5] shadow-xs">
                  <img
                    src={displayPhoto}
                    alt="Retrato de Waleska"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-102"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/waleska.png';
                    }}
                  />
                </div>

                {/* Caption beneath photo */}
                <div className="pt-3 text-center">
                  <p className="font-display font-semibold text-lg text-[#612A44] tracking-wide">
                    Waleska
                  </p>
                  <p className="text-xs text-[#879783] font-medium tracking-wider uppercase mt-0.5">
                    27 de Março de 2027 · Jardim de Memórias
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Scroll Indicator */}
        <div className="pt-12 pb-2 flex flex-col items-center justify-center">
          <a
            href="#contagem"
            className="flex flex-col items-center gap-1.5 text-xs text-[#612A44]/60 hover:text-[#612A44] transition-colors"
          >
            <span>Rolar para acompanhar</span>
            <ChevronDown className="w-4 h-4 animate-bounce text-[#C49C62]" />
          </a>
        </div>

      </div>
    </section>
  );
};
