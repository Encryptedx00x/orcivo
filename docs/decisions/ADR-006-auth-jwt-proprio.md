# ADR-006 — Auth próprio com JWT + argon2 + Redis

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

Autenticação é crítica para o produto. Soluções SaaS como Auth0 e Clerk cobram por MAU e adicionam dependência externa sobre dados sensíveis de usuário. O Orcivo precisa de controle total sobre o fluxo de auth e deve suportar múltiplos papéis dentro de uma empresa (owner, técnico, admin).

## Decisão

Implementar auth próprio com NestJS Passport + JWT. Senhas com hash argon2. 2FA com otplib (TOTP). JWT apenas identifica o usuário — autorização revalida permissões a cada request com cache Redis 60s (não confiar cegamente no payload JWT).

## Consequências

**Positivas:**
- Zero custo de auth para qualquer número de usuários
- Controle total sobre fluxo de reset de senha, 2FA, revogação de sessão
- JWT stateless para o mobile + cache Redis para invalidação eficiente
- argon2 é o algoritmo de hashing de senhas recomendado atualmente (vencedor PHC)

**Negativas / trade-offs:**
- Responsabilidade de implementar corretamente: reset de senha, rate limiting, brute-force protection
- 2FA (otplib) exige QR code e app autenticador — adiciona complexidade de UX
- Cache Redis é dependência extra de infra
- Auditoria de segurança fica sob responsabilidade interna — sem terceiro certificado
