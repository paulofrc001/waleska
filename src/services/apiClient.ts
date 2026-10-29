import { GuestbookMessage, MessagePhoto, SiteSettings, DashboardStats } from '../types';

export const apiClient = {
  async getHealth() {
    try {
      const res = await fetch('/api/health');
      return await res.json();
    } catch {
      return { status: 'offline', database: 'unknown' };
    }
  },

  async getSettings(): Promise<SiteSettings> {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao carregar configurações');
    return data.settings;
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao salvar configurações');
    return data.settings;
  },

  async getApprovedMessages(): Promise<GuestbookMessage[]> {
    const res = await fetch('/api/messages');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao obter recados');
    return data.messages;
  },

  async submitMessage(payload: {
    author_name: string;
    message: string;
    photos: string[];
    consent: boolean;
    turnstileToken?: string;
  }): Promise<{ message: string; id: string }> {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Falha ao enviar mensagem');
    return { message: data.message, id: data.data?.id };
  },

  async getAllAdminMessages(statusFilter?: string, search?: string): Promise<GuestbookMessage[]> {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
    if (search) params.append('search', search);

    const res = await fetch(`/api/admin/messages?${params.toString()}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao carregar recados para moderação');
    return data.messages;
  },

  async updateMessageStatus(id: string, status: 'approved' | 'rejected' | 'pending', featured?: boolean): Promise<boolean> {
    const res = await fetch(`/api/admin/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, featured }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao atualizar recado');
    return data.success;
  },

  async deleteMessage(id: string): Promise<boolean> {
    const res = await fetch(`/api/admin/messages/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao excluir recado');
    return data.success;
  },

  async getApprovedPhotos(): Promise<MessagePhoto[]> {
    const res = await fetch('/api/photos');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao carregar fotografias');
    return data.photos;
  },

  async getAllAdminPhotos(): Promise<MessagePhoto[]> {
    const res = await fetch('/api/admin/photos');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao carregar fotos administrativas');
    return data.photos;
  },

  async updatePhotoStatus(id: string, status: 'approved' | 'rejected'): Promise<boolean> {
    const res = await fetch(`/api/admin/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao atualizar status da foto');
    return data.success;
  },

  async addAdminPhoto(publicPath: string): Promise<MessagePhoto> {
    const res = await fetch('/api/admin/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_path: publicPath }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao adicionar foto');
    return data.photo;
  },

  async uploadPhoto(file: File): Promise<{ filePath: string }> {
    return new Promise((resolve, reject) => {
      // Validate format: JPEG, PNG, WebP
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        return reject(new Error('Formato inválido. Por favor, envie imagens JPG, PNG ou WebP.'));
      }
      // Validate 4MB
      if (file.size > 4 * 1024 * 1024) {
        return reject(new Error('A imagem deve ter no máximo 4 MB.'));
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/upload-direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: base64Data,
              fileName: file.name,
              fileType: file.type,
            }),
          });
          const data = await res.json();
          if (!data.success) {
            throw new Error(data.error || 'Erro ao enviar foto');
          }
          resolve({ filePath: data.filePath });
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo da imagem'));
      reader.readAsDataURL(file);
    });
  },

  async getHugs(): Promise<number> {
    const res = await fetch('/api/hugs');
    const data = await res.json();
    return data.count || 0;
  },

  async sendHug(): Promise<{ count: number; message: string }> {
    const res = await fetch('/api/hugs', {
      method: 'POST',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao enviar abraço');
    return { count: data.count, message: data.message };
  },

  async getAdminStats(): Promise<{ stats: DashboardStats; isSupabase: boolean }> {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao carregar estatísticas');
    return { stats: data.stats, isSupabase: data.isSupabase };
  },

  getExportUrl(format: 'csv' | 'json') {
    return `/api/admin/export?format=${format}`;
  }
};
