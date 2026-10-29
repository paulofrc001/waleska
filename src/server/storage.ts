import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GuestbookMessage, MessagePhoto, SiteSettings, DashboardStats } from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
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

function ensureDataFile(): LocalData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialData: LocalData = {
      settings: defaultSettings,
      messages: [],
      photos: [],
      hugs: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      settings: defaultSettings,
      messages: [],
      photos: [],
      hugs: []
    };
  }
}

function saveData(data: LocalData) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export const StorageService = {
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
    // attach photos
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
          // also update attached photos if approving message
          if (status === 'approved') {
            await supabaseAdmin
              .from('message_photos')
              .update({ status: 'approved' })
              .eq('message_id', id);
          } else if (status === 'rejected') {
            await supabaseAdmin
              .from('message_photos')
              .update({ status: 'rejected' })
              .eq('message_id', id);
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

    // update photos
    local.photos.forEach(p => {
      if (p.message_id === id) {
        p.status = status;
      }
    });

    saveData(local);
    return true;
  },

  async toggleFeatured(id: string): Promise<boolean> {
    const local = ensureDataFile();
    const msg = local.messages.find(m => m.id === id);
    if (!msg) return false;
    const newFeatured = !msg.featured;
    return this.updateMessageStatus(id, msg.status, newFeatured);
  },

  async deleteMessage(id: string): Promise<boolean> {
    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin
          .from('guestbook_messages')
          .delete()
          .eq('id', id);
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
        const { error } = await supabaseAdmin
          .from('message_photos')
          .update({ status })
          .eq('id', id);
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
    const local = ensureDataFile();
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
