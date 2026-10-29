import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Calendar, Heart } from 'lucide-react';

interface CountdownProps {
  onLeaveMessageClick?: () => void;
  mockDateOverride?: Date | null;
}

// 27 de Março de 2027, 00:00:00 no fuso America/Sao_Paulo (UTC-3)
export const OFFICIAL_TARGET_DATE_ISO = '2027-03-27T00:00:00-03:00';
export const OFFICIAL_NEXT_DAY_ISO = '2027-03-28T00:00:00-03:00';

export const BirthdayCountdown: React.FC<CountdownProps> = ({
  onLeaveMessageClick,
  mockDateOverride,
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isAnniversary: false,
    isPassed: false,
  });

  const confettiFiredRef = useRef(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = mockDateOverride ? mockDateOverride.getTime() : Date.now();
      const targetTime = new Date(OFFICIAL_TARGET_DATE_ISO).getTime();
      const nextDayTime = new Date(OFFICIAL_NEXT_DAY_ISO).getTime();

      // Check if it's the birthday itself (March 27, 2027)
      if (now >= targetTime && now < nextDayTime) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isAnniversary: true,
          isPassed: false,
        });

        // Trigger confetti once per session
        if (!confettiFiredRef.current && !sessionStorage.getItem('waleska_confetti_shown')) {
          confettiFiredRef.current = true;
          sessionStorage.setItem('waleska_confetti_shown', 'true');
          triggerCelebrationConfetti();
        }
        return;
      }

      // Check if day has passed (March 28, 2027+)
      if (now >= nextDayTime) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isAnniversary: false,
          isPassed: true,
        });
        return;
      }

      // Before birthday: calculate remaining time
      const diff = Math.max(0, targetTime - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days: isNaN(days) ? 0 : days,
        hours: isNaN(hours) ? 0 : hours,
        minutes: isNaN(minutes) ? 0 : minutes,
        seconds: isNaN(seconds) ? 0 : seconds,
        isAnniversary: false,
        isPassed: false,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [mockDateOverride]);

  const triggerCelebrationConfetti = () => {
    try {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        colors: ['#F5B5A4', '#612A44', '#C49C62', '#F6D5D5', '#879783'],
      };

      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  };

  const padZero = (n: number) => String(n).padStart(2, '0');

  // --- STATE 1: TODAY IS THE BIRTHDAY (27/03/2027) ---
  if (timeLeft.isAnniversary) {
    return (
      <section id="contagem" className="relative py-16 px-4 overflow-hidden bg-gradient-to-b from-[#FFF9F5] to-[#F6D5D5]/30">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#612A44]/10 text-[#612A44] text-xs font-semibold tracking-wider uppercase mb-6">
            <Sparkles className="w-4 h-4 text-[#C49C62]" />
            <span>27 de Março de 2027</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-display font-bold text-[#612A44] mb-4 tracking-tight leading-tight">
            Hoje é o grande dia!
          </h2>
          <p className="font-script text-3xl sm:text-5xl text-[#C49C62] mb-8">
            Feliz aniversário, Waleska!
          </p>

          <p className="text-base sm:text-lg text-[#612A44]/80 max-w-xl mx-auto mb-10 leading-relaxed font-sans">
            Hoje todas as luzes, sorrisos e homenagens são para celebrar sua vida maravilhosa e iluminada.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => {
                triggerCelebrationConfetti();
                if (onLeaveMessageClick) onLeaveMessageClick();
              }}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#612A44] hover:bg-[#451B30] text-white rounded-full font-medium shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              <Heart className="w-5 h-5 fill-current text-[#F5B5A4]" />
              <span>Deixe seu parabéns!</span>
            </button>
            <button
              onClick={triggerCelebrationConfetti}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white border border-[#C49C62]/40 text-[#612A44] hover:bg-[#FFF9F5] rounded-full font-medium shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#C49C62]" />
              <span>Comemorar com confetes!</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // --- STATE 2: POST BIRTHDAY (28/03/2027+) ---
  if (timeLeft.isPassed) {
    return (
      <section id="contagem" className="py-16 px-4 bg-gradient-to-b from-[#FFF9F5] to-[#F6D5D5]/20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#879783]/15 text-[#612A44] text-xs font-semibold tracking-wider uppercase mb-6">
            <Calendar className="w-4 h-4 text-[#879783]" />
            <span>27 de Março de 2027</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-bold text-[#612A44] mb-4">
            O dia passou, mas o carinho continua para sempre.
          </h2>
          <p className="text-base sm:text-lg text-[#612A44]/80 max-w-xl mx-auto mb-8 font-sans">
            Todas as mensagens, fotografias e lembranças compartilhadas permanecem guardadas como um relicário de amor para Waleska.
          </p>

          <button
            onClick={onLeaveMessageClick}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#612A44] hover:bg-[#451B30] text-white rounded-full text-sm font-medium shadow-sm"
          >
            <Heart className="w-4 h-4 text-[#F5B5A4] fill-current" />
            <span>Ver o mural de carinho</span>
          </button>
        </div>
      </section>
    );
  }

  // --- STATE 3: COUNTDOWN ACTIVE (BEFORE 27/03/2027) ---
  return (
    <section
      id="contagem"
      className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-[#FFF9F5] via-[#FFF5EF] to-[#FFF9F5]"
      aria-label="Contagem regressiva para o aniversário de Waleska"
    >
      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Subtle decorative floral kicker */}
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="h-px w-8 bg-[#C49C62]/40" />
          <span className="text-xs sm:text-sm font-medium tracking-widest text-[#C49C62] uppercase">
            27 de Março de 2027 · 00:00
          </span>
          <span className="h-px w-8 bg-[#C49C62]/40" />
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#612A44] tracking-tight mb-3">
          Falta pouco para o grande dia!
        </h2>
        <p className="text-sm sm:text-base text-[#612A44]/75 max-w-lg mx-auto mb-10 font-sans">
          Cada segundo nos aproxima de uma data inesquecível.
        </p>

        {/* 4 Cards Grid: DIAS | HORAS | MINUTOS | SEGUNDOS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 max-w-3xl mx-auto">
          {/* Card DIAS */}
          <div className="group bg-white/90 backdrop-blur-sm border border-[#F6D5D5] rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-[#612A44] tabular-nums leading-none mb-2">
              {timeLeft.days}
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#879783] uppercase tracking-wider">
              Dias
            </div>
          </div>

          {/* Card HORAS */}
          <div className="group bg-white/90 backdrop-blur-sm border border-[#F6D5D5] rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-[#612A44] tabular-nums leading-none mb-2">
              {padZero(timeLeft.hours)}
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#879783] uppercase tracking-wider">
              Horas
            </div>
          </div>

          {/* Card MINUTOS */}
          <div className="group bg-white/90 backdrop-blur-sm border border-[#F6D5D5] rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-[#612A44] tabular-nums leading-none mb-2">
              {padZero(timeLeft.minutes)}
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#879783] uppercase tracking-wider">
              Minutos
            </div>
          </div>

          {/* Card SEGUNDOS */}
          <div className="group bg-white/90 backdrop-blur-sm border border-[#F6D5D5] rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-[#C49C62] tabular-nums leading-none mb-2">
              {padZero(timeLeft.seconds)}
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#879783] uppercase tracking-wider">
              Segundos
            </div>
          </div>
        </div>

        {/* Screen reader live region */}
        <div className="sr-only" aria-live="polite">
          Faltam {timeLeft.days} dias, {timeLeft.hours} horas e {timeLeft.minutes} minutos para o aniversário de Waleska.
        </div>
      </div>
    </section>
  );
};
