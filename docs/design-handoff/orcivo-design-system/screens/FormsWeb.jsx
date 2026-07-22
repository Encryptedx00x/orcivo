// Lote B — Forms · Web screens
// 1. Novo cliente (modal-like full page)
// 2. Cliente detalhe com 6 abas

const I = (props) => <AuthIcon {...props} />;

function AppShell({ active = "Clientes", crumb, children }) {
  const nav = [
    ["building", "Início"],
    ["user", "Clientes"],
    ["package", "Catálogo"],
    ["file", "Orçamentos"],
    ["pen", "Ordens de serviço"],
    ["cal", "Agenda"],
    ["credit-card", "Financeiro"],
    ["settings", "Configurações"],
  ];
  const iconFor = (k) => k;
  return (
    <div className="app-shell">
      <div className="app-sb">
        <div className="brand">
          <div className="brand-mark"><OrcivoGlyph size={16}/></div>
          <div className="brand-name">Orcivo</div>
        </div>
        {nav.map(([k,l],i)=>(
          <div key={i} className={"item" + (l===active ? " active" : "")}>
            <I name={iconFor(k)} size={16}/>
            {l}
          </div>
        ))}
        <div style={{flex:1}}/>
        <div style={{marginTop:8, padding:"10px 8px", display:"flex", gap:10, alignItems:"center", borderTop:"1px solid var(--border-2)"}}>
          <div style={{width:30, height:30, borderRadius:"50%", background:"var(--purple-100)", color:"var(--purple-800)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:12}}>JR</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:13, fontWeight:600}}>João Ribeiro</div>
            <div style={{fontSize:11, color:"var(--fg-3)"}}>Ribeiro Elétrica</div>
          </div>
        </div>
      </div>
      <div style={{display:"flex", flexDirection:"column", minHeight:0}}>
        <div className="app-tb">
          {crumb}
          <div style={{flex:1}}/>
          <div style={{position:"relative", width:280}}>
            <input className="auth-input" style={{height:36, paddingLeft:36, fontSize:13, background:"var(--slate-50)"}} placeholder="Buscar cliente, orçamento, OS…"/>
            <div style={{position:"absolute", top:9, left:11, color:"var(--slate-400)"}}><I name="search" size={16}/></div>
          </div>
        </div>
        <div style={{flex:1, overflow:"auto"}}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────  1. Novo cliente (web) ───────────── //

function WebNewCustomer() {
  return (
    <AppShell
      active="Clientes"
      crumb={<div className="crumb"><span>Clientes</span> · <strong>Novo cliente</strong></div>}
    >
      <div style={{padding:"20px 32px", maxWidth:1100}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20}}>
          <div>
            <h1 style={{fontSize:24, lineHeight:"30px", fontWeight:700, letterSpacing:"-0.015em", margin:0}}>Novo cliente</h1>
            <p style={{color:"var(--fg-3)", fontSize:14, marginTop:4, marginBottom:0}}>Cadastre uma vez, use em orçamentos, OS e cobranças.</p>
          </div>
          <div style={{display:"flex", gap:8}}>
            <button className="auth-btn ghost" style={{width:"auto", padding:"0 14px", height:38}}>Cancelar</button>
            <button className="auth-btn outline" style={{width:"auto", padding:"0 14px", height:38}}>Salvar e novo</button>
            <button className="auth-btn primary" style={{width:"auto", padding:"0 18px", height:38}}>Salvar cliente</button>
          </div>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1fr 320px", gap:20}}>
          <div style={{display:"flex", flexDirection:"column", gap:16}}>
            <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:"20px 22px"}}>
              <div style={{display:"flex", gap:18, alignItems:"center", marginBottom:18, flexWrap:"wrap"}}>
                <div className="seg" style={{padding:4, width:280, margin:0, flexShrink:0}}>
                  <button className="active"><I name="user" size={14}/> Pessoa física</button>
                  <button><I name="building" size={14}/> Empresa</button>
                </div>
                <div style={{flex:1, minWidth:0}}/>
                <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                  {[["Residência",true],["Recorrente",true],["VIP",false]].map(([t,on],i)=>(
                    <div key={i} style={{
                      padding:"5px 11px", borderRadius:9999, fontSize:11, fontWeight:600,
                      background: on ? "var(--purple-50)" : "transparent",
                      color: on ? "var(--purple-800)" : "var(--fg-2)",
                      border: "1px solid " + (on ? "var(--purple-200)" : "var(--border-1)"),
                      whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:4, flexShrink:0,
                    }}>{on && <I name="check" size={11}/>}{t}</div>
                  ))}
                  <div style={{padding:"5px 11px", borderRadius:9999, fontSize:11, fontWeight:600, color:"var(--purple-700)", border:"1px dashed var(--purple-300)", whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:4, flexShrink:0}}>
                    <I name="plus" size={11}/> etiqueta
                  </div>
                </div>
              </div>

              <h3 style={{fontSize:13, fontWeight:600, color:"var(--fg-2)", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 12px"}}>Dados básicos</h3>

              <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:14}}>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">Nome completo *</label>
                  <input className="auth-input" defaultValue="Marcos Pereira"/>
                </div>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">CPF</label>
                  <input className="auth-input" placeholder="000.000.000-00"/>
                </div>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginTop:14}}>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">Telefone principal *</label>
                  <div className="auth-input-wrap">
                    <span className="leading"><I name="whatsapp" size={18} color="var(--success)"/></span>
                    <input className="auth-input has-leading" defaultValue="(11) 98123-4521"/>
                  </div>
                </div>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">Telefone secundário</label>
                  <input className="auth-input" placeholder="—"/>
                </div>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">Email</label>
                  <input className="auth-input" defaultValue="marcos.p@gmail.com"/>
                </div>
              </div>
            </div>

            <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:"20px 22px"}}>
              <div style={{display:"flex", alignItems:"center", marginBottom:14}}>
                <h3 style={{fontSize:13, fontWeight:600, color:"var(--fg-2)", textTransform:"uppercase", letterSpacing:"0.06em", margin:0, flex:1}}>Endereço</h3>
                <span className="auth-link" style={{fontSize:13}}><I name="map" size={14}/> &nbsp;Buscar por CEP</span>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"180px 1fr 120px 200px", gap:14}}>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">CEP</label>
                  <input className="auth-input" defaultValue="04567-010"/>
                </div>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">Rua</label>
                  <input className="auth-input" defaultValue="Av. das Nações"/>
                </div>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">Número</label>
                  <input className="auth-input" defaultValue="412"/>
                </div>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">Complemento</label>
                  <input className="auth-input" defaultValue="apto 73"/>
                </div>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 120px", gap:14, marginTop:14}}>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">Bairro</label>
                  <input className="auth-input" defaultValue="Vila Nova"/>
                </div>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">Cidade</label>
                  <input className="auth-input" defaultValue="São Paulo"/>
                </div>
                <div className="auth-field" style={{marginBottom:0}}>
                  <label className="lbl">UF</label>
                  <div className="auth-input-wrap">
                    <input className="auth-input has-trailing" defaultValue="SP"/>
                    <span className="trailing"><I name="chev-down" size={16}/></span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:"20px 22px"}}>
              <h3 style={{fontSize:13, fontWeight:600, color:"var(--fg-2)", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 12px"}}>Observações internas <span style={{color:"var(--fg-3)", textTransform:"none", letterSpacing:0, fontWeight:400}}>· só você e sua equipe veem</span></h3>
              <textarea className="auth-input" rows="3" style={{height:90, padding:"12px 14px", resize:"vertical"}}
                placeholder="Ex.: prefere atendimento pela manhã, paga sempre via Pix…"/>
            </div>
          </div>

          {/* right rail */}
          <div style={{display:"flex", flexDirection:"column", gap:16}}>
            <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:"18px 20px"}}>
              <h3 style={{fontSize:13, fontWeight:600, color:"var(--fg-2)", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 12px"}}>Pré-visualização</h3>
              <div style={{display:"flex", gap:12, alignItems:"center", marginBottom:14}}>
                <div style={{width:48, height:48, borderRadius:14, background:"var(--purple-100)", color:"var(--purple-800)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:17}}>MP</div>
                <div>
                  <div style={{fontWeight:600, fontSize:15}}>Marcos Pereira</div>
                  <div style={{fontSize:12, color:"var(--fg-3)"}}>(11) 98123-4521</div>
                </div>
              </div>
              <div style={{fontSize:13, color:"var(--fg-2)", lineHeight:"20px"}}>
                Av. das Nações, 412 — apto 73<br/>
                Vila Nova · São Paulo / SP<br/>
                CEP 04567-010
              </div>
            </div>

            <div style={{background:"var(--purple-50)", border:"1px solid var(--purple-100)", borderRadius:12, padding:16}}>
              <div style={{display:"flex", gap:10, alignItems:"flex-start"}}>
                <I name="info" size={18} color="var(--purple-700)"/>
                <div style={{fontSize:13, color:"var(--purple-900)", lineHeight:"18px"}}>
                  <strong>3 clientes cadastrados</strong> no Orcivo Mais.<br/>
                  Cadastro mínimo: nome + telefone.
                </div>
              </div>
            </div>

            <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:"18px 20px"}}>
              <h3 style={{fontSize:13, fontWeight:600, color:"var(--fg-2)", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 12px"}}>Atalhos depois de salvar</h3>
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                <div className="auth-check" style={{padding:0}}>
                  <div className="box" style={{background:"var(--purple-600)", borderColor:"var(--purple-600)", color:"#fff"}}><I name="check" size={14}/></div>
                  <div>Criar orçamento em seguida</div>
                </div>
                <div className="auth-check" style={{padding:0}}>
                  <div className="box"/>
                  <div>Agendar visita técnica</div>
                </div>
                <div className="auth-check" style={{padding:0}}>
                  <div className="box"/>
                  <div>Salvar endereço como obra</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─────────────  2. Cliente detalhe — 6 abas ───────────── //

function WebCustomerDetail() {
  return (
    <AppShell
      active="Clientes"
      crumb={<div className="crumb"><span>Clientes</span> · <strong>Marcos Pereira</strong></div>}
    >
      <div className="cust-shell">
        {/* aside */}
        <div className="cust-aside">
          <div className="cust-avatar">MP</div>
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap"}}>
            <h2 style={{margin:0, fontSize:20, lineHeight:"26px", fontWeight:700, letterSpacing:"-0.01em"}}>Marcos Pereira</h2>
          </div>
          <div style={{fontSize:13, color:"var(--fg-3)", marginBottom:14}}>Cliente desde mai/2024 · 4 orçamentos</div>

          <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:18}}>
            <span className="m-badge b-brand" style={{padding:"4px 9px", fontSize:11}}><span className="dot"/>Recorrente</span>
            <span className="m-badge b-slate" style={{padding:"4px 9px", fontSize:11}}>Residência</span>
            <span className="m-badge b-slate" style={{padding:"4px 9px", fontSize:11}}>Pessoa física</span>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:18}}>
            <button className="auth-btn primary" style={{height:38, width:"auto", fontSize:13}}><I name="plus" size={16}/> Orçamento</button>
            <button className="auth-btn outline" style={{height:38, width:"auto", fontSize:13}}><I name="whatsapp" size={16} color="var(--success)"/> WhatsApp</button>
            <button className="auth-btn outline" style={{height:38, width:"auto", fontSize:13}}><I name="phone" size={16}/> Ligar</button>
            <button className="auth-btn outline" style={{height:38, width:"auto", fontSize:13}}><I name="cal" size={16}/> Agendar</button>
          </div>

          <h3 style={{fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 8px"}}>Contato</h3>
          <div className="kv"><span className="k">Telefone</span><span className="v">(11) 98123-4521</span></div>
          <div className="kv"><span className="k">Email</span><span className="v">marcos.p@gmail.com</span></div>
          <div className="kv"><span className="k">CPF</span><span className="v">123.456.789-00</span></div>
          <div className="kv"><span className="k">Aniversário</span><span className="v">12 / mar</span></div>

          <h3 style={{fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.06em", margin:"18px 0 8px"}}>Endereço principal</h3>
          <div style={{fontSize:13, color:"var(--fg-2)", lineHeight:"20px"}}>
            Av. das Nações, 412 — apto 73<br/>
            Vila Nova · São Paulo / SP<br/>
            CEP 04567-010
          </div>
          <span className="auth-link" style={{fontSize:13, marginTop:8, display:"inline-block"}}>+ adicionar 2º endereço</span>
        </div>

        {/* tabs + content */}
        <div style={{minWidth:0}}>
          <div className="cust-tabs">
            <div className="tab active">Resumo</div>
            <div className="tab">Orçamentos <span className="count">4</span></div>
            <div className="tab">OS <span className="count">3</span></div>
            <div className="tab">Financeiro <span className="count">2</span></div>
            <div className="tab">Endereços <span className="count">2</span></div>
            <div className="tab">Histórico</div>
          </div>

          {/* Resumo */}
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24}}>
            {[
              ["Orçamentos","4","2 aprovados"],
              ["OS concluídas","3","R$ 12.480 faturado"],
              ["Em aberto","R$ 1.890","1 pendência"],
              ["Recebido","R$ 12.480","último: 02/05"],
            ].map(([k,v,s],i)=>(
              <div key={i} className="kpi-card" style={{padding:"14px 14px", minWidth:0}}>
                <div className="k">{k}</div>
                <div className="v" style={{marginTop:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{v}</div>
                <div style={{fontSize:11, color:"var(--fg-3)", marginTop:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{s}</div>
              </div>
            ))}
          </div>

          <div className="section-h">
            <h3>Últimos orçamentos</h3>
            <span className="auth-link" style={{fontSize:13}}>Ver todos →</span>
          </div>
          <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, overflow:"hidden"}}>
            <table style={{width:"100%", borderCollapse:"separate", borderSpacing:0, fontSize:13}}>
              <thead>
                <tr style={{background:"var(--slate-50)"}}>
                  {["Nº","Título","Status","Valor","Criado em",""].map((h,i)=>(
                    <th key={i} style={{textAlign: i===3?"right":"left", padding:"10px 14px", fontSize:11, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.04em", fontWeight:500, borderBottom:"1px solid var(--border-1)"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["#248","Reforma elétrica completa", ["b-warn","Pendente"], "R$ 4.480,00", "08/05"],
                  ["#231","Troca de quadro trifásico", ["b-ok","Aprovado"], "R$ 1.890,00", "02/04"],
                  ["#205","Manutenção preventiva", ["b-ok","Aprovado"], "R$ 980,00", "15/02"],
                  ["#188","Visita técnica", ["b-slate","Rejeitado"], "R$ 240,00", "08/01"],
                ].map((r,i)=>(
                  <tr key={i}>
                    <td style={{padding:"12px 14px", borderBottom: i<3?"1px solid var(--border-2)":"none", fontFamily:"var(--font-mono)", fontSize:12, color:"var(--fg-3)"}}>{r[0]}</td>
                    <td style={{padding:"12px 14px", borderBottom: i<3?"1px solid var(--border-2)":"none", fontWeight:500}}>{r[1]}</td>
                    <td style={{padding:"12px 14px", borderBottom: i<3?"1px solid var(--border-2)":"none"}}>
                      <span className={"m-badge " + r[2][0]} style={{padding:"4px 9px"}}><span className="dot"/>{r[2][1]}</span>
                    </td>
                    <td style={{padding:"12px 14px", borderBottom: i<3?"1px solid var(--border-2)":"none", fontVariantNumeric:"tabular-nums", fontWeight:600, textAlign:"right"}}>{r[3]}</td>
                    <td style={{padding:"12px 14px", borderBottom: i<3?"1px solid var(--border-2)":"none", color:"var(--fg-3)"}}>{r[4]}</td>
                    <td style={{padding:"12px 14px", borderBottom: i<3?"1px solid var(--border-2)":"none", textAlign:"right"}}>
                      <I name="chev-right" size={16} color="var(--slate-400)"/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-h">
            <h3>Atividade recente</h3>
          </div>
          <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:"6px 18px"}}>
            {[
              ["check-circle","success", "OS #112 finalizada", "Reforma elétrica · assinatura coletada", "há 3 dias"],
              ["pdf","brand", "PDF enviado por WhatsApp", "Orçamento #248", "há 5 dias"],
              ["file","slate", "Orçamento #248 criado", "Total R$ 4.480,00", "há 6 dias"],
              ["credit-card","success", "Pagamento recebido", "R$ 1.890,00 via Pix · OS #109", "12/03"],
            ].map(([ic,tone,t,d,when],i)=>{
              const bgs = { success: "var(--success-bg)", brand: "var(--purple-100)", slate: "var(--slate-100)" };
              const fgs = { success: "var(--success)", brand: "var(--purple-700)", slate: "var(--slate-600)" };
              return (
                <div key={i} style={{display:"flex", gap:14, padding:"14px 0", borderBottom: i<3?"1px solid var(--border-2)":"none"}}>
                  <div style={{width:32, height:32, borderRadius:9, background:bgs[tone], color:fgs[tone], display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                    <I name={ic} size={16}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600, fontSize:14}}>{t}</div>
                    <div style={{fontSize:13, color:"var(--fg-3)"}}>{d}</div>
                  </div>
                  <div style={{fontSize:12, color:"var(--fg-3)", whiteSpace:"nowrap"}}>{when}</div>
                </div>
              );
            })}
          </div>

          <div style={{height:24}}/>
        </div>
      </div>
    </AppShell>
  );
}

Object.assign(window, { WebNewCustomer, WebCustomerDetail });
