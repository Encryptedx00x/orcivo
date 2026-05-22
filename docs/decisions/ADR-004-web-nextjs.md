# ADR-004 — Web app com Next.js App Router + Tailwind + shadcn/ui

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

A superfície web é voltada para gestão no PC: dashboard de OS, relatórios, configuração de empresa e gerenciamento de equipe. Precisa de SSR/SSG para SEO do site de marketing e de rendering eficiente para o painel de gestão.

## Decisão

Usar Next.js com App Router, TypeScript, Tailwind CSS para estilização e shadcn/ui como biblioteca de componentes base. Design system Orcivo implementado sobre esses tokens.

## Consequências

**Positivas:**
- App Router com React Server Components reduz bundle do client e melhora performance inicial
- shadcn/ui fornece componentes acessíveis sem dependência de biblioteca externa pesada
- Tailwind permite implementar o design system com CSS variables e classes utilitárias
- Next.js unifica site de marketing e app de gestão em uma plataforma

**Negativas / trade-offs:**
- React Server Components têm curva de aprendizado — boundary entre server/client deve ser explícita
- shadcn/ui exige copy dos componentes no repo — não é um pacote npm externo
- App Router ainda tem algumas limitações em relação ao Pages Router (ex: middleware edge)
