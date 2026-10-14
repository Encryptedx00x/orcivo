# B4-29 — Inventário de “técnico/instalador” e variantes

**Data:** 2026-10-14  
**Escopo:** `apps/site`, `apps/web`, `apps/mobile`, `apps/backend/src`, `packages/shared-types`, `docs`  
**Objetivo:** separar copy pública, domínio, autorização, documentos e referências históricas antes de qualquer troca.

## Varredura reproduzível

Padrão case-insensitive: `(t[eé]cnic|instalador|technician)`.

```powershell
$roots = @('apps/site','apps/web','apps/mobile','apps/backend/src','packages/shared-types','docs')
rg -n -i --glob '!**/.next/**' --glob '!**/node_modules/**' --glob '!**/dist/**' `
  --glob '!**/coverage/**' --glob '!**/*.png' --glob '!**/*.jpg' --glob '!**/*.pdf' `
  --glob '!docs/qa/B4-29-NEUTRAL-TERMS-INVENTORY.md' `
  --glob '!docs/decisions/ADR-021-neutral-positioning-and-terminology.md' `
  '(t[eé]cnic|instalador|technician)' @roots
```

Exclusões mecânicas: dependências/builds (`node_modules`, `.next`, `dist`, `coverage`) e binários
(`png`, `jpg`, `pdf`). A varredura ampla encontrou **488 linhas**. A maior parte de `docs/design-handoff`,
`docs/ui_kits` e do planejamento histórico é referência congelada, não copy executada.
O próprio relatório e sua ADR são excluídos para não inflarem o baseline que documentam.

Para o código de produto, uma segunda passada excluiu `*.test.*`, `*.spec.*` e `_checks`:

| Área         | Linhas encontradas | Natureza predominante                                      |
| ------------ | -----------------: | ---------------------------------------------------------- |
| Site         |                 18 | posicionamento, SEO, exemplo, Termos e Privacidade         |
| Web          |                 51 | auth/metadata, equipe/papel, assinatura, aprovação e laudo |
| App          |                 12 | equipe/papel, assinatura e laudo                           |
| Backend      |                 32 | papel, assinatura, auditoria e PDF                         |
| Shared-types |                  3 | papel de convite, laudo e comentário interno               |

Os números são linhas correspondentes, não ocorrências semânticas. Identificadores repetidos de assinatura representam
um único conceito.

## Classificação e ação futura

| Classe                      | Exemplos confirmados                                                                | Decisão proposta                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Posicionamento/SEO          | título, manifest, hero e auth: “gestão para técnicos instaladores”                  | substituir por linguagem de empresas/profissionais de serviços; maior impacto fica na landing          |
| Copy da aplicação           | fallback “técnico”, “Convide técnicos”, retorno ao cliente “técnico responsável”    | usar pessoa, membro, equipe ou responsável pelo serviço conforme o contexto                            |
| Equipe/autorização          | enum persistido `TECNICO`, seletor e “Função: Técnico”                              | manter código interno inicialmente; apresentar “Membro” na UI; não confundir profissão com permissão   |
| Atribuição de OS            | referências antigas a “atribuir técnico”                                            | já decidido pela ADR-019: “Responsável pelo serviço” / “Responsável”                                   |
| Assinatura                  | `technician_signature_*`, storage `signatures/technicians`, “Assinatura do técnico” | UI usa “Assinatura”/“Assinatura salva”; identificadores e keys podem ficar por compatibilidade         |
| Documento/PDF               | rodapé “gestão para técnicos instaladores”; retorno de aprovação                    | remover posicionamento nichado; congelar termo configurável quando ele fizer parte do documento        |
| Termo profissional legítimo | “Laudo técnico”, “visita técnica”, “especificações técnicas”, “logs técnicos”       | manter: “técnico” é adjetivo do objeto/processo, não profissão presumida                               |
| Legal                       | Termos/Privacidade usam “técnico ou empresa” e “cliente final de um técnico”        | proposta neutra exige revisão específica e autorização LGPD; não alterar na onda comum                 |
| E-mail                      | convite usa “equipe” e não contém profissão fixa                                    | manter; corrigir apenas auditoria que grava o código bruto `TECNICO`                                   |
| Testes/fixtures             | e-mails/nome de exemplo e asserts do enum                                           | atualizar junto do contrato correspondente; fixtures podem manter cenário histórico quando intencional |
| Docs históricos/handoff     | planejamento inicial, entrevistas e design handoff                                  | não reescrever história nem o handoff aprovado; criar nota superseded para vocabulário ativo           |

## Pontos executáveis prioritários

### Site e aquisição

- `apps/site/app/page.tsx`, `manifest.ts`: título, selo, proposta e persona ainda são nichados.
- `apps/web/app/(auth)/layout.tsx` e metadata raiz: repetem o posicionamento antigo.
- O depoimento “Instalador de CFTV” pode continuar como caso real/exemplo, desde que não seja a única persona.
- Termos e Privacidade precisam de mudança neutra separada e revisão LGPD.

### Produto e equipe

- Web/app mostram `TECNICO` como “Técnico” e convidam “técnicos e admins”. A função real é membro operacional sem
  administração; profissão e permissão são conceitos diferentes.
- O fallback do dashboard não deve chamar uma pessoa desconhecida de “técnico”.
- A aprovação pública deve dizer “responsável pelo serviço” ou usar o termo congelado da empresa.

### Documentos e assinatura

- O rodapé do PDF de orçamento contém o posicionamento antigo e alcança clientes finais.
- “Laudo técnico” é nome válido de documento e fica preservado.
- `technician_signature_key`, funções e storage keys são compatibilidade interna. Renomeá-los sem benefício ao usuário
  ampliaria migrations e risco; a UI pode ser neutra independentemente deles.
- “Assinatura” não deve ser inferida como a pessoa atribuída à OS. Em orçamento/recibo, é assinatura do emissor do
  documento; o rótulo configurável só entra quando escolhido explicitamente.

## Exclusões justificadas da futura checagem automática

Uma checagem de regressão deve falhar para nova copy executada que use “técnico instalador”, “técnico responsável” ou
“assinatura do técnico”, mas permitir:

- códigos persistidos `TECNICO` e tipos de compatibilidade registrados nesta ADR;
- identificadores/storage paths `technician_signature_*` até migração específica;
- expressões de domínio aprovadas: “laudo técnico”, “visita técnica”, “especificação técnica”, “erro/log técnico”;
- testes que validam compatibilidade com códigos legados;
- documentos históricos, pesquisas de validação e pacotes de design congelados.

As exclusões devem ser por categoria/padrão documentado, não por uma lista silenciosa de arquivos que esconderia nova
copy. O baseline deste inventário deve diminuir na B4-37; novas ocorrências fora das categorias aprovadas falham CI.
