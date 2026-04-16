# LowMeet

Aplicação web para descobrir, organizar e acompanhar encontros automotivos. O front-end é uma SPA em **React** com **Vite**, dados e autenticação em **Firebase** (Firestore, Auth, Storage), interface com **Tailwind CSS** e componentes reutilizáveis.

## Funcionalidades

- **Catálogo de eventos** com filtros, calendário (**FullCalendar**) e detalhes por evento.
- **Conta e papéis**: rotas protegidas para usuários logados; **admin** e **organizador** para painel administrativo e criação de eventos.
- **Favoritos** e **perfil** para quem está autenticado.
- **Patrocinadores** e banners na home.
- **Login** com fluxo de verificação em duas etapas (2FA por e-mail), usando webhook local com **Nodemailer** ou **EmailJS** (conforme variáveis de ambiente).
- **Localização no Brasil** (serviços e hooks para estados/cidades) e suporte a imagens (incl. conversão HEIC quando aplicável).

## Stack principal

| Área        | Tecnologia |
|------------|------------|
| UI         | React 19, React Router 7, Tailwind CSS |
| Build      | Vite 6, ESLint 9 |
| Backend BaaS | Firebase (Auth, Firestore, Storage) |
| Gráficos   | Recharts |
| E-mail 2FA | Express + Nodemailer (dev) ou EmailJS |

## Pré-requisitos

- [Node.js](https://nodejs.org/) (recomendado: LTS atual)
- Conta e projeto no [Firebase Console](https://console.firebase.google.com/) (Auth, Firestore e Storage habilitados conforme o uso do app)
- Para 2FA por SMTP em desenvolvimento: credenciais SMTP válidas (veja abaixo)

## Como rodar o projeto

```bash
npm install
npm run dev
```

O servidor de desenvolvimento sobe em `http://localhost:5173` (porta fixa definida no script).

### Build e preview de produção

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

## Autenticação em duas etapas (2FA)

O envio do código pode usar:

1. **Webhook local** (`webhook/send-2fa-server.js`) — útil no desenvolvimento, envia e-mail via SMTP.
2. **EmailJS** — alternativa configurada por variáveis `VITE_EMAILJS_*`.

Para rodar o app **e** o webhook ao mesmo tempo:

```bash
npm run dev:full
```

O webhook escuta na porta `WEBHOOK_PORT` (padrão **8787**). O front deve apontar para ele com `VITE_2FA_WEBHOOK_URL` (por exemplo `http://localhost:8787/send-2fa`).

## Variáveis de ambiente

Copie o exemplo e ajuste os valores:

```bash
cp .env.example .env.local
```

| Variável | Descrição |
|----------|-----------|
| `VITE_2FA_WEBHOOK_URL` | URL do endpoint POST que envia o e-mail com o código (ex.: webhook local). |
| `VITE_EMAILJS_SERVICE_ID` | IDs do EmailJS, se usar esse canal em vez do webhook. |
| `VITE_EMAILJS_TEMPLATE_ID` | |
| `VITE_EMAILJS_PUBLIC_KEY` | |
| `WEBHOOK_PORT` | Porta do servidor Express do 2FA (padrão `8787`). |
| `APP_ORIGIN` | Origem permitida no CORS do webhook (padrão `http://localhost:5173`). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Credenciais SMTP para o webhook. |
| `EMAIL_FROM` | Remetente exibido nos e-mails (opcional; pode cair no `SMTP_USER`). |

O arquivo `firebase.js` concentra a configuração pública do Firebase do projeto. Para um fork seu, substitua pelos valores do seu app no console Firebase.

## Estrutura do repositório (visão geral)

- `src/` — páginas, layouts, contextos (`AuthContext`, dados da app), serviços, hooks e componentes UI.
- `src/pages/` — rotas principais: home, eventos, detalhe, criar evento, login, admin, favoritos, perfil, patrocinadores.
- `webhook/` — servidor Express para envio de 2FA em desenvolvimento.
- `public/` — assets estáticos (banners, etc.).

## Scripts npm

| Script | Função |
|--------|--------|
| `dev` | Vite em `localhost:5173`. |
| `dev:webhook` | Apenas o servidor de 2FA. |
| `dev:full` | Webhook + Vite em paralelo (`concurrently`). |
| `build` | Build de produção. |
| `preview` | Servir o build localmente. |
| `lint` | ESLint no projeto. |

---

Desenvolvido com o ecossistema [Vite](https://vite.dev/) e [React](https://react.dev/).
