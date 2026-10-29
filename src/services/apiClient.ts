import { GuestbookMessage, MessagePhoto, SiteSettings, DashboardStats } from '../types';

const defaultFallbackSettings: SiteSettings = {
  id: 'current',
  title: 'Waleska',
  subtitle: 'Um dia especial merece ser celebrado com muito amor.',
  main_message: 'Cada mensagem, cada lembrança e cada gesto de carinho tornam essa data ainda mais inesquecível.',
  birthday_message: 'Hoje é o grande dia! Feliz aniversário, Waleska!',
  post_birthday_message: 'O dia passou, mas o carinho continua para sempre.',
  hero_photo: '/assets/aistudio/Retrato_elegante_em_tons_creme_ec45ed4e.png',
  visual_theme: {
    palette: 'jardim_de_memorias'
  },
  display_settings: {
    show_gallery: true,
    show_hugs: true,
    show_countdown: true
  }
};

async function parseJsonResponse<T>(res: Response, fallbackError = 'Erro na requisição'): Promise<T> {
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(text && text.length < 120 ? text : `${fallbackError} (${res.status})`);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${fallbackError}: o servidor retornou uma resposta não reconhecida.`);
  }
}

export const apiClient = {
  async getHealth() {
    try {
      const res = await fetch('/api/health');
      return await parseJsonResponse<any>(res, 'Servidor indisponível');
    } catch {
      return { status: 'offline', database: 'unknown' };
    }
  },

  async getSettings(): Promise<SiteSettings> {
    try {
      const res = await fetch('/api/settings');
      const data = await parseJsonResponse<{ success: boolean; settings?: SiteSettings; error?: string }>(
        res,
        'Erro ao carregar configurações'
      );
      if (!data.success || !data.settings) {
        return defaultFallbackSettings;
      }
      return data.settings;
    } catch (e) {
      console.warn('Fallback para configurações locais:', e);
      return defaultFallbackSettings;
    }
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await parseJsonResponse<{ success: boolean; settings: SiteSettings; error?: string }>(
      res,
      'Erro ao salvar configurações'
    );
    if (!data.success) throw new Error(data.error || 'Erro ao salvar configurações');
    return data.settings;
  },

  async getApprovedMessages(): Promise<GuestbookMessage[]> {
    try {
      const res = await fetch('/api/messages');
      const data = await parseJsonResponse<{ success: boolean; messages: GuestbookMessage[]; error?: string }>(
        res,
        'Erro ao obter recados'
      );
      if (!data.success) return [];
      return data.messages || [];
    } catch (e) {
      console.warn('Aviso ao obter recados aprovados:', e);
      return [];
    }
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
    const data = await parseJsonResponse<{ success: boolean; message: string; data?: { id: string }; error?: string }>(
      res,
      'Falha ao enviar mensagem'
    );
    if (!data.success) throw new Error(data.error || 'Falha ao enviar mensagem');
    return { message: data.message, id: data.data?.id || '' };
  },

  async getAllAdminMessages(statusFilter?: string, search?: string): Promise<GuestbookMessage[]> {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
    if (search) params.append('search', search);

    const res = await fetch(`/api/admin/messages?${params.toString()}`);
    const data = await parseJsonResponse<{ success: boolean; messages: GuestbookMessage[]; error?: string }>(
      res,
      'Erro ao carregar recados para moderação'
    );
    if (!data.success) throw new Error(data.error || 'Erro ao carregar recados para moderação');
    return data.messages || [];
  },

  async updateMessageStatus(id: string, status: 'approved' | 'rejected' | 'pending', featured?: boolean): Promise<boolean> {
    const res = await fetch(`/api/admin/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, featured }),
    });
    const data = await parseJsonResponse<{ success: boolean; error?: string }>(res, 'Erro ao atualizar recado');
    if (!data.success) throw new Error(data.error || 'Erro ao atualizar recado');
    return data.success;
  },

  async deleteMessage(id: string): Promise<boolean> {
    const res = await fetch(`/api/admin/messages/${id}`, {
      method: 'DELETE',
    });
    const data = await parseJsonResponse<{ success: boolean; error?: string }>(res, 'Erro ao excluir recado');
    if (!data.success) throw new Error(data.error || 'Erro ao excluir recado');
    return data.success;
  },

  async getApprovedPhotos(): Promise<MessagePhoto[]> {
    try {
      const res = await fetch('/api/photos');
      const data = await parseJsonResponse<{ success: boolean; photos: MessagePhoto[]; error?: string }>(
        res,
        'Erro ao carregar fotografias'
      );
      if (!data.success) return [];
      return data.photos || [];
    } catch (e) {
      console.warn('Aviso ao carregar fotos:', e);
      return [];
    }
  },

  async getAllAdminPhotos(): Promise<MessagePhoto[]> {
    const res = await fetch('/api/admin/photos');
    const data = await parseJsonResponse<{ success: boolean; photos: MessagePhoto[]; error?: string }>(
      res,
      'Erro ao carregar fotos administrativas'
    );
    if (!data.success) throw new Error(data.error || 'Erro ao carregar fotos administrativas');
    return data.photos || [];
  },

  async updatePhotoStatus(id: string, status: 'approved' | 'rejected'): Promise<boolean> {
    const res = await fetch(`/api/admin/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await parseJsonResponse<{ success: boolean; error?: string }>(
      res,
      'Erro ao atualizar status da foto'
    );
    if (!data.success) throw new Error(data.error || 'Erro ao atualizar status da foto');
    return data.success;
  },

  async addAdminPhoto(publicPath: string): Promise<MessagePhoto> {
    const res = await fetch('/api/admin/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_path: publicPath }),
    });
    const data = await parseJsonResponse<{ success: boolean; photo: MessagePhoto; error?: string }>(
      res,
      'Erro ao adicionar foto'
    );
    if (!data.success) throw new Error(data.error || 'Erro ao adicionar foto');
    return data.photo;
  },

  async uploadPhoto(file: File): Promise<{ filePath: string }> {
    return new Promise((resolve, reject) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        return reject(new Error('Formato inválido. Por favor, envie imagens JPG, PNG ou WebP.'));
      }
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
          const data = await parseJsonResponse<{ success: boolean; filePath: string; error?: string }>(
            res,
            'Erro ao enviar foto'
          );
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
    try {
      const res = await fetch('/api/hugs');
      const data = await parseJsonResponse<{ success: boolean; count: number }>(res, 'Erro ao carregar abraços');
      return data.count || 0;
    } catch {
      return 0;
    }
  },

  async sendHug(): Promise<{ count: number; message: string }> {
    const res = await fetch('/api/hugs', {
      method: 'POST',
    });
    const data = await parseJsonResponse<{ success: boolean; count: number; message: string; error?: string }>(
      res,
      'Erro ao enviar abraço'
    );
    if (!data.success) throw new Error(data.error || 'Erro ao enviar abraço');
    return { count: data.count, message: data.message };
  },

  async getAdminStats(): Promise<{ stats: DashboardStats; isSupabase: boolean }> {
    const res = await fetch('/api/admin/stats');
    const data = await parseJsonResponse<{ success: boolean; stats: DashboardStats; isSupabase: boolean; error?: string }>(
      res,
      'Erro ao carregar estatísticas'
    );
    if (!data.success) throw new Error(data.error || 'Erro ao carregar estatísticas');
    return { stats: data.stats, isSupabase: data.isSupabase };
  },

  getExportUrl(format: 'csv' | 'json') {
    return `/api/admin/export?format=${format}`;
  }
};
