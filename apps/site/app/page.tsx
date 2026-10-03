import { pageMetadata } from './seo';

export const metadata = pageMetadata(
  'Orcivo — Gestão para técnicos instaladores',
  'Orçamentos, OS, PDF e aprovação pelo WhatsApp — tudo no celular.',
  '/',
  true,
);

import Link from 'next/link';
import {
  Zap, FileText, MessageCircle, CheckCircle2, ArrowRight, ShieldCheck,
  Smartphone, ClipboardList, Star, Camera, Wallet,
} from 'lucide-react';
import { Reveal } from './components/Reveal';

const APP = 'https://app.orcivo.com.br';

const PLANS = [
  { name: 'Orcivo Livre', price: 'R$ 0', period: 'para sempre', desc: 'Para começar e testar na prática.', highlight: false },
  { name: 'Orcivo Solo',  price: 'R$ 9,90', period: '/mês', desc: 'PDF sem marca d’água e logo própria.', highlight: false },
  { name: 'Orcivo Mais',  price: 'R$ 19,90', period: '/mês', desc: 'Relatórios e até 3 na equipe.', highlight: true },
  { name: 'Orcivo Equipe', price: 'R$ 39,90', period: '/mês', desc: 'Para equipes maiores em campo.', highlight: false },
];

const FAQ = [
  { q: 'Preciso de cartão de crédito para começar?', a: 'Não. O Orcivo Livre é gratuito e você cria a conta em menos de 1 minuto, sem cartão.' },
  { q: 'Funciona no celular?', a: 'Sim. O Orcivo foi feito para o técnico em campo: monte e envie orçamentos direto do celular.' },
  { q: 'O cliente precisa instalar algo para aprovar?', a: 'Não. Ele recebe o orçamento pelo WhatsApp e aprova por um link — sem instalar nada.' },
  { q: 'Posso trocar de plano depois?', a: 'Sim, a qualquer momento. Você gerencia a assinatura dentro do app quando quiser.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Nav ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-primary-600 tracking-tight">Orcivo</span>
          <nav className="flex items-center gap-2 sm:gap-6">
            <Link href="/planos" className="hidden sm:block text-sm text-slate-600 hover:text-slate-900 transition-colors">Planos</Link>
            <Link href={`${APP}/login`} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Entrar</Link>
            <Link href={`${APP}/signup`} className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors">
              Criar conta grátis
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* blobs de fundo */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="ov-blob absolute -top-24 -left-16 w-96 h-96 rounded-full bg-primary-100 blur-3xl opacity-60" />
          <div className="ov-blob absolute top-10 right-0 w-80 h-80 rounded-full bg-primary-50 blur-3xl opacity-80" style={{ animationDelay: '3s' }} />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
          {/* Coluna texto */}
          <div>
            <span className="ov-anim-hero inline-flex items-center gap-2 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-full mb-6">
              <Zap size={13} /> Feito para técnicos instaladores
            </span>
            <h1 className="ov-anim-hero ov-d1 text-4xl sm:text-5xl font-bold text-slate-900 leading-[1.08] tracking-tight mb-5">
              Do orçamento à aprovação,<br />
              <span className="text-primary-600">tudo pelo celular.</span>
            </h1>
            <p className="ov-anim-hero ov-d2 text-lg text-slate-600 mb-8 max-w-lg">
              Monte orçamentos profissionais, gere PDF com a sua logo e receba a aprovação
              do cliente pelo WhatsApp — sem computador, sem complicação.
            </p>
            <div className="ov-anim-hero ov-d3 flex flex-col sm:flex-row gap-3 mb-6">
              <Link
                href={`${APP}/signup`}
                className="ov-sheen inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-primary-600/20"
              >
                Criar conta grátis <ArrowRight size={18} />
              </Link>
              <Link
                href="/planos"
                className="inline-flex items-center justify-center px-7 py-3.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-primary-300 hover:text-primary-700 transition-colors"
              >
                Ver planos
              </Link>
            </div>
            <div className="ov-anim-hero ov-d4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-primary-600" /> Sem cartão de crédito</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary-600" /> Cancele quando quiser</span>
            </div>
          </div>

          {/* Coluna mockup animado */}
          <div className="ov-anim-hero ov-d2 relative">
            <div className="ov-float mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <span className="text-xs font-mono text-slate-400">ORÇ #248</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Aprovado
                </span>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm font-semibold text-slate-900">Instalação CFTV — 4 câmeras</p>
                <p className="text-xs text-slate-500 mb-4">Ana Souza</p>
                {[['Visita técnica', 'R$ 180,00'], ['Câmera 4MP × 4', 'R$ 1.280,00']].map(([d, v]) => (
                  <div key={d} className="flex justify-between text-sm py-2 border-b border-slate-50">
                    <span className="text-slate-600">{d}</span>
                    <span className="font-mono text-slate-800">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4">
                  <span className="text-sm font-semibold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-primary-600 font-mono">R$ 1.314,00</span>
                </div>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <span className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#25D366] py-2.5 rounded-lg">
                  <MessageCircle size={14} /> WhatsApp
                </span>
                <span className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-200 py-2.5 rounded-lg">
                  <FileText size={14} /> PDF
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Faixa de público ──────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
          <span className="font-medium text-slate-400">Feito para quem instala:</span>
          {['CFTV e segurança', 'Elétrica', 'Ar-condicionado', 'Som e automação', 'Redes e telecom'].map(t => (
            <span key={t} className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary-500" /> {t}</span>
          ))}
        </div>
      </section>

      {/* ── Benefícios ────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">Menos planilha, mais serviço fechado</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Tudo que o técnico precisa para passar uma imagem profissional e fechar mais rápido.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, t: 'Orçamento em 2 minutos', d: 'Monte orçamentos com itens do seu catálogo direto do celular, na casa do cliente.' },
              { icon: FileText, t: 'PDF com a sua logo', d: 'Gere um PDF profissional com a identidade da sua empresa, automaticamente.' },
              { icon: MessageCircle, t: 'Aprovação pelo WhatsApp', d: 'Envie o link e receba a aprovação do cliente — com assinatura, sem burocracia.' },
              { icon: Camera, t: 'Ordem de Serviço com fotos', d: 'Registre o antes, durante e depois de cada serviço em uma OS organizada.' },
              { icon: Wallet, t: 'Financeiro no controle', d: 'Acompanhe o que foi aprovado e o que está pendente, sem planilha paralela.' },
              { icon: Smartphone, t: 'Funciona em campo', d: 'Pensado para o celular: rápido, leve e direto ao ponto onde o trabalho acontece.' },
            ].map((f, i) => (
              <Reveal key={f.t} delay={(i % 3) * 80}>
                <div className="group h-full p-6 rounded-2xl border border-slate-200 bg-white hover:border-primary-200 hover:shadow-xl hover:shadow-primary-600/5 hover:-translate-y-1 transition-all duration-300">
                  <div className="inline-flex p-3 bg-primary-50 rounded-xl mb-4 group-hover:bg-primary-100 transition-colors">
                    <f.icon className="text-primary-600" size={22} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1.5">{f.t}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ─────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Três passos do orçamento ao “fechado”</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: ClipboardList, step: '01', t: 'Monte', d: 'Cadastre seus serviços uma vez e monte o orçamento em minutos.' },
              { icon: MessageCircle, step: '02', t: 'Envie', d: 'Mande pelo WhatsApp com PDF profissional e link de aprovação.' },
              { icon: CheckCircle2, step: '03', t: 'Feche', d: 'O cliente aprova com um toque e vira Ordem de Serviço.' },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 100}>
                <div className="relative h-full p-7 rounded-2xl bg-white border border-slate-200">
                  <span className="absolute top-6 right-6 text-4xl font-bold text-slate-100">{s.step}</span>
                  <div className="inline-flex p-3 bg-primary-600 rounded-xl mb-4">
                    <s.icon className="text-white" size={22} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1.5">{s.t}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prova social ──────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="flex justify-center gap-1 mb-5">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={20} className="fill-amber-400 text-amber-400" />)}
            </div>
            <blockquote className="text-xl sm:text-2xl font-medium text-slate-800 leading-snug mb-6">
              “Antes eu mandava orçamento no caderno e foto. Agora o cliente recebe um PDF
              com a minha logo e aprova na hora. Passei a fechar muito mais.”
            </blockquote>
            <p className="text-sm text-slate-500">João Ribeiro · Instalador de CFTV · São Paulo</p>
          </Reveal>
        </div>
      </section>

      {/* ── Planos (teaser) ───────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">Comece grátis. Cresça quando precisar.</h2>
            <p className="text-lg text-slate-600">Planos a partir de R$ 9,90/mês. Sem fidelidade.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={(i % 4) * 70}>
                <div className={`h-full p-6 rounded-2xl border bg-white flex flex-col transition-all duration-300 hover:-translate-y-1 ${p.highlight ? 'border-primary-600 shadow-xl shadow-primary-600/10 ring-1 ring-primary-600' : 'border-slate-200 hover:shadow-lg'}`}>
                  {p.highlight && <span className="self-start text-[11px] font-bold uppercase tracking-wide text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full mb-3">Mais popular</span>}
                  <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                  <div className="mt-2 mb-3 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary-600">{p.price}</span>
                    <span className="text-sm text-slate-400">{p.period}</span>
                  </div>
                  <p className="text-sm text-slate-600 flex-1">{p.desc}</p>
                  <Link
                    href={`${APP}/signup`}
                    className={`mt-5 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${p.highlight ? 'bg-primary-600 text-white hover:bg-primary-700' : 'border border-slate-200 text-slate-700 hover:border-primary-300 hover:text-primary-700'}`}
                  >
                    Começar
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mt-10">
            <Link href="/planos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700">
              Comparar todos os planos <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Perguntas frequentes</h2>
          </Reveal>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <details className="group rounded-xl border border-slate-200 bg-white p-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between cursor-pointer text-base font-semibold text-slate-900">
                    {f.q}
                    <span className="ml-4 text-primary-600 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-slate-600 text-sm leading-relaxed">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <Reveal className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl px-8 py-16 text-center text-white"
            style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)' }}>
            <div className="pointer-events-none absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 60%, #fff 0, transparent 35%)' }} />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Comece grátis hoje. Sem cartão.</h2>
              <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
                Crie sua conta em menos de 1 minuto e faça seu primeiro orçamento agora.
              </p>
              <Link
                href={`${APP}/signup`}
                className="ov-sheen inline-flex items-center justify-center gap-2 px-9 py-4 bg-white text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-all hover:-translate-y-0.5 shadow-xl"
              >
                Criar conta no Orcivo <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

    </div>
  );
}
