import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { StorageService, hasSupabaseServer, supabaseAdmin } from './storage';

export const apiRouter = Router();

// Ensure public/uploads directory exists for direct uploads
const UPLOADS_DIR = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Simple rate limiter for hugs & submissions
const rateLimits = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

// --- Health / Status ---
apiRouter.get('/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: hasSupabaseServer ? 'supabase_connected' : 'local_storage_demo',
    event_date: '2027-03-27T00:00:00-03:00'
  });
});

// --- Site Settings ---
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

// --- Public Messages ---
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
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    // Rate limit: max 5 messages per 10 minutes per IP
    if (!checkRateLimit(`msg_${ip}`, 5, 10 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        error: 'Muitas mensagens enviadas recentemente. Por favor, aguarde alguns minutos antes de enviar novamente.'
      });
    }

    const { author_name, message, photos, consent, turnstileToken } = req.body;

    // Validation
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

    // Optional Cloudflare Turnstile verification if secret key is present
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret && turnstileSecret !== '0x4AAAAAAAx...' && turnstileToken) {
      try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: turnstileSecret,
            response: turnstileToken,
            remoteip: ip
          })
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          return res.status(400).json({ success: false, error: 'Falha na validação de segurança anti-bot.' });
        }
      } catch (e) {
        console.warn('Turnstile check warning:', e);
      }
    }

    // Limit photos to max 3
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

// --- Admin Messages Moderation ---
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

    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status inválido' });
    }

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

// --- Public & Admin Photos ---
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
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status inválido' });
    }
    const success = await StorageService.updatePhotoStatus(id, status);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin upload memory photo directly
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

// --- Secure Photo Upload Direct ---
apiRouter.post('/upload-direct', async (req: Request, res: Response) => {
  try {
    const { fileData, fileName, fileType } = req.body;
    if (!fileData || !fileName) {
      return res.status(400).json({ success: false, error: 'Dados do arquivo ausentes' });
    }

    // Allowed mime types: jpeg, png, webp
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const mime = fileType || 'image/jpeg';
    if (!allowed.includes(mime)) {
      return res.status(400).json({ success: false, error: 'Formato não permitido. Envie apenas JPG, PNG ou WebP.' });
    }

    // Strip data:image/...;base64, prefix if present
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 4MB limit check
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Arquivo excede o limite máximo de 4 MB.' });
    }

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const randomName = `${crypto.randomUUID()}.${ext}`;

    // If Supabase storage is ready, upload to 'uploads-pending' bucket
    if (supabaseAdmin) {
      try {
        const { error: uploadError } = await supabaseAdmin.storage
          .from('uploads-pending')
          .upload(randomName, buffer, {
            contentType: mime,
            upsert: false
          });

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
        console.warn('Supabase storage upload failed, saving locally:', e);
      }
    }

    // Local file fallback
    const targetPath = path.join(UPLOADS_DIR, randomName);
    fs.writeFileSync(targetPath, buffer);

    return res.json({
      success: true,
      filePath: `/uploads/${randomName}`,
      storagePath: `uploads/${randomName}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erro no upload' });
  }
});

// --- Virtual Hugs ---
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
    // Max 10 hugs per minute per IP to protect against macro spam
    if (!checkRateLimit(`hug_${ip}`, 10, 60 * 1000)) {
      const current = await StorageService.getHugsCount();
      return res.json({ success: true, count: current, message: 'Obrigado por tantos abraços!' });
    }

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

// --- Admin Stats ---
apiRouter.get('/admin/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await StorageService.getStats();
    res.json({ success: true, stats, isSupabase: hasSupabaseServer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Admin Export (CSV / JSON with UTF-8 BOM) ---
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
