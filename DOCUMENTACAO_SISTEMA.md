# 📖 DOCUMENTAÇÃO TÉCNICA E OPERACIONAL DO SISTEMA
## AGENDA TEENS & PLATAFORMA DE INTELIGÊNCIA TEOLÓGICA (FULL-STACK)
**Versão:** 1.0 &bull; **Data:** Novembro de 2026  
**Arquitetura:** Clean Architecture (Robert C. Martin) &bull; DDD &bull; DevSecOps  
**Stack:** FastAPI (Python 3.12) &bull; Next.js 14 (TypeScript & Tailwind) &bull; Supabase PostgreSQL &bull; Google Gemini Multimodal

---

## 1. VISÃO GERAL DO PRODUTO

O **Agenda Teens & Pregações AI** é um ecossistema digital corporativo desenvolvido para o gerenciamento inteligente de programações, governança de ministérios e acompanhamento discipular de adolescentes. A plataforma atua em duas frentes integradas:
1. **Governança Eclesiástica & Agenda PWA**: Gerenciamento de eventos bilaterais (proposta por líderes, homologação e auditoria por pastores), confirmação de presença (RSVP), notificações e registro de membros sob rígida conformidade com a LGPD.
2. **Inteligência Teológica & IA Multimodal**: Estruturação homilética automatizada de mensagens pregadas via áudio/vídeo, extração de versículos, geração de convites litúrgicos com IA e curadoria litúrgica.

---

## 2. ARQUITETURA LIMPA (CLEAN ARCHITECTURE & SOLID)

A estrutura de código obedece fielmente à **Regra de Dependência**, garantindo que as políticas de negócio de alto nível sejam independentes de detalhes externos (bancos de dados, frameworks web e interfaces).

```
API PREGACAO/
├── backend/
│   ├── app/
│   │   ├── domain/               # [Camada 1: Entidades & Regras Corporativas Puras]
│   │   │   ├── entities/         # Classes puras: Event, SermonOutline, User, Ministry
│   │   │   └── exceptions/       # Exceções de domínio (ValidationException, etc.)
│   │   ├── use_cases/            # [Camada 2: Regras da Aplicação & Orquestração]
│   │   │   ├── create_event.py   # Criação com validação e atribuição ministerial
│   │   │   ├── generate_outline.py # Pipeline de IA para pregações
│   │   │   ├── list_events.py    # Filtros temporais e por tags ministeriais
│   │   │   └── ai_assist_event.py # Copiloto de briefing litúrgico
│   │   ├── infrastructure/       # [Camada 4: Drivers, Banco de Dados & Serviços 3P]
│   │   │   ├── database/         # Pool assíncrono asyncpg + Supabase PostgreSQL
│   │   │   ├── ai/               # SDK Google Gemini (File API + 2.5 Flash)
│   │   │   └── external/         # Integração ViaCEP e Google Maps
│   │   └── presentation/         # [Camada 3: Adaptadores de Interface & DTOs]
│   │       ├── routers/          # Endpoints RESTful FastAPI
│   │       └── schemas/          # DTOs de validação com Pydantic
│   └── scripts/                  # Migrações, seeds de dados e verificações
└── frontend/                     # [Camada Externa: Frameworks & Drivers / UI PWA]
    └── src/
        ├── app/                  # Next.js App Router (Páginas e Rotas)
        ├── components/           # Componentes Modulares desacoplados (SOLID)
        ├── contexts/             # TeensAuthContext (Gestão de Sessão & Modo Ghost)
        ├── services/             # Adaptador de API HTTP (Fetch Tipado)
        └── types/                # Contratos e Tipos TypeScript estritos
```

---

## 3. GOVERNANÇA ECLESIÁSTICA & RBAC HIERÁRQUICO

O sistema adota um modelo estrito de **Controle de Acesso Baseado em Funções (RBAC)**, com separação de responsabilidades e isolamento total de sessões:

```mermaid
flowchart TD
    subgraph ADMIN ["🔴 Super Admin"]
        A1[Auditoria Global do Sistema]
        A2[Visão Geral de Membros em Ordem Alfabética A-Z]
        A3["👻 MODO GHOST: Simulação Instantânea de Usuários"]
    end

    subgraph PASTOR ["🟣 Colegiado Pastoral (Pastor Sênior)"]
        P1[Governança dos Líderes de Ministérios]
        P2[Eleição de Líderes e Vínculo de até 3 Ministérios]
        P3[Catálogo Oficial de Ministérios com Brasões Kanji]
        P4[Homologação Bilateral de Eventos e Termos da Igreja]
    end

    subgraph LEADER ["🟡 Liderança Ministerial (ex: Jorge - #Teatro)"]
        L1[Gestão Exclusiva dos Teens do seu Ministério]
        L2[Proposta de Eventos ao Pastor com Assistência de IA]
        L3[Cadastramento de Adolescentes sob LGPD]
        L4[Acompanhamento de Presença & Contato dos Pais]
    end

    subgraph TEEN ["🔵 Membro Comum (ex: Carlos - #Teatro)"]
        T1[Visualização da Agenda Filtrada por suas Tags]
        T2[Confirmação de Presença / RSVP em 1 Clique]
        T3[Acesso a Esboços e Materiais do Ministério]
    end

    ADMIN -.->|Simula em Modo Ghost| PASTOR
    ADMIN -.->|Simula em Modo Ghost| LEADER
    ADMIN -.->|Simula em Modo Ghost| TEEN
    PASTOR -->|Homologa e Elege| LEADER
    LEADER -->|Discipula e Cuida| TEEN
```

### Detalhamento das Regras por Papel:

1. **Super Admin (`ADMIN`)**:
   - Vê **todos os usuários em ordem alfabética (A-Z ou Z-A)** com contadores analíticos e filtros específicos por cargo e ministério.
   - Acesso exclusivo ao **Modo Ghost**: menu suspenso na Navbar para testar a plataforma exatamente como o Pastor, como o Líder Jorge ou como o Membro Carlos, com banner roxo flutuante de alerta e saída instantânea.
2. **Pastor Sênior (`PASTOR`)**:
   - É responsável direto pelos **Líderes de Ministérios**.
   - Na gestão de membros, foca nos líderes da igreja para eleição, acompanhamento pastoral e vínculo de até 3 ministérios oficiais com seus brasões em Kanji e cores oficiais.
   - Homologação de eventos: eventos criados por líderes ficam como "Rascunho / Aguardando Pastor"; o Pastor pode aprovar, publicar ou propor ajustes de data e local.
3. **Líder de Ministério (`LEADER`)**:
   - É responsável estritamente pelos **Teens do seu ministério** (ex: quem possui a tag `#Teatro` ou pertence ao Ministério de Teatro & Artes).
   - Não visualiza outros líderes nem pastores, blindando a hierarquia.
   - Visualiza dados de contato dos pais sob LGPD para autorizações e emergências.
   - Cadastra novos adolescentes diretamente vinculados ao seu grupo.
4. **Adolescente (`TEEN`)**:
   - Sessão 100% isolada: não possui botões de troca de papel nem de liderança.
   - Vê apenas eventos globais da igreja e eventos correspondentes às suas tags ministeriais.
   - Confirmação e cancelamento de presença (RSVP) com controle de capacidade máxima.

---

## 4. MODELAGEM DE DADOS (SUPABASE POSTGRESQL)

O banco de dados relacional utiliza o PostgreSQL no Supabase com integridade referencial, índices otimizados e suporte a tipos semiestruturados (`JSONB` e `TEXT[]`):

### Tabelas Principais:

```sql
-- 1. Usuários e Hierarquia Eclesiástica
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'PASTOR', 'LEADER', 'TEEN')),
    phone VARCHAR(50),
    birth_date DATE,
    parent_name VARCHAR(255),
    parent_phone VARCHAR(50),
    active BOOLEAN DEFAULT true,
    ministries JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::text[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Eventos e Agenda Ministerial
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    location VARCHAR(255) NOT NULL,
    address_details JSONB,
    theme VARCHAR(255),
    planning TEXT,
    cover_image TEXT,
    category VARCHAR(100) DEFAULT 'Culto',
    capacity INT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'published', 'cancelled', 'completed')),
    responsible_id UUID REFERENCES public.users(id),
    responsible_name VARCHAR(255),
    ministry_id UUID,
    ministry_name VARCHAR(255),
    tags TEXT[] DEFAULT ARRAY[]::text[],
    is_global BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,
    proposed_date TIMESTAMPTZ,
    proposed_location VARCHAR(255),
    pastor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Confirmações de Presença (RSVP)
CREATE TABLE public.event_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED', 'WAITLIST')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 4. Ministérios Oficiais & Brasões em Ideogramas Japoneses (Kanji)
CREATE TABLE public.ministries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    kanji_symbol VARCHAR(10) NOT NULL,
    kanji_meaning VARCHAR(255) NOT NULL,
    primary_color VARCHAR(50) NOT NULL,
    svg_icon TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Esboços Teológicos & Análise de Pregações (IA Gemini)
CREATE TABLE public.sermon_outlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    preacher VARCHAR(255),
    date TIMESTAMPTZ NOT NULL,
    summary TEXT,
    theological_points JSONB DEFAULT '[]'::jsonb,
    bible_verses JSONB DEFAULT '[]'::jsonb,
    key_quotes JSONB DEFAULT '[]'::jsonb,
    small_group_questions JSONB DEFAULT '[]'::jsonb,
    full_transcript TEXT,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Configurações Globais & Terminologia Pastoral
CREATE TABLE public.church_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_name VARCHAR(255) DEFAULT 'Agenda Teens',
    ministry_term VARCHAR(100) DEFAULT 'Ministério',
    ministry_term_plural VARCHAR(100) DEFAULT 'Ministérios',
    leader_term VARCHAR(100) DEFAULT 'Líder',
    member_term VARCHAR(100) DEFAULT 'Adolescente (Teen)',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. PIPELINE DE INTELIGÊNCIA ARTIFICIAL MULTIMODAL (GOOGLE GEMINI)

O motor teológico processa arquivos audiovisuais e briefings textuais através do **Google Gemini (File API & Gemini 2.5 Flash)**:

```mermaid
sequenceDiagram
    autonumber
    actor Lider as Líder / Pregador
    participant Web as Next.js Frontend
    participant API as FastAPI Backend
    participant Gemini as Google Gemini Multimodal
    participant DB as Supabase PostgreSQL

    Lider->>Web: Grava áudio ao vivo ou envia MP3/MP4
    Web->>API: POST /api/sermons/upload (multipart/form-data)
    API->>Gemini: client.files.upload (File API)
    Gemini-->>API: Arquivo processado (URI de Mídia)
    API->>Gemini: models.generate_content (Prompt Estruturado Teológico)
    Gemini-->>API: JSON: Tema, Introdução, Pontos, Versículos, Frases & Perguntas
    API->>DB: INSERT INTO sermon_outlines
    API-->>Web: Esboço Homilético Formatado
    Web-->>Lider: Exibição visual com cópia para WhatsApp
```

### Inteligência Litúrgica do Copiloto de Eventos:
- **Resolução de Datas Relativas**: Se o líder informa "culto na próxima segunda", a IA cruza com a data do servidor em tempo real e sugere a data exata sem ambiguidades.
- **Memória de Localidade**: Reconhece o endereço cadastrado da igreja e sugere reutilização automática para evitar digitação repetitiva.
- **Geocodificação Assistida**: Consulta o ViaCEP para preenchimento de logradouro, bairro e cidade a partir de um CEP e gera o link direto do Google Maps.
- **Grifo de Inconsistências**: Alerta em amarelo com explicações concisas (ex: "Local vago", "Horário improvável") e permite aceitar uma sugestão específica ou todas com 1 clique.

---

## 6. SEGURANÇA, LGPD E DEVSECOPS

1. **Criptografia de Senhas**: Hash seguro com **SHA-256 + Salt estático de aplicação**.
2. **Proteção LGPD para Menores de Idade**:
   - Todo cadastro de adolescente (`role === 'TEEN'`) exige obrigatoriamente o nome e o telefone do responsável legal (`parent_name`, `parent_phone`).
   - Dados de contato dos pais são visíveis exclusivamente para os Líderes do respectivo ministério e Pastores, sendo omitidos para adolescentes comuns.
3. **Isolamento de Sessão**:
   - Tokens gravados no `localStorage` sob a chave `agenda_teens_auth_token`.
   - Headers tipados `Authorization: Bearer <token>` em todas as requisições protegidas.
4. **CORS & Headers HTTP**:
   - Configurado via middleware no FastAPI para autorizar chamadas do frontend em `http://localhost:3000` com suporte integral a métodos `GET`, `POST`, `PATCH`, `DELETE` e `OPTIONS`.

---

## 7. CATÁLOGO DE ENDPOINTS DA API (FASTAPI)

| Método | Rota | Descrição | Permissão Mínima |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login com e-mail e senha | Público |
| `GET` | `/api/auth/me` | Retorna o perfil do usuário logado | Autenticado |
| `GET` | `/api/users` | Lista membros ordenados em ordem alfabética | Líder / Pastor / Admin |
| `POST` | `/api/users` | Cadastra novo membro ou líder | Líder / Pastor / Admin |
| `PATCH` | `/api/users/{id}/role` | Elege líderes e designa ministérios | Pastor / Admin (Líder para Teens) |
| `GET` | `/api/events` | Lista eventos (com filtro por tags do membro) | Público / Autenticado |
| `POST` | `/api/events` | Cria novo evento na agenda | Líder / Pastor / Admin |
| `GET` | `/api/events/{id}` | Detalhes do evento | Público |
| `POST` | `/api/events/{id}/attendance` | Confirma presença (RSVP) no evento | Autenticado |
| `DELETE` | `/api/events/{id}/attendance` | Cancela confirmação de presença | Autenticado |
| `GET` | `/api/events/{id}/attendance` | Lista participantes confirmados | Autenticado |
| `POST` | `/api/events/ai-assist` | Copiloto IA de análise de briefing e inconsistências | Líder / Pastor / Admin |
| `GET` | `/api/ministries` | Lista ministérios oficiais com brasões Kanji | Público |
| `POST` | `/api/ministries` | Cria ministério oficial com SVG e Kanji | Pastor / Admin |
| `POST` | `/api/sermons/upload` | Processa áudio/vídeo e gera esboço teológico | Líder / Pastor / Admin |
| `GET` | `/api/church-settings` | Consulta terminologia e nome da igreja | Público |
| `PATCH` | `/api/church-settings` | Atualiza termos customizados pelo Pastor | Pastor / Admin |

---

## 8. INSTRUÇÕES DE EXECUÇÃO E OPERAÇÃO DO SISTEMA

### 8.1. Execução Rápida via Arquivos Executáveis (Windows)

A forma mais recomendada para inicializar todo o ecossistema com 1 clique duplo:

- **Iniciar Tudo**: Duplo clique em [`iniciar_sistema.bat`](file:///c:/Users/Usuario/OneDrive%20-%20Centro%20Universitário%20Ateneu/Área%20de%20Trabalho/API%20PREGACAO/iniciar_sistema.bat)
  - Mata processos antigos nas portas `8000` e `3000`.
  - Inicia o Backend FastAPI conectado ao Supabase PostgreSQL.
  - Inicia o Frontend Next.js na porta `3000`.
  - Abre automaticamente o navegador em `http://localhost:3000`.
- **Encerrar Tudo**: Duplo clique em [`parar_sistema.bat`](file:///c:/Users/Usuario/OneDrive%20-%20Centro%20Universitário%20Ateneu/Área%20de%20Trabalho/API%20PREGACAO/parar_sistema.bat)
  - Finaliza de forma limpa e segura todos os processos e conexões ativas.

---

### 8.2. Execução via Script PowerShell (`start_dev.ps1`)

Para desenvolvedores utilizando PowerShell:

```powershell
# Na raiz do projeto:
.\start_dev.ps1
```

---

### 8.3. Comandos Manuais de Inicialização (Passo a Passo por Terminal)

Caso deseje executar os serviços em terminais separados para inspecionar logs detalhados linha a linha:

#### **Terminal 1 — Backend FastAPI (Porta 8000)**
```powershell
# 1. Navegar até a pasta do backend
cd backend

# 2. Inicializar o servidor Uvicorn com o ambiente virtual
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 8000 --reload
```
> O backend estará disponível em `http://127.0.0.1:8000` e a documentação interativa Swagger em `http://127.0.0.1:8000/docs`.

#### **Terminal 2 — Frontend Next.js (Porta 3000)**
```powershell
# 1. Navegar até a pasta do frontend
cd frontend

# 2. Executar em modo produção (rápido e otimizado):
npm start

# OU executar em modo desenvolvimento (com hot-reload de código):
npm run dev
```
> A aplicação estará disponível em `http://localhost:3000` e a agenda de eventos em `http://localhost:3000/events`.

#### **Equivalente para Ambientes Linux / macOS 🐧**
```bash
# Executável unificado:
chmod +x iniciar_sistema.sh parar_sistema.sh
./iniciar_sistema.sh

# Ou manualmente:
# Terminal 1 - Backend:
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 8000 --reload

# Terminal 2 - Frontend:
cd frontend && npm install && npm run dev
```

---

### 8.4. Comandos Utilitários de Banco de Dados & Build

```powershell
# Inspecionar tabelas e colunas ativas no Supabase PostgreSQL:
.\backend\.venv\Scripts\python.exe backend/scripts/inspect_db.py

# Sincronizar senhas (senha123) de todos os 7 usuários do MVP:
.\backend\.venv\Scripts\python.exe backend/scripts/sync_user_passwords.py

# Gerar nova build de produção do frontend Next.js:
npm --prefix frontend run build

# Liberar manualmente as portas 8000 e 3000 caso fiquem presas no Windows:
Get-NetTCPConnection -LocalPort 8000, 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

### 8.5. Tabela Oficial de Usuários Iniciais do MVP (Persistidos no Supabase)

Todos os 7 usuários abaixo estão gravados na tabela `public.users` do Supabase PostgreSQL com senha criptografada via SHA-256 + Salt. A senha de acesso para todos os testes é: **`senha123`**.

| Papel | Nome Completo | E-mail de Acesso | Senha | Ministério & Tags | Responsável Legal (LGPD) | Finalidade de Teste / Escopo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **🔴 ADMIN** | Admin Master | `admin@agendateens.com` | `senha123` | Global (Todos) | N/A (Administrador) | Acesso irrestrito a todo o sistema, auditoria global em ordem alfabética e menu suspenso exclusivo de **Modo Ghost** para simular qualquer perfil em tempo real. |
| **🟣 PASTOR** | Pr. Paulo Roberto | `pastor@agendateens.com` | `senha123` | Colegiado Pastoral | N/A (Pastor Sênior) | Governança pastoral: responsável pelos líderes de ministérios, eleição de líderes, atribuição de até 3 ministérios oficiais com brasões Kanji e homologação de eventos bilaterais. |
| **🟡 LEADER** | Jorge Oliveira | `jorge@agendateens.com` | `senha123` | Ministério de Teatro & Artes (`#Teatro`) | N/A (Líder Eleito) | Liderança de grupo: responsável estritamente pelos Teens de seu ministério (#Teatro). Visualização restrita aos adolescentes do seu grupo, dados dos pais e proposição de eventos assistida por IA. |
| **🔵 TEEN** | Carlos Silva | `carlos@agendateens.com` | `senha123` | Ministério de Teatro & Artes (`#Teatro`) | Marcos Silva - (11) 97777-2000 | Membro comum de grupo: visualização da agenda com filtro automático da tag `#Teatro`, confirmação de presença (RSVP) e materiais do grupo. Sessão 100% isolada sem permissões de gestão. |
| **🟡 LEADER** | Pr. Marcos Silva | `lider@agendateens.com` | `senha123` | Liderança Geral Teens | N/A (Coordenação) | Teste de coordenação geral de liderança do ministério de adolescentes e homologação de rotinas semanais. |
| **🔵 TEEN** | Gabriel Santos | `adolescente@agendateens.com` | `senha123` | Membro Geral (Sem tags restritas) | Mariana Santos - (85) 98765-4321 | Teste de adolescente recém-chegado à igreja que ainda não possui tags ministeriais vinculadas (visualiza cultos e eventos gerais). |
| **🔵 TEEN** | Samuel Mendes Cardoso | `samuelmendescf@gmail.com` | `senha123` | Ministério Teens Geral | Ismael Melo Cardoso - (85) 99200-2575 | Teste de validação e confirmação de presença com dados completos de responsável legal e notificação por e-mail/WhatsApp. |

---

### 8.6. Guia de Configuração de Ambiente (.env) para Testes Independentes

Para membros da equipe que desejam rodar e homologar o sistema em suas próprias máquinas ou bancos de dados isolados:

1. **Protocolo de Não-Versão (.gitignore)**:
   - Os arquivos de produção `.env` (backend) e `.env.local` (frontend) são ignorados pelo Git para evitar vazamento de credenciais na nuvem.
   - Use sempre como base os gabaritos oficiais: `backend/.env.example` e `frontend/.env.local.example`.

2. **Backend (`backend/.env`)**:
   - `DATABASE_URL`: URI de conexão com PostgreSQL. Suporta Supabase IPv4 Pooler (porta 6543) ou conexão direta (porta 5432) com `sslmode=require`, bem como instâncias locais via Docker (`postgresql://postgres:postgres@localhost:5432/postgres`).
   - `GEMINI_API_KEY`: Chave da API Google Gemini gerada gratuitamente no [Google AI Studio](https://aistudio.google.com/app/apikey).
   - `GEMINI_MODEL`: Modelo padrão `gemini-2.5-flash` para baixa latência ou `gemini-1.5-pro` para análises homiléticas de longo contexto.
   - `CORS_ORIGINS`: Lista de origens web autorizadas separadas por vírgula (`http://localhost:3000,http://127.0.0.1:3000` ou `*`).

3. **Frontend (`frontend/.env.local`)**:
   - `NEXT_PUBLIC_API_URL`: URL base da API FastAPI (`http://localhost:8000`). Para testes de PWA em smartphones na mesma rede Wi-Fi, substitua `localhost` pelo IP local da máquina (`http://192.168.x.x:8000`).

4. **Script de Inicialização de Banco Independente em 1 Passo**:
   - Para criar e semear um banco de dados novo do zero sem necessidade de rodar migrations manuais:
   ```powershell
   .\backend\.venv\Scripts\python.exe backend/scripts/setup_complete_database.py
   ```
   - Este utilitário cria todas as tabelas com integridade relacional, índices, os 6 ministérios oficiais com brasões em Kanji e cadastra os 7 usuários do MVP com a senha padrão `senha123`.

---

Ass: Samuel Mendes Cardoso - Software Factory Labs

