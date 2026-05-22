# ADR-007 — Object storage com MinIO self-hosted

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

O Orcivo precisa armazenar PDFs de OS, fotos capturadas em campo, logos de empresa e assinaturas digitais. AWS S3 seria a escolha óbvia para compatibilidade, mas o custo de storage + transferência seria significativo para o estágio inicial do produto.

## Decisão

MinIO self-hosted no mesmo VPS, com API compatível com S3. O código usa AWS SDK apontando para o endpoint MinIO — migração para S3 real não exige mudança de código, apenas variáveis de ambiente.

## Consequências

**Positivas:**
- Custo próximo de zero para storage inicial (limitado pelo disco do VPS)
- API 100% compatível com S3 — migração transparente para S3/R2/Backblaze no futuro
- MinIO roda em Docker, sem operação adicional significativa
- Controle total sobre onde os dados ficam armazenados

**Negativas / trade-offs:**
- Responsabilidade de backup dos dados de storage (separado do backup do banco)
- Espaço em disco do VPS é limitado — arquivos de mídia crescem com o número de OS
- Sem CDN nativo — para performance global, precisaria de proxy ou migração para serviço managed
