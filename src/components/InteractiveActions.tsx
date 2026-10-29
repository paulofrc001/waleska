import React, { useState, useEffect } from 'react';
import { Heart, Share2, Check, Calendar, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface InteractiveActionsProps {
  showHugs?: boolean;
}

export const InteractiveActions: React.FC<InteractiveActionsProps> = ({ showHugs = true }) => {
  const [hugCount, setHugCount] = useState<number>(0);
  const [isSendingHug, setIsSendingHug] = useState(false);
  const [hugFeedback, setHugFeedback] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number }[]>([]);

  const [copied, setCopied] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load current hugs count
    apiClient.getHugs().then(count => setHugCount(count)).catch(() => {});

    // Create gentle ambient audio element (Royalty-free delicate acoustic celebration melody)
    const audio = new Audio('https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3');
    audio.loop = true;
    audio.volume = 0.5;
    setAudioElement(audio);

    return () => {
      audio.pause();
    };
  }, []);

  const handleSendHug = async () => {
    if (isSendingHug) return;
    setIsSendingHug(true);

    // Spawn floating heart
    const newHeart = { id: Date.now(), left: Math.random() * 60 + 20 };
    setFloatingHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1500);

    try {
      const res = await apiClient.sendHug();
      setHugCount(res.count);
      setHugFeedback(res.message);
      setTimeout(() => setHugFeedback(null), 3500);
    } catch {
      setHugFeedback('Um abraço cheio de carinho enviado para Waleska!');
      setTimeout(() => setHugFeedback(null), 3000);
    } finally {
      setIsSendingHug(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.origin;
    const shareText = `Estamos contando os dias para o aniversário da Waleska! 💕 Entre, acompanhe a contagem regressiva e deixe uma mensagem especial: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Waleska | Contagem para um Dia Especial',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to copy
      }
    }

    // Direct WhatsApp share or clipboard copy
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveTheDate = () => {
    // Generates a clean .ics file for 27/03/2027 all day
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Waleska Aniversario//PT',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:waleska-aniversario-20270327',
      'DTSTAMP:20270327T000000Z',
      'DTSTART;VALUE=DATE:20270327',
      'DTEND;VALUE=DATE:20270328',
      'SUMMARY:Aniversário de Waleska',
      'DESCRIPTION:Um dia especial para celebrar a vida e o aniversário de Waleska! Acompanhe o mural e homenagens.',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'aniversario-waleska-27-03-2027.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleMusic = () => {
    if (!audioElement) return;
    if (isPlayingMusic) {
      audioElement.pause();
      setIsPlayingMusic(false);
    } else {
      audioElement.play().then(() => {
        setIsPlayingMusic(true);
      }).catch(err => {
        console.warn('Audio play restricted:', err);
      });
    }
  };

  return (
    <div className="relative py-8 px-4 max-w-4xl mx-auto">
      
      {/* Container with delicate stationer border */}
      <div className="bg-white/80 backdrop-blur-sm border border-[#F6D5D5] rounded-3xl p-6 sm:p-8 shadow-xs">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Hug Section */}
          {showHugs && (
            <div className="relative flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="text-xs uppercase tracking-wider text-[#879783] font-semibold mb-1">
                Demonstre seu afeto
              </span>
              
              <div className="relative inline-block">
                <button
                  onClick={handleSendHug}
                  disabled={isSendingHug}
                  className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#FFF3EC] hover:bg-[#F6D5D5]/60 text-[#612A44] border border-[#F5B5A4]/60 rounded-full font-medium transition-all duration-200 transform active:scale-95 shadow-2xs"
                >
                  <Heart className="w-5 h-5 text-[#612A44] fill-[#F5B5A4] animate-pulse" />
                  <span className="font-sans font-medium text-sm">Enviar um abraço</span>
                  <span className="text-xs px-2 py-0.5 bg-white rounded-full font-mono font-semibold text-[#612A44] border border-[#F6D5D5]">
                    {hugCount}
                  </span>
                </button>

                {/* Floating hearts container */}
                {floatingHearts.map(h => (
                  <div
                    key={h.id}
                    className="absolute -top-4 pointer-events-none transition-all duration-1000 ease-out animate-bounce"
                    style={{ left: `${h.left}%` }}
                  >
                    <Heart className="w-6 h-6 text-[#612A44] fill-[#F5B5A4] drop-shadow-sm" />
                  </div>
                ))}
              </div>

              {hugFeedback && (
                <p className="text-xs text-[#612A44] font-medium mt-2 animate-in fade-in slide-in-from-bottom duration-200">
                  {hugFeedback}
                </p>
              )}
            </div>
          )}

          {/* Share & Calendar Section */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-[#612A44] bg-white border border-[#F6D5D5] hover:bg-[#FFF9F5] rounded-full shadow-2xs transition-colors"
            >
              <Share2 className="w-4 h-4 text-[#C49C62]" />
              <span>Compartilhar</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-[#612A44] bg-white border border-[#F6D5D5] hover:bg-[#FFF9F5] rounded-full shadow-2xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#879783]" />
                  <span className="text-[#879783]">Link copiado!</span>
                </>
              ) : (
                <span>Copiar link</span>
              )}
            </button>

            {/* Add to calendar */}
            <button
              onClick={handleSaveTheDate}
              title="Adicionar evento de 27/03/2027 ao calendário"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-[#612A44] bg-white border border-[#F6D5D5] hover:bg-[#FFF9F5] rounded-full shadow-2xs transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#879783]" />
              <span>Salvar a data</span>
            </button>

            {/* Optional gentle background celebration sound */}
            <button
              onClick={toggleMusic}
              title={isPlayingMusic ? 'Pausar música ambiente' : 'Ouvir melodia comemorativa'}
              className={`p-2.5 rounded-full border transition-colors ${
                isPlayingMusic
                  ? 'bg-[#612A44] text-white border-[#612A44]'
                  : 'bg-white text-[#612A44] border-[#F6D5D5] hover:bg-[#FFF9F5]'
              }`}
              aria-label="Controle de música ambiente"
            >
              {isPlayingMusic ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
