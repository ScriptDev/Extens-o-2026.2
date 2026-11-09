# 🎙️ Agenda Teens & IA Multimodal para Pregações
### Plataforma Digital Eclesiástica, Gestão Ministerial & Inteligência Teológica

> **Status:** 100% Funcional & Conectado ao Supabase PostgreSQL & Google Gemini (Zero Mock)  
> **Arquitetura:** Clean Architecture (Robert C. Martin) &bull; DDD &bull; DevSecOps  
> **Repositório:** [https://github.com/ScriptDev/Extens-o-2026.2.git](https://github.com/ScriptDev/Extens-o-2026.2.git)

---

## 📑 Sumário Executivo

1. [Visão Geral do Produto](#-visão-geral-do-produto)
2. [Como Iniciar o Sistema (1 Clique no Windows)](#-como-iniciar-o-sistema-1-clique-no-windows)
3. [Tabela Oficial de Usuários & Credenciais do MVP](#-tabela-oficial-de-usuários--credenciais-do-mvp)
4. [Roteiro Passo a Passo de Apresentação (Demo Script para a Equipe)](#-roteiro-passo-a-passo-de-apresentação-demo-script-para-a-equipe)
   - [Etapa 1: Acesso, Isolamento de Contas & Login Real](#etapa-1-acesso-isolamento-de-contas--login-real)
   - [Etapa 2: O Super Admin e a Simulação via Modo Ghost](#etapa-2-o-super-admin-e-a-simulação-via-modo-ghost)
   - [Etapa 3: Governança Pastoral & Ministérios com Brasões Kanji](#etapa-3-governança-pastoral--ministérios-com-brasões-kanji)
   - [Etapa 4: O Líder Ministerial & Criação de Eventos Assistida por IA](#etapa-4-o-líder-ministerial--criação-de-eventos-assistida-por-ia)
   - [Etapa 5: A Experiência do Adolescente (Devocional, Recados & RSVP)](#etapa-5-a-experiência-do-adolescente-devocional-recados--rsvp)
   - [Etapa 6: Inteligência Teológica & IA Multimodal com Google Gemini](#etapa-6-inteligência-teológica--ia-multimodal-com-google-gemini)
5. [Tecnologias Utilizadas & Clean Architecture](#-tecnologias-utilizadas--clean-architecture)
6. [Comandos de Manutenção & Banco de Dados](#-comandos-de-manutenção--banco-de-dados)

---

## 🌟 Visão Geral do Produto

O **Agenda Teens & Pregações AI** é um ecossistema full-stack desenvolvido para transformar a gestão de ministérios de adolescentes e apoiar a igreja na preservação e propagação de mensagens bíblicas.

- **Para os Pastores**: Governança eclesiástica, homologação de eventos bilaterais, eleição de líderes com até 3 ministérios oficiais, brasões em Kanji estilizados e personalização terminológica nominal ("Ministério", "Grupo de Conexão", "Rede", etc.).
- **Para os Líderes de Grupos**: Gestão exclusiva dos adolescentes do seu próprio ministério (ex: Teatro, Louvor, Dança), proposição de eventos com assistência de IA, memória de localidade, integração ViaCEP e disparo de comunicados oficiais.
- **Para os Adolescentes (Teens)**: Devocional bíblico diário transmitido pelo Pastor, recados oficiais do seu respectivo líder, central de organização com contagem regressiva, checklist interativo e confirmação de presença (RSVP) com controle de vagas.
- **Para a Igreja Geral**: Motor de IA Multimodal via **Google Gemini (File API + Gemini 2.5 Flash)** capaz de processar arquivos pesados de áudio e vídeo de cultos e transformá-los em esboços homiléticos estruturados (Tema, Introdução, Pontos Bíblicos, Versículos, Frases de Efeito e Perguntas para Células).

---

## ⚡ Como Iniciar o Sistema (1 Clique no Windows)

Para que qualquer membro da equipe ou avaliador execute o sistema completo com **zero complicações**:

### Opção 1: Executável Automático (Mais Fácil) 🌟
1. Vá até a raiz do projeto e dê um **duplo clique** em **[`iniciar_sistema.bat`](iniciar_sistema.bat)**.
   - O script libera automaticamente as portas `8000` e `3000` de processos antigos.
   - Sobe o **Backend FastAPI** conectado ao banco de dados Supabase PostgreSQL.
   - Sobe o **Frontend Next.js** de produção.
   - Abre o navegador automaticamente em **`http://localhost:3000`**.
2. Para encerrar o sistema ao final da apresentação, basta dar um duplo clique em **[`parar_sistema.bat`](parar_sistema.bat)**.

### Opção 2: Via Script PowerShell
Abra o PowerShell na pasta do projeto e execute:
```powershell
.\start_dev.ps1
```

### Opção 3: Execução Manual via Terminal
Se preferir rodar cada serviço em um terminal separado:
```powershell
# Terminal 1 - Backend FastAPI (Porta 8000)
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 8000 --reload

# Terminal 2 - Frontend Next.js (Porta 3000)
cd frontend
npm start
```

---

## 👥 Tabela Oficial de Usuários & Credenciais do MVP

Todas as 7 contas abaixo estão cadastradas e ativas na tabela `public.users` do Supabase PostgreSQL:

> 🔑 **Senha padrão de teste para todas as contas:** `senha123`

| Papel (Role) | Nome Completo | E-mail de Acesso | Senha | Atribuições & Tags | Finalidade no Teste / Escopo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **🔴 ADMIN** | **Admin Master** | `admin@agendateens.com` | `senha123` | Global (Controle Total) | Acesso irrestrito a todo o sistema, auditoria global em ordem alfabética (A-Z) e **Modo Ghost** exclusivo para simulação de qualquer membro. |
| **🟣 PASTOR** | **Pr. Paulo Roberto** | `pastor@agendateens.com` | `senha123` | Colegiado Pastoral | Governança pastoral: responsável pelos líderes, eleição de líderes, ministérios oficiais com Kanji e homologação de eventos. |
| **🟡 LEADER** | **Jorge Oliveira** | `jorge@agendateens.com` | `senha123` | Ministério de Teatro & Artes (`#Teatro`) | Líder de Grupo: responsável estritamente pelos Teens de seu ministério (#Teatro). Proposição de eventos e envio de recados oficiais. |
| **🔵 TEEN** | **Carlos Silva** | `carlos@agendateens.com` | `senha123` | Ministério de Teatro & Artes (`#Teatro`) | Adolescente com ministério: recebe Devocional Pastoral, Recados do Líder Jorge, checklist de ensaio e confirma presença (RSVP). |
| **🟡 LEADER** | **Pr. Marcos Silva** | `lider@agendateens.com` | `senha123` | Coordenação Geral Teens | Liderança geral de equipes e acompanhamento de rotinas. |
| **🔵 TEEN** | **Gabriel Santos** | `adolescente@agendateens.com` | `senha123` | Membro Geral (Sem tags) | Teste de adolescente recém-chegado à igreja que ainda não possui ministério (recebe cuidado pastoral direto do Pastor). |
| **🔵 TEEN** | **Samuel Mendes Cardoso** | `samuelmendescf@gmail.com` | `senha123` | Membro Teens Geral | Teste com dados completos de responsável legal (LGPD) e validação de presença. |

---

## 🎯 Roteiro Passo a Passo de Apresentação (Demo Script para a Equipe)

Siga este roteiro sequencial durante apresentações para demonstrar com clareza a maturidade de engenharia e a riqueza do sistema:

---

### Etapa 1: Acesso, Isolamento de Contas & Login Real
1. Acesse **`http://localhost:3000/events`**.
2. **Mostre o Isolamento**: Explique que a aplicação possui autenticação eclesiástica real (consumindo `POST /api/auth/login` e `GET /api/auth/me` no Supabase com SHA-256 e Salt).
3. Demonstre o botão **"Entrar na Conta"** e os botões de **"Acesso Rápido de Teste (1 Clique)"** que agilizam o login do avaliador.

---

### Etapa 2: O Super Admin e a Simulação via Modo Ghost
1. Entre como **Super Admin** (`admin@agendateens.com` / `senha123`).
2. Destaque o menu exclusivo no topo: **"👻 Modo Ghost (Simular Usuário)"**.
3. Explique a inovação: o Administrador consegue simular com 1 clique a experiência real de cada tipo de usuário:
   - Simule o **Pastor Paulo Roberto**: a interface muda de contexto imediatamente para governança e aprovações.
   - Simule o **Líder Jorge**: o sistema restringe a visão aos adolescentes e eventos de Teatro.
   - Simule o **Adolescente Carlos**: a interface vira um portal de discipulado teen.
4. Mostre a barra roxa superior de alerta de Modo Ghost ativo e o botão **"Encerrar Modo Ghost (Voltar ao Admin)"**.

---

### Etapa 3: Governança Pastoral & Ministérios com Brasões Kanji
1. Entre como **Pastor Sênior** (`pastor@agendateens.com` / `senha123`).
2. Clique no botão **"Ministérios"** na Navbar:
   - Mostre o catálogo oficial de ministérios da igreja com **ideogramas japoneses (Kanji)**, significados teológicos, cores oficiais e **brasões gerados em código vetorial SVG puro** (sem imagens pesadas ou quebras de link).
   - Mostre o botão de sugestão de novos ministérios com IA Gemini.
3. Clique no botão **"Membros & Líderes"**:
   - Mostre que o Pastor vê primordialmente a lista de **Líderes de Ministérios** em ordem alfabética.
   - Clique em **"Eleger / Ministérios"** em um líder para demonstrar a regra de negócio de vincular até 3 ministérios e definir tags.
4. Clique no botão de engrenagem **"Terminologia"**:
   - Mostre que o Pastor pode renomear os termos da igreja (ex: mudar "Ministério" para "Grupo de Conexão" ou "Rede") e o sistema atualiza em tempo real sem recarregar código.

---

### Etapa 4: O Líder Ministerial & Criação de Eventos Assistida por IA
1. Entre como **Líder Jorge** (`jorge@agendateens.com` / `senha123`).
2. Abra a gestão de membros: mostre que Jorge **vê apenas os adolescentes do Ministério de Teatro (#Teatro)**, preservando a hierarquia e os dados dos pais sob LGPD.
3. Clique em **"📢 Recado aos Teens"**:
   - Jorge digita um aviso de ensaio de teatro para a sexta-feira.
   - O comunicado é gravado no banco e disparado exclusivamente aos adolescentes do ministério dele.
4. Clique em **"Agendar Novo Culto"**:
   - Abra o **Copiloto IA de Eventos**.
   - Digite um briefing informal: *"Vai ter culto domingo culto de ceia as 19h as 20 horas no templo principal"*.
   - Clique em **"Analisar e Estruturar Culto com IA"**.
   - Mostre o Gemini calculando a data real do servidor, identificando o local cadastrado da igreja e grifando inconsistências em amarelo com botão de aplicar sugestões em 1 clique.
   - Salve o evento: ele fica gravado no banco como proposta para homologação do pastor.

---

### Etapa 5: A Experiência do Adolescente (Devocional, Recados & RSVP)
1. Entre como **Membro Carlos** (`carlos@agendateens.com` / `senha123`).
2. Mostre o **Painel do Teen**:
   - 📢 **Recado Oficial do Líder Jorge**: Destaque o aviso de ensaio de teatro no topo com o botão interativo **"👍 Ciente / Recebido"**.
   - 📖 **Devocional & Palavra Pastoral Diária**: Mostre que **todo adolescente recebe a palavra e o desafio pastoral do Pr. Paulo Roberto**, com botão para gerar nova mensagem ou copiar para compartilhar.
   - ⏰ **Central de Organização**: Próximo culto com contagem regressiva, status de presença e **Checklist do Adolescente** (Bíblia, figurino, transporte dos pais) com barra de progresso interativa.
   - 🎟️ **Confirmação de Presença (RSVP)**: Clique em "Confirmar Presença" e mostre a atualização em tempo real das vagas e da lista de participantes.

---

### Etapa 6: Inteligência Teológica & IA Multimodal com Google Gemini
1. Acesse a aba **"IA do Culto"** (`/`) no cabeçalho.
2. Mostre as opções de envio: upload de áudio/vídeo (MP3, WAV, MP4, WEBM) ou gravação direta pelo microfone do navegador.
3. Demonstre a saída homilética estruturada pelo Gemini:
   - Título Bíblico & Resumo Executivo
   - Pontos Teológicos Principais
   - Versículos Citados com Referência
   - Frases Marcantes para Mídias Sociais
   - Perguntas de Aplicação para Pequenos Grupos / Células
   - Gerador de Convite Litúrgico para WhatsApp com 1 clique.

---

## 🛠️ Tecnologias Utilizadas & Clean Architecture

O projeto implementa rigorosamente a **Clean Architecture** de Uncle Bob:

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Service Worker PWA.
- **Backend**: Python 3.12, FastAPI, Pydantic v2, Uvicorn, Asyncpg (Pool Assíncrono de Alta Performance).
- **Banco de Dados**: PostgreSQL 15 gerenciado no Supabase com tipos `JSONB`, `TEXT[]`, triggers e constraints.
- **Inteligência Artificial**: Google Gemini API via SDK oficial (`google-genai`), utilizando a **File API** para mídias audiovisuais e o modelo **Gemini 2.5 Flash** para estruturação teológica e copiloto litúrgico.
- **Segurança & DevSecOps**: Criptografia de senhas SHA-256 + Salt, conformidade LGPD para menores de idade e validação estrita de RBAC em todas as rotas.

---

## 💻 Comandos de Manutenção & Banco de Dados

Caso a equipe precise rodar rotinas de verificação ou manutenção:

```powershell
# 1. Inspecionar tabelas e colunas ativas no Supabase PostgreSQL:
.\backend\.venv\Scripts\python.exe backend/scripts/inspect_db.py

# 2. Sincronizar as senhas (senha123) dos 7 usuários do MVP:
.\backend\.venv\Scripts\python.exe backend/scripts/sync_user_passwords.py

# 3. Compilar nova build de produção do frontend Next.js:
npm --prefix frontend run build

# 4. Liberar manualmente as portas 8000 e 3000 no Windows:
Get-NetTCPConnection -LocalPort 8000, 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## 📄 Documentação Detalhada
Para consultar as especificações de diagramas de sequência, schemas SQL e mapeamento de impacto:
- 📖 [DOCUMENTACAO_SISTEMA.md](DOCUMENTACAO_SISTEMA.md)

---

Desenvolvido por **Software Factory Labs**  
Ass: Samuel Mendes Cardoso - Software Factory Labs
