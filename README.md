# Waleska — Contagem para um Dia Especial

Uma aplicação web comemorativa dedicada ao aniversário de Waleska em **27 de março de 2027**, projetada com estética de revista e fine-stationery no conceito "Jardim de Memórias".

---

## 🌟 Funcionalidades

- **Contagem Regressiva em Tempo Real**:
  - Calculada com base no fuso horário oficial `America/Sao_Paulo` (27/03/2027 às 00h00).
  - Sem drift em abas inativas, com dígitos tabulares e transições suaves.
  - **Três estados automáticos**:
    1. *Antes do aniversário*: Contador regressivo ativo com expectativa.
    2. *No dia do aniversário (27/03/2027)*: Mensagem de celebração e chuva de confetes.
    3. *Após o aniversário (28/03/2027+)*: Mensagem de carinho eterno com preservação vitalícia do mural e da galeria.
- **Mural Público de Recados**:
  - Formulário intuitivo para visitantes (sem necessidade de cadastro).
  - Limite de caracteres em tempo real e campos validados.
  - Anexo opcional de até 3 fotografias (JPG, PNG, WebP até 4 MB).
  - Termo de consentimento explícito.
  - Moderação administrativa obrigatória antes da exibição pública.
- **Galeria Coletiva de Lembranças**:
  - Álbum fotográfico estilo Polaroid.
  - Visualizador Lightbox em tela cheia com zoom, navegação por teclado (setas/ESC) e toques no celular.
- **Experiências Interativas**:
  - Botão "Enviar um abraço" com contagem persistente e proteção anti-spam.
  - Compartilhamento nativo e direto para WhatsApp com mensagem personalizada.
  - Botão "Salvar a data" que gera arquivo `.ics` para o calendário.
  - Música ambiente acústica comemorativa com controle de reprodução (iniciada somente por escolha do visitante).
- **Painel Administrativo Completo (`/admin`)**:
  - Autenticação via Supabase Auth ou credenciais de demonstração.
  - Dashboard de métricas em tempo real.
  - Aprovação, rejeição, destaque e exclusão de mensagens.
  - Moderação individual de fotos e upload de fotos administrativas.
  - Editor de configurações visuais e textos do site.
  - Exportação de recados em CSV (Excel UTF-8 BOM) e JSON.
  - Assistente com o script SQL de migração do Supabase.

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
- Node.js 18+ instalado
- npm ou bun

### 1. Clonar e Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

### 3. Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

---

## 🛡️ Acesso ao Painel Administrativo

- Acesse pelo link no rodapé ou adicione `#admin` na URL: `http://localhost:3000#admin`
- **Modo Demonstração Inicial (antes de configurar o Supabase)**:
  - **E-mail**: `admin@waleska.com`
  - **Senha**: `waleska2027`

---

## ☁️ Configuração no Supabase e Deploy na Vercel

### 1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto gratuito.
2. Vá para o menu **SQL Editor**.
3. Abra o arquivo `supabase/migrations/20270327000000_waleska_database.sql` deste projeto, copie todo o conteúdo e execute no SQL Editor.
4. Vá para o menu **Storage** e crie dois buckets:
   - `uploads-pending` (Defina como **Private**)
   - `gallery-public` (Defina como **Public**)
5. Vá em **Authentication** > **Users** e crie o usuário do administrador (ex: `waleska.admin@gmail.com`).
6. No SQL Editor, registre o usuário na tabela de administradores:
   ```sql
   INSERT INTO public.admin_users (user_id, email, role)
   VALUES ('SEU_USER_ID_AQUI', 'waleska.admin@gmail.com', 'admin');
   ```

### 2. Deploy na Vercel
1. Conecte seu repositório GitHub na [Vercel](https://vercel.com).
2. Nas configurações de **Environment Variables** do projeto na Vercel, adicione:
   - `VITE_SUPABASE_URL`: URL da sua API no Supabase
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima pública do Supabase
   - `SUPABASE_URL`: Mesma URL da API do Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço secreta (Service Role Key) do Supabase
   - `SITE_URL`: URL do seu domínio na Vercel (ex: `https://waleska-aniversario.vercel.app`)
3. Clique em **Deploy**.

---

## 🔒 Segurança e Privacidade

- As chaves de serviço do Supabase (`SUPABASE_SERVICE_ROLE_KEY`) operam exclusivamente no servidor e jamais são expostas ao cliente.
- Todas as tabelas possuem **Row Level Security (RLS)** ativado, garantindo que visitantes não autenticados possam consultar apenas dados aprovados.
- Proteção contra scripts maliciosos (XSS), sanitização de textos e validação rigorosa de formato e tamanho de arquivos no backend.
- Canal dedicado no rodapé para solicitação de exclusão de dados conforme preceitos da LGPD.
