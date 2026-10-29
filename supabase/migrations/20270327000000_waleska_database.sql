-- ==============================================================================
-- PROJETO: WALESKA — CONTAGEM PARA UM DIA ESPECIAL
-- Data do Evento: 27 de Março de 2027
-- Migração Completa do Supabase (PostgreSQL, RLS, Storage e Triggers)
-- ==============================================================================

-- 1. Extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Administradores Autorizados
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'admin' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabela de Recados do Mural (guestbook_messages)
CREATE TABLE IF NOT EXISTS public.guestbook_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_name VARCHAR(60) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    featured BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    approved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guestbook_messages_status_created 
ON public.guestbook_messages(status, created_at DESC);

-- 4. Tabela de Fotografias dos Recados (message_photos)
CREATE TABLE IF NOT EXISTS public.message_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.guestbook_messages(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    public_path TEXT,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_message_photos_status 
ON public.message_photos(status);

CREATE INDEX IF NOT EXISTS idx_message_photos_message_id 
ON public.message_photos(message_id);

-- 5. Tabela de Configurações do Site (site_settings)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'current',
    title TEXT DEFAULT 'Waleska' NOT NULL,
    subtitle TEXT DEFAULT 'Um dia especial merece ser celebrado com muito amor.' NOT NULL,
    main_message TEXT DEFAULT 'Cada mensagem, cada lembrança e cada gesto de carinho tornam essa data ainda mais inesquecível.' NOT NULL,
    birthday_message TEXT DEFAULT 'Hoje é o grande dia! Feliz aniversário, Waleska!' NOT NULL,
    post_birthday_message TEXT DEFAULT 'O dia passou, mas o carinho continua para sempre.' NOT NULL,
    hero_photo TEXT,
    visual_theme JSONB DEFAULT '{"palette": "jardim_de_memorias"}'::jsonb NOT NULL,
    display_settings JSONB DEFAULT '{"show_gallery": true, "show_hugs": true, "show_countdown": true}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Inserir configuração padrão inicial caso não exista
INSERT INTO public.site_settings (id, title, subtitle, main_message, birthday_message, post_birthday_message, hero_photo)
VALUES (
    'current',
    'Waleska',
    'Um dia especial merece ser celebrado com muito amor.',
    'Cada mensagem, cada lembrança e cada gesto de carinho tornam essa data ainda mais inesquecível.',
    'Hoje é o grande dia! Feliz aniversário, Waleska!',
    'O dia passou, mas o carinho continua para sempre.',
    '/assets/aistudio/Retrato_elegante_em_tons_creme_ec45ed4e.png'
) ON CONFLICT (id) DO UPDATE SET hero_photo = EXCLUDED.hero_photo;

-- 6. Tabela de Abraços Virtuais (hugs)
CREATE TABLE IF NOT EXISTS public.hugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hugs_created_at ON public.hugs(created_at);

-- 7. Tabela de Intenções de Upload (upload_intents)
CREATE TABLE IF NOT EXISTS public.upload_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_token TEXT NOT NULL,
    allowed_files_count INT DEFAULT 3 NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_guestbook_messages_updated_at ON public.guestbook_messages;
CREATE TRIGGER set_guestbook_messages_updated_at
BEFORE UPDATE ON public.guestbook_messages
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS set_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER set_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

ALTER TABLE public.guestbook_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_intents ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para testar se usuário atual é admin registrado
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. guestbook_messages: Público lê apenas aprovados
CREATE POLICY "Public read approved guestbook" ON public.guestbook_messages
    FOR SELECT USING (status = 'approved');

-- Inserção pública permitida com status 'pending' estrito
CREATE POLICY "Public insert pending messages" ON public.guestbook_messages
    FOR INSERT WITH CHECK (status = 'pending' AND featured = FALSE);

-- Administradores têm acesso total
CREATE POLICY "Admins full access guestbook" ON public.guestbook_messages
    FOR ALL USING (public.is_admin());

-- 2. message_photos: Público lê apenas fotos aprovadas
CREATE POLICY "Public read approved photos" ON public.message_photos
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Public insert pending photos" ON public.message_photos
    FOR INSERT WITH CHECK (status = 'pending');

CREATE POLICY "Admins full access photos" ON public.message_photos
    FOR ALL USING (public.is_admin());

-- 3. site_settings: Leitura pública, escrita apenas admins
CREATE POLICY "Public read site_settings" ON public.site_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins modify site_settings" ON public.site_settings
    FOR ALL USING (public.is_admin());

-- 4. hugs: Leitura da contagem pública, inserção pública permitida
CREATE POLICY "Public read hugs" ON public.hugs
    FOR SELECT USING (true);

CREATE POLICY "Public insert hugs" ON public.hugs
    FOR INSERT WITH CHECK (true);

-- 5. admin_users: Somente o próprio usuário autenticado ou superadmin lê
CREATE POLICY "Admins read admin_users" ON public.admin_users
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- INSTRUÇÕES DE STORAGE (SUPABASE STORAGE BUCKETS)
-- Crie os seguintes 2 buckets no Supabase Console (seção Storage):
-- 1. "uploads-pending" -> Privado (Public: OFF)
-- 2. "gallery-public"  -> Público (Public: ON)
-- ==============================================================================
