# Gerivo v1.7.14.2

Base limpa do projeto Gerivo para desenvolvimento e deploy.

## Requisitos

- Node.js compatível com Next.js 16
- npm
- Projeto Supabase configurado

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha somente as credenciais do ambiente local/produção correspondente.
3. Execute:

```bash
npm install
npm run dev
```

## Validação antes de publicar

```bash
npm run lint
npm run build
```

## Banco de dados

As migrations versionadas estão em:

```text
supabase/migrations/
```

Aplique somente as migrations necessárias para o ambiente alvo e preserve backup antes de alterações estruturais.

## O que não faz parte desta base limpa

Não versionar nem copiar para a pasta do projeto:

- `node_modules/`
- `.next/`
- `.env.local`
- `.env`
- `tsconfig.tsbuildinfo`
- logs e caches
- histórico `.git/` em cópias de distribuição

As dependências são restauradas por `npm install` usando `package.json` e `package-lock.json`.
