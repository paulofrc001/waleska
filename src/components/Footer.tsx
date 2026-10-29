import React, { useState } from 'react';
import { Heart, Shield, Lock, Mail, ChevronUp } from 'lucide-react';

interface FooterProps {
  onAdminClick?: () => void;
  thankYouText?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onAdminClick,
  thankYouText = 'Obrigado por fazer parte desse momento tão especial na vida de Waleska.',
}) => {
  const [showDeletionModal, setShowDeletionModal] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#FFF3EC]/60 border-t border-[#F6D5D5] pt-16 pb-12 px-4 sm:px-6 lg:px-8 mt-20">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Top: Gentle gratitude and scroll to top */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-[#F6D5D5]/60 text-center sm:text-left">
          <div>
            <h3 className="font-display font-bold text-2xl text-[#612A44] mb-1">
              Waleska
            </h3>
            <p className="text-xs sm:text-sm text-[#612A44]/75 max-w-md">
              {thankYouText}
            </p>
          </div>

          <button
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#F6D5D5] hover:bg-[#FFF9F5] text-xs font-medium text-[#612A44] rounded-full shadow-2xs transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5 text-[#C49C62]" />
            <span>Voltar ao topo</span>
          </button>
        </div>

        {/* Middle: Privacy Notice & Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-[#612A44]/70 leading-relaxed font-sans">
          <div className="space-y-2">
            <h4 className="font-semibold text-[#612A44] uppercase tracking-wider text-[11px]">
              Aviso de Privacidade e Moderação
            </h4>
            <p>
              Este é um espaço comemorativo de afeto. As mensagens e fotografias enviadas passam por revisão prévia antes de serem publicadas no mural para garantir a segurança e o respeito de todos os participantes.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-[#612A44] uppercase tracking-wider text-[11px]">
              Solicitação de Remoção
            </h4>
            <p>
              Caso tenha enviado uma mensagem ou imagem e deseje retirá-la do ar a qualquer momento, basta solicitar a exclusão através do nosso canal direto.
            </p>
            <button
              onClick={() => setShowDeletionModal(true)}
              className="text-[#612A44] underline hover:text-[#C49C62] font-medium transition-colors"
            >
              Como solicitar a exclusão de conteúdo
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-[#F6D5D5]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#879783]">
          <div className="flex items-center gap-1.5">
            <span>27 de Março de 2027</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              Feito com <Heart className="w-3 h-3 fill-current text-[#F5B5A4]" /> para Waleska
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onAdminClick}
              className="inline-flex items-center gap-1 text-[#612A44]/60 hover:text-[#612A44] transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>Acesso Administrativo</span>
            </button>
          </div>
        </div>

      </div>

      {/* Deletion Request Modal */}
      {showDeletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#F6D5D5] shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#FFF3EC] flex items-center justify-center text-[#C49C62]">
              <Mail className="w-5 h-5" />
            </div>
            <h4 className="text-xl font-display font-bold text-[#612A44]">
              Solicitar Exclusão de Mensagem
            </h4>
            <p className="text-xs sm:text-sm text-[#612A44]/80 leading-relaxed font-sans">
              Para solicitar a remoção imediata de qualquer texto ou fotografia enviada por você ou que contenha sua imagem, informe o nome utilizado no envio para a equipe de moderação:
            </p>
            <div className="p-3 rounded-xl bg-[#FFF9F5] border border-[#F6D5D5] text-xs font-mono text-[#612A44]">
              modera@waleska.com.br
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDeletionModal(false)}
                className="px-5 py-2.5 bg-[#612A44] text-white rounded-full text-xs font-medium hover:bg-[#451B30] transition-colors"
              >
                Entendi e fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
