import React, { useState, useEffect } from 'react';
import { Menu, X, Heart, Shield } from 'lucide-react';

interface HeaderProps {
  onOpenMessageModal?: () => void;
  isAdminView?: boolean;
  onToggleAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMessageModal,
  isAdminView,
  onToggleAdmin,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    if (isAdminView && onToggleAdmin) {
      onToggleAdmin();
      setTimeout(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FFF9F5]/95 backdrop-blur-md shadow-sm border-b border-[#F6D5D5]/60 py-3'
          : 'bg-[#FFF9F5]/80 backdrop-blur-sm py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              scrollTo('inicio');
            }}
            className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-[#612A44] whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span>Waleska</span>
            <span className="font-script text-xl sm:text-2xl text-[#C49C62] font-normal">
              27 de Março
            </span>
          </a>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#612A44]/80">
            <button
              onClick={() => scrollTo('inicio')}
              className="hover:text-[#612A44] transition-colors whitespace-nowrap shrink-0"
            >
              Início
            </button>
            <button
              onClick={() => scrollTo('contagem')}
              className="hover:text-[#612A44] transition-colors whitespace-nowrap shrink-0"
            >
              Contagem regressiva
            </button>
            <button
              onClick={() => scrollTo('mural')}
              className="hover:text-[#612A44] transition-colors whitespace-nowrap shrink-0"
            >
              Mural de carinho
            </button>
            <button
              onClick={() => scrollTo('lembrancas')}
              className="hover:text-[#612A44] transition-colors whitespace-nowrap shrink-0"
            >
              Nossas lembranças
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (onOpenMessageModal) onOpenMessageModal();
                else scrollTo('escrever-recado');
              }}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#612A44] hover:bg-[#451B30] rounded-full shadow-sm hover:shadow transition-all duration-200 whitespace-nowrap shrink-0"
            >
              <Heart className="w-3.5 h-3.5 fill-current text-[#F5B5A4]" />
              <span>Deixar uma mensagem</span>
            </button>

            {onToggleAdmin && (
              <button
                onClick={onToggleAdmin}
                title={isAdminView ? 'Voltar ao Site' : 'Painel Administrativo'}
                className="p-2 text-[#612A44]/70 hover:text-[#612A44] hover:bg-[#F6D5D5]/40 rounded-full transition-colors"
                aria-label="Acessar painel administrativo"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#612A44] hover:bg-[#F6D5D5]/40 rounded-lg transition-colors"
              aria-label="Abrir menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFF9F5] border-b border-[#F6D5D5] px-4 pt-3 pb-6 shadow-lg transition-all animate-in fade-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-4 text-base font-medium text-[#612A44]">
            <button
              onClick={() => scrollTo('inicio')}
              className="text-left py-2 border-b border-[#F6D5D5]/40 hover:text-[#C49C62]"
            >
              Início
            </button>
            <button
              onClick={() => scrollTo('contagem')}
              className="text-left py-2 border-b border-[#F6D5D5]/40 hover:text-[#C49C62]"
            >
              Contagem regressiva
            </button>
            <button
              onClick={() => scrollTo('escrever-recado')}
              className="text-left py-2 border-b border-[#F6D5D5]/40 hover:text-[#C49C62]"
            >
              Deixe seu recado
            </button>
            <button
              onClick={() => scrollTo('mural')}
              className="text-left py-2 border-b border-[#F6D5D5]/40 hover:text-[#C49C62]"
            >
              Mural de carinho
            </button>
            <button
              onClick={() => scrollTo('lembrancas')}
              className="text-left py-2 border-b border-[#F6D5D5]/40 hover:text-[#C49C62]"
            >
              Nossas lembranças
            </button>

            <div className="pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenMessageModal) onOpenMessageModal();
                  else scrollTo('escrever-recado');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium text-white bg-[#612A44] rounded-full shadow"
              >
                <Heart className="w-4 h-4 fill-current text-[#F5B5A4]" />
                <span>Deixar uma mensagem</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
