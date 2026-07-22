// Lote D — Páginas públicas
// 1. Aprovação pública de orçamento — responsivo (desktop + mobile)
// 2. Preview de PDF (desktop)

const I = (props) => <AuthIcon {...props} />;

// ─────────────  Quote content (shared between mobile + desktop) ───────────── //

const QUOTE = {
  biz: { name: "Ribeiro Elétrica", sub: "CNPJ 12.345.678/0001-90 · (11) 4002-8922", initials: "RE" },
  number: "#248",
  customer: { name: "Construtora Vila Nova", contact: "Eng. Helena Tavares", phone: "(11) 4002-8922" },
  validity: "30 dias",
  emitted: "08 / mai / 2026",
  expires: "07 / jun / 2026",
  items: [
    { name: "Instalação de quadro elétrico", desc: "Inclui montagem do quadro de 32 circuitos, disjuntores de proteção, identificação e teste final.", qty: "1,00 un", price: "1.890,00", total: "1.890,00" },
    { name: "Disjuntor DR 40A", desc: "Disjuntor diferencial residual 30mA · marca Steck.", qty: "2,00 un", price: "160,00", total: "320,00" },
    { name: "Mão de obra técnica", desc: "Equipe com técnico responsável e ajudante.", qty: "6,00 h", price: "120,00", total: "720,00" },
    { name: "Material elétrico diverso", desc: "Cabos 6mm², 10mm², canaletas, conectores, identificadores e itens de fixação.", qty: "1,00 un", price: "1.550,00", total: "1.550,00" },
  ],
  subtotal: "4.480,00",
  discount: "—",
  total: "R$ 4.480,00",
};

// ─────────────  1a. Public quote — Desktop ───────────── //

function WebPublicQuote() {
  return (
    <div className="pub">
      <div className="pub-bar">
        <div className="biz">{QUOTE.biz.initials}</div>
        <div style={{flex:1, minWidth:0}}>
          <div className="biz-name">{QUOTE.biz.name}</div>
          <div className="biz-sub">{QUOTE.biz.sub}</div>
        </div>
        <div className="powered">Enviado via <strong>Orcivo</strong></div>
      </div>

      <div className="pub-body">
        <div className="pub-hero">
          <div className="ic"><I name="file" size={28} stroke={1.8}/></div>
          <div style={{flex:1}}>
            <h1>Olá, Construtora Vila Nova 👋</h1>
            <div className="sub">Aqui está o orçamento {QUOTE.number}, preparado por <strong>{QUOTE.biz.name}</strong>. Confira os itens, valores e condições — você pode aprovar ou recusar abaixo.</div>
          </div>
          <div className="m-badge b-warn" style={{padding:"6px 12px", fontSize:12}}><span className="dot"/>Aguardando sua resposta</div>
        </div>

        <div className="pub-meta-row">
          <span><I name="cal" size={14}/> Emitido em <strong style={{color:"var(--ink)"}}>{QUOTE.emitted}</strong></span>
          <span><I name="clock" size={14}/> Válido até <strong style={{color:"var(--ink)"}}>{QUOTE.expires}</strong></span>
          <span><I name="shield" size={14}/> Você está num link seguro do Orcivo</span>
        </div>

        <div className="pub-card">
          <h2>Para</h2>
          <div className="pub-grid-2">
            <div className="pub-kv"><div className="k">Cliente</div><div className="v">{QUOTE.customer.name}</div></div>
            <div className="pub-kv"><div className="k">Contato</div><div className="v">{QUOTE.customer.contact}</div></div>
            <div className="pub-kv"><div className="k">Telefone</div><div className="v">{QUOTE.customer.phone}</div></div>
            <div className="pub-kv"><div className="k">Endereço da obra</div><div className="v">Av. das Nações, 412 · Vila Nova · São Paulo / SP</div></div>
          </div>
        </div>

        <div className="pub-card">
          <h2>Itens · {QUOTE.items.length}</h2>
          {QUOTE.items.map((it, i) => (
            <div key={i} className="pub-item">
              <div>
                <div className="name">{it.name}</div>
                <div className="desc">{it.desc}</div>
              </div>
              <div className="qty">{it.qty}<br/><span style={{color:"var(--fg-3)", fontSize:11}}>× R$ {it.price}</span></div>
              <div className="total">R$ {it.total}</div>
            </div>
          ))}
          <div className="pub-totals">
            <div className="row"><span>Subtotal</span><strong>R$ {QUOTE.subtotal}</strong></div>
            <div className="row"><span>Desconto</span><strong>{QUOTE.discount}</strong></div>
            <div className="row grand"><span>Total</span><span className="v">{QUOTE.total}</span></div>
          </div>
        </div>

        <div className="pub-card">
          <h2>Condições</h2>
          <div className="pub-grid-2">
            <div className="pub-kv"><div className="k">Forma de pagamento</div><div className="v">50% no início + 50% na entrega</div></div>
            <div className="pub-kv"><div className="k">Prazo de execução</div><div className="v">3 dias úteis após aprovação</div></div>
            <div className="pub-kv"><div className="k">Garantia</div><div className="v">90 dias sobre serviço e material</div></div>
            <div className="pub-kv"><div className="k">Validade</div><div className="v">Até {QUOTE.expires}</div></div>
          </div>
          <div style={{marginTop:14, padding:"12px 14px", background:"var(--slate-50)", borderRadius:10, fontSize:13, color:"var(--fg-2)", lineHeight:"20px"}}>
            <strong style={{color:"var(--ink)"}}>Observações:</strong> Os valores incluem material e mão de obra. Não estão inclusos serviços de alvenaria ou acabamento — caso necessário, será orçado à parte.
          </div>
        </div>

        <div className="pub-cta">
          <div className="total-mini">
            <div className="k">Total a aprovar</div>
            <div className="v">{QUOTE.total}</div>
          </div>
          <div className="actions">
            <button className="reject"><I name="x" size={16}/> Recusar</button>
            <button style={{height:46, padding:"0 18px", borderRadius:12, background:"#fff", border:"1px solid var(--border-1)", fontFamily:"inherit", fontWeight:700, fontSize:14, color:"var(--ink)", display:"flex", alignItems:"center", gap:8}}>
              <I name="msg" size={16}/> Pedir ajuste
            </button>
            <button className="accept"><I name="check" size={16}/> Aprovar orçamento</button>
          </div>
        </div>

        <div style={{display:"flex", gap:14, justifyContent:"center", marginTop:32, color:"var(--fg-3)", fontSize:12, alignItems:"center", flexWrap:"wrap"}}>
          <span style={{display:"flex", gap:6, alignItems:"center"}}><I name="download" size={14}/> Baixar PDF</span>
          <span>·</span>
          <span style={{display:"flex", gap:6, alignItems:"center"}}><I name="whatsapp" size={14} color="var(--success)"/> Compartilhar no WhatsApp</span>
          <span>·</span>
          <span style={{display:"flex", gap:6, alignItems:"center"}}><I name="shield" size={14}/> Link único e privado</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────  1b. Public quote — Mobile (responsive) ───────────── //

function MobPublicQuote() {
  return (
    <div className="pub pub-mobile" style={{borderRadius:0}}>
      <div className="pub-bar">
        <div className="biz">{QUOTE.biz.initials}</div>
        <div style={{flex:1, minWidth:0}}>
          <div className="biz-name" style={{fontSize:14}}>{QUOTE.biz.name}</div>
          <div className="biz-sub" style={{fontSize:11}}>{QUOTE.biz.sub}</div>
        </div>
      </div>
      <div className="pub-body">
        <div className="pub-hero">
          <div style={{display:"flex", gap:12, alignItems:"center", width:"100%"}}>
            <div className="ic" style={{width:44, height:44, borderRadius:12}}><I name="file" size={20}/></div>
            <div style={{flex:1, minWidth:0}}>
              <div className="m-badge b-warn" style={{padding:"3px 8px", fontSize:10}}><span className="dot"/>Aguardando resposta</div>
            </div>
          </div>
          <div>
            <h1>Orçamento {QUOTE.number}</h1>
            <div className="sub" style={{fontSize:13, marginTop:6}}>Preparado para <strong style={{color:"var(--ink)"}}>{QUOTE.customer.name}</strong> em {QUOTE.emitted}.</div>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", width:"100%", padding:"10px 12px", background:"#fff", borderRadius:10, border:"1px solid var(--border-1)"}}>
            <div>
              <div style={{fontSize:10, color:"var(--fg-3)", textTransform:"uppercase", fontWeight:600, letterSpacing:"0.04em"}}>Total</div>
              <div style={{fontSize:20, fontWeight:700, color:"var(--purple-700)"}}>{QUOTE.total}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10, color:"var(--fg-3)", textTransform:"uppercase", fontWeight:600, letterSpacing:"0.04em"}}>Válido até</div>
              <div style={{fontSize:13, fontWeight:600}}>{QUOTE.expires}</div>
            </div>
          </div>
        </div>

        <div className="pub-card">
          <h2>Itens · {QUOTE.items.length}</h2>
          {QUOTE.items.map((it, i) => (
            <div key={i} className="pub-item">
              <div className="name">{it.name}</div>
              <div className="desc">{it.desc}</div>
              <div className="row-bottom">
                <div style={{fontSize:12, color:"var(--fg-3)"}}>{it.qty} × R$ {it.price}</div>
                <div style={{fontWeight:700, fontSize:15, fontVariantNumeric:"tabular-nums"}}>R$ {it.total}</div>
              </div>
            </div>
          ))}
          <div className="pub-totals">
            <div className="row"><span>Subtotal</span><strong>R$ {QUOTE.subtotal}</strong></div>
            <div className="row grand" style={{fontSize:18}}><span>Total</span><span className="v">{QUOTE.total}</span></div>
          </div>
        </div>

        <div className="pub-card">
          <h2>Condições</h2>
          <div style={{display:"flex", flexDirection:"column", gap:10}}>
            <div className="pub-kv"><div className="k">Pagamento</div><div className="v">50% no início + 50% na entrega</div></div>
            <div className="pub-kv"><div className="k">Prazo</div><div className="v">3 dias úteis após aprovação</div></div>
            <div className="pub-kv"><div className="k">Garantia</div><div className="v">90 dias sobre serviço e material</div></div>
          </div>
        </div>

        <div style={{display:"flex", gap:10, justifyContent:"center", margin:"16px 0", fontSize:11, color:"var(--fg-3)"}}>
          <span style={{display:"flex", gap:4, alignItems:"center"}}><I name="download" size={12}/> Baixar PDF</span>
          <span>·</span>
          <span style={{display:"flex", gap:4, alignItems:"center"}}><I name="shield" size={12}/> Link seguro Orcivo</span>
        </div>
      </div>

      <div className="pub-cta">
        <div style={{display:"flex", gap:8, width:"100%"}}>
          <button style={{flex:0.5, height:46, borderRadius:12, background:"#fff", border:"1px solid var(--border-1)", fontFamily:"inherit", fontWeight:700, fontSize:13, color:"var(--ink)", display:"flex", alignItems:"center", justifyContent:"center", gap:6}}>
            <I name="x" size={14}/> Recusar
          </button>
          <button style={{flex:1.5, height:46, borderRadius:12, background:"var(--purple-600)", border:0, color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
            <I name="check" size={16}/> Aprovar · {QUOTE.total}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────  1c. Public quote — Approved success ───────────── //

function WebPublicQuoteApproved() {
  return (
    <div className="pub">
      <div className="pub-bar">
        <div className="biz">{QUOTE.biz.initials}</div>
        <div style={{flex:1, minWidth:0}}>
          <div className="biz-name">{QUOTE.biz.name}</div>
          <div className="biz-sub">{QUOTE.biz.sub}</div>
        </div>
        <div className="powered">Enviado via <strong>Orcivo</strong></div>
      </div>
      <div className="pub-body" style={{maxWidth:560, paddingTop:80, textAlign:"center"}}>
        <div style={{width:88, height:88, borderRadius:24, background:"var(--success-bg)", color:"var(--success)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px"}}>
          <I name="check" size={44} stroke={2.2}/>
        </div>
        <h1 style={{fontSize:30, lineHeight:"36px", fontWeight:700, letterSpacing:"-0.02em", margin:"0 0 10px"}}>Orçamento aprovado</h1>
        <p style={{fontSize:15, color:"var(--fg-3)", margin:"0 0 28px", lineHeight:"22px"}}>
          {QUOTE.biz.name} recebeu sua aprovação e vai entrar em contato em breve para combinar a execução. Você também pode iniciar o pagamento agora.
        </p>

        <div className="pub-card" style={{textAlign:"left"}}>
          <h2>Pagamento</h2>
          <div style={{display:"grid", gridTemplateColumns:"110px 1fr", gap:18, alignItems:"center"}}>
            <div className="pdf-pix-qr" style={{width:110, height:110}}/>
            <div>
              <div style={{fontSize:11, color:"var(--fg-3)", textTransform:"uppercase", fontWeight:600, letterSpacing:"0.06em"}}>Pix · entrada de 50%</div>
              <div style={{fontSize:24, fontWeight:700, color:"var(--ink)", margin:"4px 0"}}>R$ 2.240,00</div>
              <div style={{fontSize:13, color:"var(--fg-2)"}}>Chave Pix · <span style={{fontFamily:"var(--font-mono)"}}>12.345.678/0001-90</span></div>
              <div style={{marginTop:10, display:"flex", gap:8}}>
                <button className="auth-btn outline" style={{height:38, width:"auto", padding:"0 14px", fontSize:13}}>Copiar código Pix</button>
                <button className="auth-btn primary" style={{height:38, width:"auto", padding:"0 14px", fontSize:13}}>Avisar que paguei</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{display:"flex", gap:8, justifyContent:"center", marginTop:18}}>
          <button className="auth-btn outline" style={{width:"auto", padding:"0 14px"}}><I name="download" size={16}/> Baixar PDF</button>
          <button className="auth-btn outline" style={{width:"auto", padding:"0 14px"}}><I name="whatsapp" size={16} color="var(--success)"/> Falar no WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────  2. PDF preview ───────────── //

function WebPDFPreview() {
  return (
    <div className="pdf-stage">
      <div className="pdf-topbar">
        <div className="ic"><I name="arrow-left" size={16}/></div>
        <div style={{flex:1}}>
          <div className="name">Orçamento-248-Construtora-Vila-Nova.pdf</div>
          <div className="meta">2 páginas · 124 KB · gerado há 12 min</div>
        </div>
        <div className="zoom">
          <span style={{cursor:"pointer", opacity:0.7}}>−</span>
          <span>100 %</span>
          <span style={{cursor:"pointer", opacity:0.7}}>+</span>
        </div>
        <div className="ic"><I name="refresh" size={16}/></div>
        <div className="ic"><I name="download" size={16}/></div>
        <div className="ic"><I name="whatsapp" size={16}/></div>
        <button className="auth-btn primary" style={{width:"auto", padding:"0 14px", height:34, fontSize:13}}><I name="msg" size={14}/> Enviar ao cliente</button>
      </div>

      <div className="pdf-shell">
        <div className="pdf-scroll">
          {/* Page 1 */}
          <div className="pdf-page">
            <div className="corner-brand"/>
            <div className="pdf-header">
              <div className="left">
                <div className="logo"><OrcivoGlyph size={20}/></div>
                <div>
                  <div className="biz-name">{QUOTE.biz.name}</div>
                  <div className="biz-meta">
                    CNPJ 12.345.678/0001-90<br/>
                    Av. das Nações, 412 · Vila Nova · São Paulo / SP<br/>
                    contato@ribeiroeletrica.com.br · (11) 4002-8922
                  </div>
                </div>
              </div>
              <div className="right">
                <div className="doc-type">Orçamento</div>
                <div className="doc-num">{QUOTE.number}</div>
                <div className="biz-meta" style={{marginTop:6}}>
                  Emitido em {QUOTE.emitted}<br/>
                  Válido até {QUOTE.expires}
                </div>
              </div>
            </div>

            <div className="pdf-h2">Para</div>
            <div className="pdf-kv-grid">
              <div className="pdf-kv"><div className="k">Cliente</div><div className="v">{QUOTE.customer.name}</div></div>
              <div className="pdf-kv"><div className="k">Contato</div><div className="v">{QUOTE.customer.contact}</div></div>
              <div className="pdf-kv"><div className="k">Telefone</div><div className="v">{QUOTE.customer.phone}</div></div>
              <div className="pdf-kv"><div className="k">Local da obra</div><div className="v">Av. das Nações, 412 · Vila Nova · SP</div></div>
            </div>

            <div className="pdf-h2">Itens</div>
            <table className="pdf-items">
              <thead>
                <tr>
                  <th style={{width:"50%"}}>Descrição</th>
                  <th className="right">Qtd</th>
                  <th className="right">Unit.</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {QUOTE.items.map((it, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{fontWeight:600}}>{it.name}</div>
                      <div className="desc">{it.desc}</div>
                    </td>
                    <td className="right num">{it.qty}</td>
                    <td className="right num">{it.price}</td>
                    <td className="right num" style={{fontWeight:600}}>{it.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pdf-totals">
              <div className="row"><span>Subtotal</span><span>R$ {QUOTE.subtotal}</span></div>
              <div className="row"><span>Desconto</span><span>{QUOTE.discount}</span></div>
              <div className="row grand"><span>Total</span><span>{QUOTE.total}</span></div>
            </div>

            <div className="pdf-foot">
              <span>{QUOTE.biz.name} · CNPJ 12.345.678/0001-90</span>
              <span className="powered">Gerado por <strong style={{color:"var(--ink)"}}>Orcivo</strong> · página 1 / 2</span>
            </div>
          </div>
          <div className="pdf-page-num">Página 1 de 2</div>

          {/* Page 2 */}
          <div className="pdf-page">
            <div className="corner-brand"/>
            <div className="pdf-h2" style={{marginTop:0}}>Condições comerciais</div>
            <div className="pdf-kv-grid">
              <div className="pdf-kv"><div className="k">Forma de pagamento</div><div className="v">50% no início + 50% na entrega</div></div>
              <div className="pdf-kv"><div className="k">Prazo de execução</div><div className="v">3 dias úteis após aprovação</div></div>
              <div className="pdf-kv"><div className="k">Garantia</div><div className="v">90 dias sobre serviço e material instalado</div></div>
              <div className="pdf-kv"><div className="k">Validade da proposta</div><div className="v">{QUOTE.validity} · até {QUOTE.expires}</div></div>
            </div>

            <div className="pdf-h2">Observações</div>
            <div style={{fontSize:11, lineHeight:1.55, color:"var(--fg-2)"}}>
              Os valores incluem material e mão de obra. Não estão inclusos serviços de alvenaria ou acabamento — caso necessário, serão orçados à parte.
              A execução depende de acesso livre ao quadro elétrico durante o horário combinado.
              Qualquer alteração no escopo deverá ser comunicada antes do início dos trabalhos.
            </div>

            <div className="pdf-h2">Pagamento via Pix</div>
            <div className="pdf-pix-box">
              <div className="pdf-pix-qr"/>
              <div style={{flex:1}}>
                <div className="k">Chave Pix CNPJ</div>
                <div className="v">12.345.678/0001-90</div>
                <div className="sub">Após a aprovação você poderá copiar o código no link público do orçamento.</div>
              </div>
            </div>

            <div className="pdf-h2">Aprovação</div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:18}}>
              <div className="pdf-sig-box">
                <div className="pdf-sig-stroke"/>
                <div style={{borderTop:"1px solid var(--ink)", paddingTop:4, fontSize:9, color:"var(--fg-3)", letterSpacing:"0.04em"}}>ASSINATURA DO CLIENTE</div>
              </div>
              <div className="pdf-sig-box" style={{borderStyle:"solid", background:"var(--slate-50)"}}>
                <div style={{fontSize:9, color:"var(--fg-3)", letterSpacing:"0.04em", marginBottom:4}}>OU APROVAÇÃO ONLINE</div>
                <div style={{fontSize:11, color:"var(--ink)", lineHeight:1.5}}>
                  Acesse o link enviado por WhatsApp ou email e clique em <strong>Aprovar orçamento</strong>. A aprovação tem o mesmo valor legal de uma assinatura.
                </div>
              </div>
            </div>

            <div className="pdf-foot">
              <span>{QUOTE.biz.name} · CNPJ 12.345.678/0001-90</span>
              <span className="powered">Gerado por <strong style={{color:"var(--ink)"}}>Orcivo</strong> · página 2 / 2</span>
            </div>
          </div>
          <div className="pdf-page-num">Página 2 de 2</div>
        </div>

        <div className="pdf-side">
          <div>
            <h3>Documento</h3>
            <div className="meta-row"><span className="k">Número</span><strong>{QUOTE.number}</strong></div>
            <div className="meta-row"><span className="k">Cliente</span><strong>{QUOTE.customer.name}</strong></div>
            <div className="meta-row"><span className="k">Status</span><span className="m-badge b-warn" style={{padding:"3px 8px"}}><span className="dot"/>Pendente</span></div>
            <div className="meta-row"><span className="k">Total</span><strong>{QUOTE.total}</strong></div>
            <div className="meta-row"><span className="k">Validade</span><span>{QUOTE.expires}</span></div>
          </div>

          <div>
            <h3>Páginas</h3>
            <div style={{display:"flex", gap:10}}>
              <div className="pdf-thumb active">
                <div className="line title" style={{width:"50%"}}/>
                <div className="line"/><div className="line" style={{width:"80%"}}/>
                <div className="line"/><div className="line" style={{width:"70%"}}/>
                <div style={{height:32, background:"var(--slate-100)", borderRadius:2, margin:"8px 0 4px"}}/>
                <div className="line"/><div className="line" style={{width:"60%"}}/>
                <div className="num">1</div>
              </div>
              <div className="pdf-thumb">
                <div className="line title" style={{width:"60%"}}/>
                <div className="line"/><div className="line"/><div className="line" style={{width:"70%"}}/>
                <div className="line"/><div className="line" style={{width:"50%"}}/>
                <div style={{height:24, background:"var(--purple-100)", borderRadius:2, margin:"8px 0 4px"}}/>
                <div className="line"/><div className="line" style={{width:"40%"}}/>
                <div className="num">2</div>
              </div>
            </div>
          </div>

          <div style={{marginTop:"auto", padding:"12px 14px", background:"var(--purple-50)", border:"1px solid var(--purple-100)", borderRadius:10}}>
            <div style={{display:"flex", gap:8, alignItems:"flex-start"}}>
              <I name="sparkles" size={16} color="var(--purple-700)"/>
              <div style={{fontSize:12, color:"var(--purple-900)", lineHeight:"17px"}}>
                <strong>PDF personalizado:</strong> sua marca, suas cores. Disponível no <strong>Orcivo Mais</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WebPublicQuote, MobPublicQuote, WebPublicQuoteApproved, WebPDFPreview });
