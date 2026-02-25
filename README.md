# Household Account Book

AI automatic-classification household account book app.

## Project Identity

This project identity includes two responsibilities:

1. Implement features based on `docs/implementation-plan.md`.
2. Provide practical, test-ready environment guidance so local verification is possible.

For operational details, see `docs/project-identity.md`.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Required Environment Variables

See `.env.example` and `docs/project-identity.md` for issuance and setup details.

## Database/ORM Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:create
npm run db:seed
npm run db:reset
npm run db:init
```

## Quality Checks

```bash
npm run lint
npm test
npm run build
```
