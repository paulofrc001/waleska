import React, { useState, useEffect } from 'react';
import {
  Shield, Check, X, Pin, Trash2, Download, Settings, Image as ImageIcon,
  MessageSquare, RefreshCw, AlertCircle, CheckCircle2, Lock, LogOut,
  ExternalLink, Database, Search, Filter, Eye, Star, Heart
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { GuestbookMessage, MessagePhoto, SiteSettings, DashboardStats } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminPanelProps {
  onClose: () => void;
  onSettingsUpdated?: (newSettings: SiteSettings) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onSettingsUpdated }) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'messages' | 'photos' | 'settings' | 'export' | 'database'>('messages');

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isSupabaseActive, setIsSupabaseActive] = useState<boolean>(false);
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [photos, setPhotos] = useState<MessagePhoto[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState<Partial<SiteSettings>>({});
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);
  const [saveSettingsLoading, setSaveSettingsLoading] = useState(false);

  // New admin photo input
  const [newAdminPhotoUrl, setNewAdminPhotoUrl] = useState('');
  const [uploadAdminLoading, setUploadAdminLoading] = useState(false);

  // SQL migration copy state
  const [sqlCopied, setSqlCopied] = useState(false);

  // Check auth session
  useEffect(() => {
    const savedSession = sessionStorage.getItem('waleska_admin_auth');
    if (savedSession === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch all admin data when authenticated
  const loadAdminData = async () => {
    setIsLoadingData(true);
    try {
      const statsRes = await apiClient.getAdminStats();
      setStats(statsRes.stats);
      setIsSupabaseActive(statsRes.isSupabase);

      const msgs = await apiClient.getAllAdminMessages(statusFilter, searchTerm);
      setMessages(msgs);

      const allPhotos = await apiClient.getAllAdminPhotos();
      setPhotos(allPhotos);

      const currentSettings = await apiClient.getSettings();
      setSettings(currentSettings);
      setSettingsForm(currentSettings);
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated, statusFilter, searchTerm]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      // 1. If Supabase Auth is configured, attempt real Supabase signInWithPassword
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          throw new Error(error.message);
        }

        setIsAuthenticated(true);
        sessionStorage.setItem('waleska_admin_auth', 'true');
        return;
      }

      // 2. Demo local admin credentials for initial setup before Supabase keys are added
      if (
        (email.trim().toLowerCase() === 'admin@waleska.com' || email.trim().toLowerCase() === 'admin') &&
        (password === 'waleska2027' || password === 'admin')
      ) {
        setIsAuthenticated(true);
        sessionStorage.setItem('waleska_admin_auth', 'true');
        return;
      }

      throw new Error('Credenciais administrativas inválidas. Use admin@waleska.com / waleska2027 no modo demonstração.');
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao efetuar login.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    sessionStorage.removeItem('waleska_admin_auth');
    setIsAuthenticated(false);
  };

  // Moderation Actions
  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await apiClient.updateMessageStatus(id, status);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar recado.');
    }
  };

  const handleToggleFeatured = async (id: string) => {
    try {
      const msg = messages.find((m) => m.id === id);
      if (!msg) return;
      await apiClient.updateMessageStatus(id, msg.status, !msg.featured);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar destaque.');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir permanentemente este recado?')) return;
    try {
      await apiClient.deleteMessage(id);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir recado.');
    }
  };

  // Photo actions
  const handleUpdatePhotoStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await apiClient.updatePhotoStatus(id, status);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar foto.');
    }
  };

  const handleSetHeroPhoto = async (photoUrl: string) => {
    try {
      const updated = await apiClient.updateSettings({ hero_photo: photoUrl });
      setSettings(updated);
      setSettingsForm(updated);
      if (onSettingsUpdated) onSettingsUpdated(updated);
      alert('Fotografia principal da página inicial atualizada com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar foto principal.');
    }
  };

  const handleAddAdminPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPhotoUrl.trim()) return;
    setUploadAdminLoading(true);
    try {
      await apiClient.addAdminPhoto(newAdminPhotoUrl.trim());
      setNewAdminPhotoUrl('');
      await loadAdminData();
      alert('Foto adicionada com sucesso ao álbum!');
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar foto.');
    } finally {
      setUploadAdminLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSettingsLoading(true);
    setSaveSettingsSuccess(false);
    try {
      const updated = await apiClient.updateSettings(settingsForm);
      setSettings(updated);
      if (onSettingsUpdated) onSettingsUpdated(updated);
      setSaveSettingsSuccess(true);
      setTimeout(() => setSaveSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações');
    } finally {
      setSaveSettingsLoading(false);
    }
  };

  // Copy SQL migration
  const handleCopySql = () => {
    const sqlScript = `-- Migração do Supabase para Waleska Aniversário 2027
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.guestbook_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_name VARCHAR(60) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    featured BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    approved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.message_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL,
    storage_path TEXT NOT NULL,
    public_path TEXT,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.site_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'current',
    title TEXT DEFAULT 'Waleska' NOT NULL,
    subtitle TEXT NOT NULL,
    main_message TEXT NOT NULL,
    birthday_message TEXT NOT NULL,
    post_birthday_message TEXT NOT NULL,
    hero_photo TEXT,
    visual_theme JSONB DEFAULT '{"palette": "jardim_de_memorias"}'::jsonb,
    display_settings JSONB DEFAULT '{"show_gallery": true, "show_hugs": true}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.hugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);`;

    navigator.clipboard.writeText(sqlScript);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-[#F6D5D5] shadow-2xl space-y-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#612A44]/60 hover:text-[#612A44] rounded-full hover:bg-[#FFF9F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#FFF3EC] text-[#612A44] mx-auto flex items-center justify-center border border-[#F6D5D5]">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-display font-bold text-[#612A44]">
              Painel de Moderação
            </h3>
            <p className="text-xs text-[#612A44]/70">
              Acesso restrito para administradores da celebração de Waleska.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#612A44] mb-1">
                E-mail Administrativo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@waleska.com"
                className="w-full px-4 py-2.5 bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl text-sm text-[#612A44] focus:outline-none focus:ring-2 focus:ring-[#C49C62]/40"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#612A44] mb-1">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl text-sm text-[#612A44] focus:outline-none focus:ring-2 focus:ring-[#C49C62]/40"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-[#612A44] hover:bg-[#451B30] text-white rounded-full font-medium text-sm shadow transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{authLoading ? 'Verificando...' : 'Entrar no Painel'}</span>
            </button>
          </form>

          {/* Helper hint for initial trial before Supabase env vars */}
          <div className="p-3 bg-[#FFF9F5] rounded-xl border border-[#F6D5D5]/60 text-[11px] text-[#612A44]/75 text-center leading-relaxed">
            <span className="font-semibold block text-[#612A44]">Acesso Demonstração:</span>
            E-mail: <code className="text-[#612A44] font-bold">admin@waleska.com</code> · Senha: <code className="text-[#612A44] font-bold">waleska2027</code>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGGED-IN ADMIN DASHBOARD ---
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center">
      <div className="bg-[#FFF9F5] rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#F6D5D5] overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="bg-white px-6 py-4 border-b border-[#F6D5D5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#612A44] text-[#F5B5A4] rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-[#612A44]">
                Painel Administrativo de Waleska
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#879783]">
                <span>Status do Banco:</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${isSupabaseActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <span className={`w-2 h-2 rounded-full ${isSupabaseActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {isSupabaseActive ? 'Supabase Conectado' : 'Modo Demonstração Local'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAdminData}
              title="Atualizar dados"
              className="p-2 hover:bg-[#FFF9F5] rounded-full text-[#612A44] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              title="Sair"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 rounded-full transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#FFF9F5] rounded-full text-[#612A44] transition-colors"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dashboard Stat Counters */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-4 p-4 bg-white/50 border-b border-[#F6D5D5]/60 text-center shrink-0">
            <div className="p-2 bg-white rounded-xl border border-[#F6D5D5]/60">
              <span className="text-[10px] uppercase font-semibold text-[#879783]">Total Recados</span>
              <div className="text-xl font-bold font-mono text-[#612A44]">{stats.total_messages}</div>
            </div>
            <div className="p-2 bg-amber-50/80 rounded-xl border border-amber-200">
              <span className="text-[10px] uppercase font-semibold text-amber-800">Pendentes</span>
              <div className="text-xl font-bold font-mono text-amber-900">{stats.pending_messages}</div>
            </div>
            <div className="p-2 bg-emerald-50/80 rounded-xl border border-emerald-200">
              <span className="text-[10px] uppercase font-semibold text-emerald-800">Aprovados</span>
              <div className="text-xl font-bold font-mono text-emerald-900">{stats.approved_messages}</div>
            </div>
            <div className="p-2 bg-red-50/80 rounded-xl border border-red-200">
              <span className="text-[10px] uppercase font-semibold text-red-800">Rejeitados</span>
              <div className="text-xl font-bold font-mono text-red-900">{stats.rejected_messages}</div>
            </div>
            <div className="p-2 bg-white rounded-xl border border-[#F6D5D5]/60">
              <span className="text-[10px] uppercase font-semibold text-[#879783]">Fotos Aprovadas</span>
              <div className="text-xl font-bold font-mono text-[#612A44]">{stats.total_photos}</div>
            </div>
            <div className="p-2 bg-[#FFF3EC] rounded-xl border border-[#F5B5A4]/60">
              <span className="text-[10px] uppercase font-semibold text-[#612A44]">Abraços Enviados</span>
              <div className="text-xl font-bold font-mono text-[#612A44]">{stats.total_hugs}</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-white border-b border-[#F6D5D5] flex gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'messages'
                ? 'border-[#612A44] text-[#612A44]'
                : 'border-transparent text-[#612A44]/60 hover:text-[#612A44]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Moderar Recados</span>
            {stats && stats.pending_messages > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                {stats.pending_messages}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'photos'
                ? 'border-[#612A44] text-[#612A44]'
                : 'border-transparent text-[#612A44]/60 hover:text-[#612A44]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Gerenciar Fotos</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-[#612A44] text-[#612A44]'
                : 'border-transparent text-[#612A44]/60 hover:text-[#612A44]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Personalização</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'export'
                ? 'border-[#612A44] text-[#612A44]'
                : 'border-transparent text-[#612A44]/60 hover:text-[#612A44]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exportar Recados</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'database'
                ? 'border-[#612A44] text-[#612A44]'
                : 'border-transparent text-[#612A44]/60 hover:text-[#612A44]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase & Nuvem</span>
          </button>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* TAB 1: MODERATE MESSAGES */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#F6D5D5]">
                {/* Status Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        statusFilter === st
                          ? 'bg-[#612A44] text-white'
                          : 'text-[#612A44]/70 hover:bg-[#FFF9F5]'
                      }`}
                    >
                      {st === 'all' && 'Todos'}
                      {st === 'pending' && 'Aguardando Moderação'}
                      {st === 'approved' && 'Aprovados'}
                      {st === 'rejected' && 'Rejeitados'}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-[#879783] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar por autor..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C49C62]"
                  />
                </div>
              </div>

              {/* Messages Table / Cards */}
              {messages.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-[#F6D5D5]">
                  <p className="text-xs text-[#612A44]/60">Nenhum recado encontrado neste filtro.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-white p-4 sm:p-5 rounded-2xl border border-[#F6D5D5] shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-lg text-[#612A44]">
                            {msg.author_name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              msg.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : msg.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {msg.status === 'approved' ? 'Aprovado' : msg.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </span>
                          {msg.featured && (
                            <span className="px-2 py-0.5 bg-[#C49C62]/20 text-[#612A44] rounded-full text-[10px] font-bold">
                              ★ Destaque
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-[#879783]">
                          {new Date(msg.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      {/* Content */}
                      <p className="text-xs sm:text-sm text-[#612A44]/90 font-serif whitespace-pre-line bg-[#FFF9F5] p-3 rounded-xl border border-[#F6D5D5]/50">
                        {msg.message}
                      </p>

                      {/* Attached Photos */}
                      {msg.photos && msg.photos.length > 0 && (
                        <div className="flex gap-2 items-center">
                          <span className="text-[11px] text-[#879783]">Fotos anexadas:</span>
                          {msg.photos.map((p) => (
                            <img
                              key={p.id}
                              src={p.public_path}
                              alt="Anexo"
                              className="w-12 h-12 object-cover rounded-lg border border-[#F6D5D5]"
                            />
                          ))}
                        </div>
                      )}

                      {/* Moderation Actions */}
                      <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-[#F6D5D5]/40">
                        {msg.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(msg.id, 'approved')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aprovar</span>
                          </button>
                        )}

                        {msg.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(msg.id, 'rejected')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Rejeitar</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleFeatured(msg.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#C49C62] text-[#612A44] hover:bg-[#FFF9F5] rounded-lg text-xs font-medium transition-colors"
                        >
                          <Star className={`w-3.5 h-3.5 ${msg.featured ? 'fill-[#C49C62] text-[#C49C62]' : ''}`} />
                          <span>{msg.featured ? 'Remover Destaque' : 'Destacar'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
                          title="Excluir recado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANAGE PHOTOS */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* Add Custom Photo */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#F6D5D5] space-y-3">
                <h4 className="text-xs uppercase font-semibold tracking-wider text-[#612A44]">
                  Adicionar Fotografia ao Álbum
                </h4>
                <form onSubmit={handleAddAdminPhoto} className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={newAdminPhotoUrl}
                    onChange={(e) => setNewAdminPhotoUrl(e.target.value)}
                    placeholder="https://... (URL pública da fotografia)"
                    className="flex-1 px-4 py-2 bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl text-xs text-[#612A44] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={uploadAdminLoading}
                    className="px-4 py-2 bg-[#612A44] text-white rounded-xl text-xs font-medium hover:bg-[#451B30]"
                  >
                    Adicionar
                  </button>
                </form>
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-3 rounded-2xl border border-[#F6D5D5] space-y-2 flex flex-col justify-between"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-[#FFF9F5]">
                      <img
                        src={p.public_path}
                        alt="Foto"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${p.status === 'approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {p.status === 'approved' ? 'Aprovada' : 'Pendente'}
                      </span>
                    </div>

                    <div className="pt-2 flex flex-col gap-1 border-t border-[#F6D5D5]/50">
                      {p.status !== 'approved' ? (
                        <button
                          onClick={() => handleUpdatePhotoStatus(p.id, 'approved')}
                          className="w-full py-1 bg-emerald-600 text-white rounded-lg text-xs"
                        >
                          Aprovar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdatePhotoStatus(p.id, 'rejected')}
                          className="w-full py-1 bg-amber-600 text-white rounded-lg text-xs"
                        >
                          Ocultar
                        </button>
                      )}

                      <button
                        onClick={() => handleSetHeroPhoto(p.public_path)}
                        className="w-full py-1 bg-white border border-[#C49C62] text-[#612A44] rounded-lg text-xs"
                      >
                        Foto Principal Hero
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SITE SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-[#F6D5D5] space-y-5 max-w-2xl mx-auto">
              <h3 className="text-lg font-display font-bold text-[#612A44]">
                Personalizar Textos e Identidade Visual
              </h3>

              {saveSettingsSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Configurações salvas e aplicadas com sucesso!</span>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase font-semibold text-[#612A44] mb-1">
                  Título Principal
                </label>
                <input
                  type="text"
                  value={settingsForm.title || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#612A44] mb-1">
                  Subtítulo de Apresentação
                </label>
                <input
                  type="text"
                  value={settingsForm.subtitle || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, subtitle: e.target.value })}
                  className="w-full px-4 py-2 bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#612A44] mb-1">
                  Texto Complementar (Hero)
                </label>
                <textarea
                  rows={2}
                  value={settingsForm.main_message || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, main_message: e.target.value })}
                  className="w-full px-4 py-2 bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#612A44] mb-1">
                  Mensagem no Dia do Aniversário (27/03/2027)
                </label>
                <input
                  type="text"
                  value={settingsForm.birthday_message || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, birthday_message: e.target.value })}
                  className="w-full px-4 py-2 bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#612A44] mb-1">
                  URL da Fotografia Principal (Hero)
                </label>
                <input
                  type="text"
                  value={settingsForm.hero_photo || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, hero_photo: e.target.value })}
                  placeholder="/src/assets/images/... ou URL HTTPS externa"
                  className="w-full px-4 py-2 bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl text-sm"
                />
              </div>

              <div className="pt-2 border-t border-[#F6D5D5]">
                <button
                  type="submit"
                  disabled={saveSettingsLoading}
                  className="px-6 py-2.5 bg-[#612A44] text-white rounded-full text-xs sm:text-sm font-medium hover:bg-[#451B30] transition-colors"
                >
                  {saveSettingsLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: EXPORT */}
          {activeTab === 'export' && (
            <div className="bg-white p-6 rounded-2xl border border-[#F6D5D5] space-y-4 max-w-xl mx-auto text-center">
              <Download className="w-10 h-10 text-[#C49C62] mx-auto" />
              <h3 className="text-xl font-display font-bold text-[#612A44]">
                Exportar Recados Guardados
              </h3>
              <p className="text-xs sm:text-sm text-[#612A44]/75">
                Faça o download de todas as mensagens aprovadas de carinho para guardar como recordação vitalícia para Waleska.
              </p>

              <div className="flex justify-center gap-4 pt-4">
                <a
                  href={apiClient.getExportUrl('csv')}
                  download="recados_waleska.csv"
                  className="px-6 py-3 bg-[#612A44] text-white rounded-full text-xs font-medium hover:bg-[#451B30] transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Planilha CSV (Excel UTF-8)</span>
                </a>
                <a
                  href={apiClient.getExportUrl('json')}
                  download="recados_waleska.json"
                  className="px-6 py-3 bg-white border border-[#F6D5D5] text-[#612A44] rounded-full text-xs font-medium hover:bg-[#FFF9F5] transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Arquivo JSON</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 5: SUPABASE & DATABASE CONFIG */}
          {activeTab === 'database' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border border-[#F6D5D5] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#C49C62]" />
                    <h3 className="text-base font-bold text-[#612A44]">
                      Status do Supabase PostgreSQL
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isSupabaseActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {isSupabaseActive ? 'Nuvem Conectada' : 'Modo Demonstração Ativo'}
                  </span>
                </div>

                <p className="text-xs text-[#612A44]/75 leading-relaxed">
                  Para persistência ilimitada na nuvem e deploy na Vercel, crie um projeto gratuito no{' '}
                  <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#612A44] font-bold underline">
                    Supabase.com
                  </a>{' '}
                  e preencha as variáveis em seu arquivo <code>.env</code> ou nas configurações da Vercel.
                </p>

                <div className="p-4 bg-[#FFF9F5] rounded-xl border border-[#F6D5D5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#612A44]">
                      Script SQL de Criação das Tabelas e Políticas (RLS):
                    </span>
                    <button
                      onClick={handleCopySql}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#C49C62] text-[#612A44] rounded-lg text-xs font-medium hover:bg-[#FFF9F5]"
                    >
                      {sqlCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Database className="w-3.5 h-3.5" />}
                      <span>{sqlCopied ? 'SQL Copiado!' : 'Copiar SQL'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-[#612A44]/80 p-3 bg-white rounded-lg overflow-x-auto max-h-40 border border-[#F6D5D5]/50">
                    {`-- Execute no Supabase SQL Editor:
-- migration localizado em: supabase/migrations/20270327000000_waleska_database.sql`}
                  </pre>
                </div>

                <div className="space-y-2 text-xs text-[#612A44]/80">
                  <h4 className="font-semibold text-[#612A44]">Passo a Passo Rápido:</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Acesse seu painel no Supabase e clique em <b>SQL Editor</b>.</li>
                    <li>Cole o código SQL e clique em <b>Run</b>.</li>
                    <li>No menu <b>Storage</b>, crie os buckets <code>uploads-pending</code> (Privado) e <code>gallery-public</code> (Público).</li>
                    <li>Copie sua URL e Service Role Key para as variáveis de ambiente na Vercel.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
