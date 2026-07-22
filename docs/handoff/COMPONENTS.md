# Orcivo — Component specs

> Exact measurements + states for every base component. Values reference
> `tokens.json`. The canonical implementations live in `ui_kits/web/*.jsx`,
> `ui_kits/mobile/*.jsx` and `ui_kits/web/styles.css`. **Lift from those files** —
> this doc is the index + the spec for states/sizes that a screenshot can't show.

---

## Buttons

| Variant | Bg | Text | Border | Hover | Notes |
|---|---|---|---|---|---|
| Primary | `#6D28D9` | `#FFF` | none | bg `#5B21B6` | main CTA |
| Secondary | `#F1F5F9` | `#0A0A0F` | none | bg `#E2E8F0` | |
| Outline | `#FFF` | `#0A0A0F` | 1px `#E2E8F0` | bg `#F8FAFC` | |
| Ghost | transparent | `#334155` | none | bg `#F1F5F9` | |
| Danger | `#DC2626` | `#FFF` | none | darken 6% | destructive |
| Success | `#16A34A` | `#FFF` | none | | confirm/finalize |

- **Web height** 38px · radius 10px · padding 0 14px · font 14/600 · icon 16, gap 8.
- **Mobile height** 48px · radius 12px · font 15/600 · full-width primary actions.
- **Disabled**: opacity 0.5, no pointer events, text uses `#94A3B8`.
- **Press (mobile)**: opacity 0.85, no scale.

## Inputs / fields

- Web height 40px · mobile 48–52px · radius 12px · 1px `#E2E8F0` border · padding 0 12–14px · font 14–16.
- **Focus**: border `#6D28D9` 2px + halo `0 0 0 4px #DDD6FE`. Remove default outline.
- **Error**: border `#DC2626`, helper text `#DC2626`.
- Label: caption 12px, `#475569`, weight 500–600, margin-bottom 6px.
- Leading/trailing icons: `#94A3B8`, 18px, inset 12–14px; pad the input side accordingly.
- Helper text: 12px `#64748B` below field.

## Cards

- Bg `#FFF` · 1px `#E2E8F0` border · radius 16 (web) / 12 (mobile) · padding 14–18px.
- **No resting shadow.** Hover (web, if interactive) lifts to `--shadow-card`.
- Inner dividers 1px `#F1F5F9`.
- Section label inside card: 11–12px uppercase, `#64748B`, letter-spacing 0.06em, weight 600.

## Badges (status)

- Pill (radius 9999), padding 4–5px / 8–9px, font 11/600, dot 5–6px + label. **Never color alone.**

| Tone | Bg | Text | Quote status | OS status |
|---|---|---|---|---|
| slate | `#F1F5F9` | `#334155` | Rascunho, Expirado | — |
| warning | `#FEF3C7` | `#92400E` | Pendente | Em execução, Aguardando material |
| success | `#DCFCE7` | `#166534` | Aprovado | Finalizada |
| danger | `#FEE2E2` | `#991B1B` | Rejeitado | Cancelada |
| info | `#E0F2FE` | `#075985` | — | Aberta, Aguardando cliente |
| brand | `#F5F3FF` | `#4C1D95` | — | Agendada |

Status enum → label map:
- Quotes: `DRAFT`→Rascunho · `PENDING`→Pendente · `APPROVED`→Aprovado · `REJECTED`→Rejeitado · `EXPIRED`→Expirado · `CANCELLED`→Cancelado
- OS: `OPEN`→Aberta · `SCHEDULED`→Agendada · `IN_PROGRESS`→Em execução · `WAITING_CLIENT`→Aguardando cliente · `WAITING_MATERIAL`→Aguardando material · `FINISHED`→Finalizada · `CANCELLED`→Cancelada

## Money

- Format `R$ 1.234,56` — pt-BR, non-breaking space after `R$`. Stored as decimal string, never a JS float.
- Display: `tabular-nums`, weight ≥600, larger than surrounding text. Positive received amounts may use `#16A34A`.

## Navigation

- **Web sidebar** 260px fixed, white, 1px right border. Items: 8px 10px padding, radius 10, 14/500, icon 18 + gap 10. Active item = bg `#F5F3FF`, text `#4C1D95`, icon `#5B21B6`. Section labels = 11px mono uppercase `#64748B`. Footer = avatar + name + "Empresa · <plano>".
  - Nav order: Dashboard · Clientes · Catálogo · Orçamentos · Ordens de Serviço · Agenda · Financeiro · Documentos · Configurações.
- **Web topbar** 64px, white, 1px bottom border, search box (380–480px, 38px, bg `#F8FAFC`) + bell + settings icon buttons (38px, radius 10).
- **Mobile tab bar** 5 items fixed bottom, ~64–78px tall, white + blur, top border `#F1F5F9`. Active = `#5B21B6`. Labels 10.5px/500.
- **Mobile header** sticky, blur(12px) over `rgba(255,255,255,0.85)` when scrolled.

## FAB (mobile)

- 52px tall pill, bottom-right, 16px inset, above tab bar. Bg `#6D28D9`, white text/icon, `box-shadow: 0 8px 22px rgba(109,40,217,.35)`.

## Tabs (web)

- Underline style: 10px 12px padding, 14/500, `#64748B`; active = `#0A0A0F`, 2px bottom border `#6D28D9`, weight 600.

## Tables (web)

- Header row bg `#F8FAFC`, 12px uppercase `#64748B` weight 500, 1px bottom border `#E2E8F0`.
- Cells 12px 16px, 14px text, 1px bottom border `#F1F5F9`. Row hover bg `#F8FAFC`. Numbers tabular, right-aligned.

## Modals & sheets

- **Web modal**: centered, radius 16–20, `--shadow-modal`, scrim `rgba(10,10,15,0.42)`. Header (icon tile + title + sub) / body / footer (right-aligned actions, 1px top divider).
- **Mobile bottom sheet**: top corners radius 22–24, grabber 36×4 `#CBD5E1`, scrim `rgba(10,10,15,0.5)`, slide-up 280ms.

## Steppers / wizards

- Web: numbered circles (28px), done = `#16A34A` + check, active = `#6D28D9`, pending = `#F1F5F9`/`#64748B`, connector 1px `#E2E8F0`.
- Mobile: dot row; active dot widens to 22×8 pill `#6D28D9`, done `#C4B5FD`, pending `#E2E8F0`.

## Skeletons (loading)

- Shimmer block: linear-gradient slate-100 → slate-200 → slate-100, 1.6s loop (or opacity 0.4→0.8→0.4 over 1.2s). Match the real element's shape/size. No purple spinner.

## States covered in the kit (`screens/` lotes)

- **Plano bloqueado** — mobile bottom sheet + web modal (upsell, "Ver planos", no price).
- **Sem conexão** — mobile (local queue) + web (simple "aguarde a conexão" banner; no robust-sync promise).
- **Permission denied** — 403, "Peça acesso ao administrador", audit-log note.
- **Edit lock** — "Em edição por <user>", request-edit path, auto-release after inactivity.
- **Skeletons** — mobile home + web dashboard/table.

## Public / PDF (client-facing)

- Public quote approval: responsive, sticky CTA, emoji greeting **allowed here only**. Actions: Aprovar / Recusar / Pedir ajuste. Pix confirmation by customer = "Avisar que paguei" (owner confirms real payment in-app).
- PDF: 2-page A4, brand mark + ink→purple corner rule, Pix block, signature area. Footer "Gerado por Orcivo".
