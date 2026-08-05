# Gerivo v1.7.9

Plataforma white-label de gestão operacional, comercial e inteligência para empresas.

## Requisitos

- Node.js compatível com Next.js 16
- Projeto Supabase configurado
- Variáveis em `.env.local` no ambiente local ou na Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Opcional
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

## Instalação

```bash
npm install
npm run build
npm run dev
```

## Banco

- Quem já instalou a v1.7.8 não precisa executar novo SQL.
- Quem está atualizando diretamente da v1.7.6 deve executar `SQL_ATUALIZAR_v1.7.6_PARA_v1.7.9.sql` uma única vez.

Leia `PASSO_A_PASSO_ATUALIZAR_GERIVO_v1.7.9.txt` antes de publicar.
