import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Types ---
export type MessageStatus = 'pending' | 'approved' | 'rejected';

export interface MessagePhoto {
  id: string;
  message_id: string;
  storage_path: string;
  public_path: string;
  status: MessageStatus;
  created_at: string;
}

export interface GuestbookMessage {
  id: string;
  author_name: string;
  message: string;
  status: MessageStatus;
  featured: boolean;
  created_at: string;
  approved_at?: string | null;
  updated_at: string;
  photos?: MessagePhoto[];
}

export interface SiteSettings {
  id: string;
  title: string;
  subtitle: string;
  main_message: string;
  birthday_message: string;
  post_birthday_message: string;
  hero_photo: string | null;
  visual_theme: {
    palette: string;
  };
  display_settings: {
    show_gallery: boolean;
    show_hugs: boolean;
    show_countdown: boolean;
  };
  updated_at?: string;
}

export interface DashboardStats {
  total_messages: number;
  pending_messages: number;
  approved_messages: number;
  rejected_messages: number;
  total_photos: number;
  total_hugs: number;
}

// --- Storage & Database Configuration ---
const DATA_DIR = process.env.VERCEL ? '/tmp/waleska-data' : path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseServer = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  supabaseUrl !== 'https://xyzcompany.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabaseAdmin: SupabaseClient | null = hasSupabaseServer
  ? createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { persistSession: false }
    })
  : null;

interface LocalData {
  settings: SiteSettings;
  messages: GuestbookMessage[];
  photos: MessagePhoto[];
  hugs: { id: string; ip: string; created_at: string }[];
}

const defaultSettings: SiteSettings = {
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

const defaultPhotos: MessagePhoto[] = [
  {
    id: 'waleska-official-portrait',
    message_id: 'admin_upload',
    storage_path: '/assets/aistudio/Retrato_elegante_em_tons_creme_ec45ed4e.png',
    public_path: '/assets/aistudio/Retrato_elegante_em_tons_creme_ec45ed4e.png',
    status: 'approved',
    created_at: '2026-10-29T11:20:00.000Z'
  }
];

// In-memory fallback cache for serverless execution
let memoryData: LocalData = {
  settings: defaultSettings,
  messages: [],
  photos: defaultPhotos,
  hugs: []
};

function ensureDataFile(): LocalData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
      const initialData: LocalData = {
        settings: defaultSettings,
        messages: [],
        photos: defaultPhotos,
        hugs: []
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      memoryData = initialData;
      return initialData;
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    memoryData = JSON.parse(raw);
    return memoryData;
  } catch (err) {
    // Read-only filesystem fallback
    return memoryData;
  }
}

function saveData(data: LocalData) {
  memoryData = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // ignore in serverless read-only environment
  }
}

// Initial read
ensureDataFile();

// --- Storage Service ---
const StorageService = {
  async getSettings(): Promise<SiteSettings> {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('site_settings')
          .select('*')
          .eq('id', 'current')
          .single();
        if (data && !error) return data;
      } catch (err) {
        console.error('Supabase getSettings error:', err);
      }
    }
    const local = ensureDataFile();
    return local.settings || defaultSettings;
  },

  async updateSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('site_settings')
          .upsert({ id: 'current', ...updates, updated_at: new Date().toISOString() })
          .select()
          .single();
        if (data && !error) return data;
      } catch (err) {
        console.error('Supabase updateSettings error:', err);
      }
    }
    const local = ensureDataFile();
    local.settings = { ...local.settings, ...updates, updated_at: new Date().toISOString() };
    saveData(local);
    return local.settings;
  },

  async getApprovedMessages(): Promise<GuestbookMessage[]> {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('guestbook_messages')
          .select('*, photos:message_photos(*)')
          .eq('status', 'approved')
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false });
        if (data && !error) return data;
      } catch (err) {
        console.error('Supabase getApprovedMessages error:', err);
      }
    }
    const local = ensureDataFile();
    const approved = local.messages.filter(m => m.status === 'approved');
    return approved
      .map(m => ({
        ...m,
        photos: local.photos.filter(p => p.message_id === m.id && p.status === 'approved')
      }))
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  },

  async getAllMessages(statusFilter?: string, search?: string): Promise<GuestbookMessage[]> {
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('guestbook_messages')
          .select('*, photos:message_photos(*)')
          .order('created_at', { ascending: false });

        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
        if (search) {
          query = query.ilike('author_name', `%${search}%`);
        }

        const { data, error } = await query;
        if (data && !error) return data;
      } catch (err) {
        console.error('Supabase getAllMessages error:', err);
      }
    }
    const local = ensureDataFile();
    let msgs = local.messages.map(m => ({
      ...m,
      photos: local.photos.filter(p => p.message_id === m.id)
    }));

    if (statusFilter && statusFilter !== 'all') {
      msgs = msgs.filter(m => m.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      msgs = msgs.filter(m => m.author_name.toLowerCase().includes(q) || m.message.toLowerCase().includes(q));
    }
    return msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createMessage(author_name: string, message: string, photos: string[]): Promise<GuestbookMessage> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newMessage: GuestbookMessage = {
      id,
      author_name: author_name.trim(),
      message: message.trim(),
      status: 'pending',
      featured: false,
      created_at: now,
      updated_at: now,
      photos: []
    };

    if (supabaseAdmin) {
      try {
        const { data: insertedMsg, error: msgErr } = await supabaseAdmin
          .from('guestbook_messages')
          .insert({
            id,
            author_name: newMessage.author_name,
            message: newMessage.message,
            status: 'pending',
            featured: false,
            created_at: now,
            updated_at: now
          })
          .select()
          .single();

        if (insertedMsg && !msgErr) {
          if (photos && photos.length > 0) {
            const photoRows = photos.map(photoPath => ({
              id: crypto.randomUUID(),
              message_id: id,
              storage_path: photoPath,
              public_path: photoPath,
              status: 'pending',
              created_at: now
            }));
            await supabaseAdmin.from('message_photos').insert(photoRows);
          }
          return insertedMsg;
        }
      } catch (err) {
        console.error('Supabase createMessage error:', err);
      }
    }

    const local = ensureDataFile();
    local.messages.unshift(newMessage);

    if (photos && photos.length > 0) {
      for (const p of photos) {
        const photoObj: MessagePhoto = {
          id: crypto.randomUUID(),
          message_id: id,
          storage_path: p,
          public_path: p,
          status: 'pending',
          created_at: now
        };
        local.photos.push(photoObj);
        newMessage.photos?.push(photoObj);
      }
    }

    saveData(local);
    return newMessage;
  },

  async updateMessageStatus(id: string, status: 'approved' | 'rejected' | 'pending', featured?: boolean): Promise<boolean> {
    const now = new Date().toISOString();
    const approvedAt = status === 'approved' ? now : null;

    if (supabaseAdmin) {
      try {
        const updatePayload: Record<string, any> = {
          status,
          updated_at: now
        };
        if (approvedAt) updatePayload.approved_at = approvedAt;
        if (typeof featured === 'boolean') updatePayload.featured = featured;

        const { error } = await supabaseAdmin
          .from('guestbook_messages')
          .update(updatePayload)
          .eq('id', id);

        if (!error) {
          if (status === 'approved') {
            await supabaseAdmin.from('message_photos').update({ status: 'approved' }).eq('message_id', id);
          } else if (status === 'rejected') {
            await supabaseAdmin.from('message_photos').update({ status: 'rejected' }).eq('message_id', id);
          }
          return true;
        }
      } catch (err) {
        console.error('Supabase updateMessageStatus error:', err);
      }
    }

    const local = ensureDataFile();
    const msg = local.messages.find(m => m.id === id);
    if (!msg) return false;

    msg.status = status;
    msg.updated_at = now;
    if (status === 'approved') msg.approved_at = now;
    if (typeof featured === 'boolean') msg.featured = featured;

    local.photos.forEach(p => {
      if (p.message_id === id) {
        p.status = status;
      }
    });

    saveData(local);
    return true;
  },

  async deleteMessage(id: string): Promise<boolean> {
    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.from('guestbook_messages').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.error('Supabase deleteMessage error:', err);
      }
    }
    const local = ensureDataFile();
    local.messages = local.messages.filter(m => m.id !== id);
    local.photos = local.photos.filter(p => p.message_id !== id);
    saveData(local);
    return true;
  },

  async getApprovedPhotos(): Promise<MessagePhoto[]> {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('message_photos')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });
        if (data && !error) return data;
      } catch (err) {
        console.error('Supabase getApprovedPhotos error:', err);
      }
    }
    const local = ensureDataFile();
    return local.photos.filter(p => p.status === 'approved');
  },

  async getAllPhotos(): Promise<MessagePhoto[]> {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('message_photos')
          .select('*')
          .order('created_at', { ascending: false });
        if (data && !error) return data;
      } catch (err) {
        console.error('Supabase getAllPhotos error:', err);
      }
    }
    const local = ensureDataFile();
    return local.photos;
  },

  async updatePhotoStatus(id: string, status: 'approved' | 'rejected'): Promise<boolean> {
    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.from('message_photos').update({ status }).eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.error('Supabase updatePhotoStatus error:', err);
      }
    }
    const local = ensureDataFile();
    const p = local.photos.find(photo => photo.id === id);
    if (!p) return false;
    p.status = status;
    saveData(local);
    return true;
  },

  async addAdminPhoto(publicPath: string): Promise<MessagePhoto> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newPhoto: MessagePhoto = {
      id,
      message_id: 'admin_upload',
      storage_path: publicPath,
      public_path: publicPath,
      status: 'approved',
      created_at: now
    };

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('message_photos').insert(newPhoto);
      } catch (err) {
        console.error('Supabase addAdminPhoto error:', err);
      }
    }
    const local = ensureDataFile();
    local.photos.unshift(newPhoto);
    saveData(local);
    return newPhoto;
  },

  async getHugsCount(): Promise<number> {
    if (supabaseAdmin) {
      try {
        const { count, error } = await supabaseAdmin
          .from('hugs')
          .select('*', { count: 'exact', head: true });
        if (!error && typeof count === 'number') return count;
      } catch (err) {
        console.error('Supabase getHugsCount error:', err);
      }
    }
    const local = ensureDataFile();
    return local.hugs ? local.hugs.length : 0;
  },

  async registerHug(ip: string): Promise<number> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('hugs').insert({ id, session_hash: ip, created_at: now });
        return this.getHugsCount();
      } catch (err) {
        console.error('Supabase registerHug error:', err);
      }
    }

    const local = ensureDataFile();
    if (!local.hugs) local.hugs = [];
    local.hugs.push({ id, ip, created_at: now });
    saveData(local);
    return local.hugs.length;
  },

  async getStats(): Promise<DashboardStats> {
    const allMsgs = await this.getAllMessages();
    const allPhotos = await this.getAllPhotos();
    const hugs = await this.getHugsCount();

    return {
      total_messages: allMsgs.length,
      pending_messages: allMsgs.filter(m => m.status === 'pending').length,
      approved_messages: allMsgs.filter(m => m.status === 'approved').length,
      rejected_messages: allMsgs.filter(m => m.status === 'rejected').length,
      total_photos: allPhotos.filter(p => p.status === 'approved').length,
      total_hugs: hugs
    };
  }
};

// --- Router Definition ---
export const apiRouter = express.Router();

apiRouter.get('/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: hasSupabaseServer ? 'supabase_connected' : 'local_storage_demo',
    event_date: '2027-03-27T00:00:00-03:00'
  });
});

apiRouter.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await StorageService.getSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/admin/settings', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const updated = await StorageService.updateSettings(updates);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/messages', async (_req: Request, res: Response) => {
  try {
    const messages = await StorageService.getApprovedMessages();
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/messages', async (req: Request, res: Response) => {
  try {
    const { author_name, message, photos, consent } = req.body;

    if (!author_name || typeof author_name !== 'string' || author_name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Por favor, informe seu nome.' });
    }
    if (author_name.trim().length > 60) {
      return res.status(400).json({ success: false, error: 'O nome deve ter no máximo 60 caracteres.' });
    }
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'O recado deve conter pelo menos 5 caracteres.' });
    }
    if (message.trim().length > 1000) {
      return res.status(400).json({ success: false, error: 'O recado não pode ultrapassar 1.000 caracteres.' });
    }
    if (!consent) {
      return res.status(400).json({ success: false, error: 'É necessário autorizar a publicação do texto e das fotografias.' });
    }

    const safePhotos: string[] = Array.isArray(photos) ? photos.slice(0, 3) : [];
    const created = await StorageService.createMessage(author_name, message, safePhotos);

    return res.status(201).json({
      success: true,
      message: 'Seu carinho foi recebido! Obrigado por fazer parte dessa homenagem. Sua mensagem aparecerá no mural após aprovação.',
      data: { id: created.id }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erro ao processar envio.' });
  }
});

apiRouter.get('/admin/messages', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const messages = await StorageService.getAllMessages(status, search);
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.patch('/admin/messages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, featured } = req.body;
    const success = await StorageService.updateMessageStatus(id, status, featured);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/admin/messages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await StorageService.deleteMessage(id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/photos', async (_req: Request, res: Response) => {
  try {
    const photos = await StorageService.getApprovedPhotos();
    res.json({ success: true, photos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/admin/photos', async (_req: Request, res: Response) => {
  try {
    const photos = await StorageService.getAllPhotos();
    res.json({ success: true, photos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.patch('/admin/photos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const success = await StorageService.updatePhotoStatus(id, status);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/admin/photos', async (req: Request, res: Response) => {
  try {
    const { public_path } = req.body;
    if (!public_path) {
      return res.status(400).json({ success: false, error: 'Caminho da foto obrigatório' });
    }
    const photo = await StorageService.addAdminPhoto(public_path);
    res.json({ success: true, photo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/upload-direct', async (req: Request, res: Response) => {
  try {
    const { fileData, fileType } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, error: 'Dados do arquivo ausentes' });
    }

    const mime = fileType || 'image/jpeg';
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Arquivo excede 4 MB.' });
    }

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const randomName = `${crypto.randomUUID()}.${ext}`;

    // Upload to Supabase Storage if configured
    if (supabaseAdmin) {
      try {
        const { error: uploadError } = await supabaseAdmin.storage
          .from('uploads-pending')
          .upload(randomName, buffer, { contentType: mime, upsert: false });

        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('gallery-public')
            .getPublicUrl(randomName);

          return res.json({
            success: true,
            filePath: publicUrlData?.publicUrl || `/uploads/${randomName}`,
            storagePath: `uploads-pending/${randomName}`
          });
        }
      } catch (e) {
        console.warn('Supabase storage upload error:', e);
      }
    }

    // Local / serverless temporary upload save
    const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.resolve(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, randomName), buffer);

    return res.json({
      success: true,
      filePath: `/uploads/${randomName}`,
      storagePath: `uploads/${randomName}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erro no upload' });
  }
});

apiRouter.get('/hugs', async (_req: Request, res: Response) => {
  try {
    const count = await StorageService.getHugsCount();
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/hugs', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'client';
    const updatedCount = await StorageService.registerHug(ip);
    res.json({
      success: true,
      count: updatedCount,
      message: 'Um abraço cheio de carinho enviado para Waleska!'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/admin/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await StorageService.getStats();
    res.json({ success: true, stats, isSupabase: hasSupabaseServer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/admin/export', async (req: Request, res: Response) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const messages = await StorageService.getApprovedMessages();

    if (format === 'csv') {
      const bom = '\uFEFF';
      const header = 'ID,Autor,Mensagem,Data,Destaque,Fotos\n';
      const rows = messages.map(m => {
        const safeAuthor = `"${m.author_name.replace(/"/g, '""')}"`;
        const safeMsg = `"${m.message.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        const safePhotos = `"${(m.photos || []).map(p => p.public_path).join('; ')}"`;
        return `${m.id},${safeAuthor},${safeMsg},${m.created_at},${m.featured ? 'Sim' : 'Não'},${safePhotos}`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="recados_waleska.csv"');
      return res.send(bom + header + rows);
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="recados_waleska.json"');
      return res.send(JSON.stringify(messages, null, 2));
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --- Express App Export for Vercel Serverless Function & Local Dev ---
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount on both '/api' and '/' to handle both direct and rewritten routes on Vercel
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Erro interno do servidor' });
});

export default app;
