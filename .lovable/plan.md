

# Continuum — Journal-First Life Tracker

## Visão Geral
App de journaling com conexões automáticas entre pessoas (@), projetos (#) e hábitos (*). Estética **Spatial UI** (glassmorphism, blur, sombras com profundidade, cards flutuantes) com modo claro e escuro. Backend em `https://continuum-backend.onrender.com`.

---

## 1. Design System — Spatial UI
- **Paleta:** Azul royal (#2563eb) como primária, verde (#10b981) sucesso, laranja (#f59e0b) warning
- **Spatial UI:** Cards com `backdrop-blur`, bordas semi-transparentes, sombras em camadas, gradientes sutis no fundo
- **Tipografia:** Inter para textos, JetBrains Mono no editor de journal
- **Dark/Light mode** com toggle no header e settings

## 2. Autenticação (Login/Registro)
- Tela centralizada com card glassmorphism
- Login com email + senha via `POST /auth/login`
- Registro via `POST /auth/register`
- JWT salvo em localStorage, interceptor automático nas requests
- Rotas protegidas (redireciona para login se não autenticado)
- Tratamento de erros 401/403

## 3. Layout & Navegação
- **Desktop:** Sidebar fixa (240px) com links: Dashboard, Journal, People, Projects, Habits, Search, Settings
- **Mobile (<768px):** Bottom navigation bar
- **Tablet:** Sidebar collapsível
- Sidebar com ícones Lucide e highlight da rota ativa

## 4. Dashboard (/)
- 3 stat cards animados (Pessoas, Projetos, Hábitos) com efeito count-up
- Seção "Top Pessoas", "Top Projetos", "Top Hábitos" com cards clicáveis
- Dados via `GET /api/connections/dashboard`
- Skeleton loading states

## 5. Journal (/journal)
- **Lista** de entradas com cards mostrando preview de 150 chars + data
- **Editor** markdown com preview em tempo real
- Syntax highlighting colorido para `@pessoa`, `#projeto`, `*hábito`
- No preview, menções viram links clicáveis que navegam para a timeline da entidade
- Auto-save de rascunho no localStorage
- APIs: `GET /api/journal`, `POST /api/journal`
- Dica visual no rodapé do editor

## 6. Timelines de Entidade
- **Pessoa** (`/person/:id`): Header com nome + total de menções, heatmap 365 dias, timeline de entradas
- **Projeto** (`/project/:id`): Mesmo layout, ícone diferente
- **Hábito** (`/habit/:id`): Mesmo layout + análise de impacto
- **Heatmap interativo:** Grid 52×7, tooltip no hover, click filtra timeline por dia, cores em escala de verde
- APIs: `GET /api/connections/person/:id`, `project/:id`, `habit/:id`

## 7. Busca Global (/search)
- Input de busca com filtros por tipo (Todos, Pessoas, Projetos, Hábitos)
- Resultados em cards com ícone, nome e total de menções
- API: `GET /api/connections/search?query=...&type=...`

## 8. Settings (/settings)
- Perfil (nome, email)
- Plano atual (FREE/PRO) com botão de upgrade
- Toggle de tema claro/escuro
- Export de dados (JSON)
- Botão de logout

## 9. Notificações de Limite
- Alerta quando usuário FREE se aproxima do limite de 30 entries
- Redirecionamento para upgrade ao atingir limite (erro 403)

## 10. UX & Polimento
- Loading skeletons e spinners em todas as telas
- Tratamento de erros com toasts
- Animações suaves (fade-in de cards, count-up nos stats)
- Responsividade completa (desktop, tablet, mobile)

