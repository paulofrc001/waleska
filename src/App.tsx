import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { BirthdayCountdown, OFFICIAL_TARGET_DATE_ISO, OFFICIAL_NEXT_DAY_ISO } from './components/BirthdayCountdown';
import { InteractiveActions } from './components/InteractiveActions';
import { MessageForm } from './components/MessageForm';
import { GuestbookGrid } from './components/GuestbookGrid';
import { MemoryGallery } from './components/MemoryGallery';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/AdminPanel';
import { apiClient } from './services/apiClient';
import { GuestbookMessage, MessagePhoto, SiteSettings } from './types';
import { Calendar, Clock, Sparkles } from 'lucide-react';

export function App() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [photos, setPhotos] = useState<MessagePhoto[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Date Simulator state for testing
  const [mockMode, setMockMode] = useState<'real' | 'birthday' | 'passed'>('real');
  const [mockDate, setMockDate] = useState<Date | null>(null);

  // Check URL hash for direct #admin route
  useEffect(() => {
    if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
      setIsAdminOpen(true);
    }

    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch initial data
  const loadData = async () => {
    try {
      const siteSettings = await apiClient.getSettings();
      setSettings(siteSettings);
    } catch (e) {
      console.warn('Could not load settings:', e);
    }

    try {
      setIsLoadingMessages(true);
      const approvedMsgs = await apiClient.getApprovedMessages();
      setMessages(approvedMsgs);
    } catch (e) {
      console.warn('Could not load messages:', e);
    } finally {
      setIsLoadingMessages(false);
    }

    try {
      const approvedPhotos = await apiClient.getApprovedPhotos();
      setPhotos(approvedPhotos);
    } catch (e) {
      console.warn('Could not load photos:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Date simulation updater
  useEffect(() => {
    if (mockMode === 'birthday') {
      setMockDate(new Date(OFFICIAL_TARGET_DATE_ISO));
    } else if (mockMode === 'passed') {
      const after = new Date(OFFICIAL_NEXT_DAY_ISO);
      after.setHours(after.getHours() + 12);
      setMockDate(after);
    } else {
      setMockDate(null);
    }
  }, [mockMode]);

  const scrollToMessageForm = () => {
    const el = document.getElementById('escrever-recado');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMemories = () => {
    const el = document.getElementById('lembrancas');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  // Build mapping of photo message authors
  const messageAuthorMap: Record<string, { author: string; message: string }> = {};
  messages.forEach((m) => {
    if (m.photos) {
      m.photos.forEach((p) => {
        messageAuthorMap[p.message_id] = {
          author: m.author_name,
          message: m.message,
        };
      });
    }
  });

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-[#2D2429] flex flex-col font-sans selection:bg-[#F6D5D5] selection:text-[#612A44]">
      
      {/* Top Header */}
      <Header
        onOpenMessageModal={scrollToMessageForm}
        isAdminView={isAdminOpen}
        onToggleAdmin={() => setIsAdminOpen(!isAdminOpen)}
      />

      {/* Date Testing Bar (Discreet QA bar for testing anniversary and post-anniversary states) */}
      <aside aria-label="Simulador de data para testes" className="fixed bottom-3 left-3 z-30 hidden sm:flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md rounded-full shadow-md border border-[#F6D5D5] text-[11px] text-[#612A44]">
        <Clock className="w-3.5 h-3.5 text-[#C49C62] ml-2" />
        <span className="font-semibold pr-1">Simular Data:</span>
        <button
          onClick={() => setMockMode('real')}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            mockMode === 'real'
              ? 'bg-[#612A44] text-white font-medium'
              : 'hover:bg-[#FFF9F5] text-[#612A44]/80'
          }`}
        >
          Tempo Real (Contagem)
        </button>
        <button
          onClick={() => setMockMode('birthday')}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            mockMode === 'birthday'
              ? 'bg-[#612A44] text-white font-medium'
              : 'hover:bg-[#FFF9F5] text-[#612A44]/80'
          }`}
        >
          27/03/2027 (Aniversário)
        </button>
        <button
          onClick={() => setMockMode('passed')}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            mockMode === 'passed'
              ? 'bg-[#612A44] text-white font-medium'
              : 'hover:bg-[#FFF9F5] text-[#612A44]/80'
          }`}
        >
          28/03/2027+ (Pós-Evento)
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <HeroSection
          title={settings?.title || 'Waleska'}
          subtitle={settings?.subtitle}
          mainMessage={settings?.main_message}
          heroPhoto={settings?.hero_photo}
          onLeaveMessageClick={scrollToMessageForm}
          onViewMemoriesClick={scrollToMemories}
        />

        {/* 2. Birthday Countdown Section */}
        <BirthdayCountdown
          onLeaveMessageClick={scrollToMessageForm}
          mockDateOverride={mockDate}
        />

        {/* 3. Interactive Experiences (Abraços, Compartilhar, Calendário, Música) */}
        <InteractiveActions showHugs={settings?.display_settings?.show_hugs ?? true} />

        {/* 4. Leave Message Form */}
        <MessageForm onSuccess={loadData} />

        {/* 5. Guestbook Grid (Approved Messages) */}
        <GuestbookGrid
          messages={messages}
          isLoading={isLoadingMessages}
          onWriteClick={scrollToMessageForm}
        />

        {/* 6. Collective Memory Gallery */}
        {(settings?.display_settings?.show_gallery ?? true) && (
          <MemoryGallery
            photos={photos}
            messageAuthorMap={messageAuthorMap}
            onAddPhotoClick={scrollToMessageForm}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onAdminClick={() => setIsAdminOpen(true)}
        thankYouText={settings?.subtitle}
      />

      {/* Administration Modal Panel */}
      {isAdminOpen && (
        <AdminPanel
          onClose={() => {
            setIsAdminOpen(false);
            if (window.location.hash === '#admin') {
              window.history.pushState(null, '', window.location.pathname);
            }
          }}
          onSettingsUpdated={(newSettings) => {
            setSettings(newSettings);
            loadData();
          }}
        />
      )}

    </div>
  );
}
export default App;
