# Estima

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

Estima é um planning poker gratuito para equipes ágeis, desenvolvido com [Next.js](https://nextjs.org/) e [Tailwind CSS](https://tailwindcss.com/).  
O projeto inclui criação de salas, compartilhamento via link, votação em tempo real e gerenciamento de jogadores.

---

## 🚀 Stack utilizada

- **Front-end:** React, NextJS, TailwindCSS
- **Database:** Firebase

---

## 📸 Screenshots

![Landing](https://github.com/user-attachments/assets/abb79996-1c91-4295-b6a4-582783ab43b7)  
![Login](https://github.com/user-attachments/assets/bdb0f7b8-7dfb-4d87-abde-e73c95f48800)  
![Register](https://github.com/user-attachments/assets/9cc0b3b2-8b6a-48eb-ab79-527c9098aba0)

---

## 🛠 Rodando localmente

Clone o projeto:

```bash
git clone https://github.com/seu-usuario/estima.git
```

Entre no diretório do projeto:

```bash
cd estima
```

Instale as dependências:

```bash
npm install
```

## 🔑 Variáveis de ambiente

Crie um arquivo .env.local na raiz do projeto com as seguintes variáveis:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Você pode obter esses valores no console do Firebase.

## ▶️ Inicie o servidor

```bash
npm run dev
```

## 📦 Commits

Este projeto segue a padronização de commits com Commitizen.
Para criar um commit, use:

```bash
npx cz
```

Isso abrirá um assistente interativo para escolher o tipo de alteração (feat, fix, chore, etc.) e garantir que a mensagem siga o padrão definido.

## ☁️ Deploy

O projeto está hospedado na Vercel.

⚠️ Atenção: qualquer commit enviado diretamente para a branch main será automaticamente publicado em produção.
Ainda não há proteção via Pull Request ou revisão obrigatória. Portanto, tenha cuidado ao enviar alterações diretamente para a main.
