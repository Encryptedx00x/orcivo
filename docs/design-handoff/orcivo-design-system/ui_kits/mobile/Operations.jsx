// Orcivo Mobile Operations Screens — hash-routed inside an Android frame
const { useState } = React;

// ----- atoms (reusing existing styles where possible) -----
function Pill({ kind, children }) {
  const m = { slate:"b-slate", warn:"b-warn", ok:"b-ok", bad:"b-bad", info:"b-info", brand:"b-brand" };
  return <span className={"m-badge "+(m[kind]||"b-slate")}><span className="dot"/>{children}</span>;
}
const Row = ({children, ...p}) => <div className="m-row" {...p}>{children}</div>;

function ScreenChrome({ title, sub, back, right, children, scrollPad }) {
  return (<div className="m-app">
    <div className="m-header" style={{paddingTop: 32}}>
      {back && <div className="iconbtn"><Icon name="back" size={20}/></div>}
      <div style={{flex:1}}>
        <h1 style={{fontSize: 20, lineHeight: "24px"}}>{title}</h1>
        {sub && <div style={{fontSize:12, color:"var(--fg-3)", marginTop:2}}>{sub}</div>}
      </div>
      {right ?? <div className="iconbtn"><Icon name="bell" size={20}/></div>}
    </div>
    <div className="m-scroll" style={{paddingBottom: scrollPad||32}}>{children}</div>
  </div>);
}

function ListCard({ leading, title, sub, badge, chev=true }) {
  return (<div className="m-list-item">
    {leading && <div style={{width:36, height:36, borderRadius:10, background:"var(--purple-50)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--purple-700)"}}>{leading}</div>}
    <div style={{flex:1, minWidth:0}}>
      <div style={{fontWeight:600, fontSize:15, color:"var(--ink)"}}>{title}</div>
      {sub && <div style={{fontSize:13, color:"var(--fg-3)", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{sub}</div>}
    </div>
    {badge}
    {chev && <Icon name="chev" size={18} color="#94A3B8"/>}
  </div>);
}

// ============== 1. Operação / Mais ==============
function ScreenMais() {
  const groups = [
    { title:"Operação", items:[
      {i:"clip", n:"Ordens de Serviço", s:"3 em execução · 1 aguardando material", b:<Pill kind="warn">1 alerta</Pill>},
      {i:"pkg", n:"Catálogo", s:"Serviços, produtos e mão de obra"},
      {i:"money", n:"Financeiro", s:"R$ 2.480 pendentes · 1 vencido", b:<Pill kind="bad">1</Pill>},
      {i:"file", n:"Documentos", s:"Orçamentos, OS, recibos, relatórios"},
    ]},
    { title:"Conta", items:[
      {i:"user", n:"Conta", s:"Perfil, segurança e sessão"},
      {i:"cog", n:"Configurações", s:"Empresa, identidade visual, Pix"},
      {i:"users", n:"Usuários e permissões", s:"4 usuários · 1 convite pendente"},
      {i:"help", n:"Ajuda e suporte", s:"Central de ajuda, contato"},
    ]},
  ];
  return (<ScreenChrome title="Operação">
    {groups.map((g,gi)=>(
      <div key={gi} style={{marginBottom:14}}>
        <div className="m-section-title" style={{marginTop:gi===0?0:18}}>{g.title}</div>
        <div className="m-card" style={{padding:"4px 14px"}}>
          {g.items.map((it,i)=>(
            <ListCard key={i} leading={<Icon name={it.i} size={18}/>}
              title={it.n} sub={it.s} badge={it.b}/>
          ))}
        </div>
      </div>
    ))}
    <div className="m-card" style={{background:"linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)", border:0, color:"#fff", marginTop:8}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div style={{fontSize:11, opacity:.7, textTransform:"uppercase", letterSpacing:".06em", fontWeight:600}}>Plano atual</div>
          <div style={{fontSize:18, fontWeight:700, marginTop:2}}>Orcivo Mais</div>
        </div>
        <div className="m-badge" style={{background:"rgba(255,255,255,.18)", color:"#fff"}}><span className="dot"/>Ativo</div>
      </div>
      <div style={{fontSize:13, opacity:.85, marginTop:8}}>Próxima cobrança em 28/05 · conforme o plano</div>
      <div className="m-btn" style={{marginTop:14, height:42, background:"rgba(255,255,255,.16)", color:"#fff"}}>Ver detalhes do plano</div>
    </div>
  </ScreenChrome>);
}

// ============== 2. Ordens de Serviço ==============
function ScreenOSList() {
  const items = [
    { id:1024, t:"Instalação de câmera CFTV", c:"Mercado São João", when:"Hoje · 14:30", s:"in_progress", tech:"João" },
    { id:1023, t:"Manutenção portão eletrônico", c:"Ana Souza", when:"Hoje · 09:00", s:"scheduled", tech:"Marcos" },
    { id:1022, t:"Instalação alarme residencial", c:"Roberta Lima", when:"Aguardando peça", s:"waiting_material", tech:"João" },
    { id:1021, t:"Visita técnica preventiva", c:"Padaria Quatro Cantos", when:"Ontem", s:"finished", tech:"Marcos" },
    { id:1019, t:"Substituição de DVR", c:"Construtora Vila Nova", when:"03/05", s:"finished", tech:"João" },
  ];
  const sm = { open:["info","Aberta"], scheduled:["brand","Agendada"], in_progress:["warn","Em execução"],
    waiting_client:["slate","Aguardando cliente"], waiting_material:["slate","Aguardando material"],
    finished:["ok","Finalizada"], cancelled:["bad","Cancelada"] };
  return (<ScreenChrome title="Ordens de Serviço" sub="42 ativas · 12 deste mês" scrollPad={120}>
    <div className="m-search" style={{marginBottom:12}}>
      <Icon name="search" size={18} color="#64748B"/><input placeholder="Buscar OS, cliente, técnico…"/>
    </div>
    <Row style={{gap:6, marginBottom:14, overflowX:"auto", paddingBottom:4}}>
      {["Todas","Aberta","Agendada","Em execução","Aguard. material","Finalizada"].map((f,i)=>(
        <div key={i} className={"m-badge "+(i===0?"b-brand":"b-slate")} style={{whiteSpace:"nowrap"}}>{f}</div>
      ))}
    </Row>
    <div style={{display:"flex", flexDirection:"column", gap:10}}>
      {items.map(o=>(
        <div key={o.id} className="m-card">
          <Row style={{justifyContent:"space-between", alignItems:"flex-start"}}>
            <div style={{minWidth:0, flex:1}}>
              <div style={{fontSize:12, color:"var(--fg-3)", fontFamily:"var(--font-mono)", fontWeight:600}}>OS #{o.id}</div>
              <div style={{fontWeight:600, fontSize:15, marginTop:3}}>{o.t}</div>
              <div style={{fontSize:13, color:"var(--fg-3)", marginTop:2}}>{o.c}</div>
            </div>
            <Pill kind={sm[o.s][0]}>{sm[o.s][1]}</Pill>
          </Row>
          <Row style={{justifyContent:"space-between", marginTop:10, paddingTop:10, borderTop:"1px solid var(--border-2)", fontSize:12, color:"var(--fg-3)"}}>
            <span><Icon name="cal" size={13} color="#64748B"/> {o.when}</span>
            <span>Técnico · {o.tech}</span>
          </Row>
        </div>
      ))}
    </div>
    <div className="m-fab" style={{position:"absolute"}}><Icon name="plus" size={18} color="#fff"/>Nova OS</div>
  </ScreenChrome>);
}

// ============== 3. Detalhe da OS ==============
function ScreenOSDetail() {
  const [tab, setTab] = useState("resumo");
  const tabs = [["resumo","Resumo"],["execucao","Execução"],["materiais","Materiais"],["fotos","Fotos"],["financ","Financeiro"]];
  return (<ScreenChrome title="OS #1024" sub="Instalação de câmera CFTV"
    back right={<div className="iconbtn"><Icon name="dots" size={20}/></div>} scrollPad={140}>
    <Row style={{justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
      <Pill kind="warn">Em execução</Pill>
      <span style={{fontSize:12, color:"var(--fg-3)"}}>Iniciada hoje · 14:38</span>
    </Row>
    <div style={{display:"flex", gap:6, marginBottom:14, overflowX:"auto"}}>
      {tabs.map(([k,l])=>(
        <div key={k} onClick={()=>setTab(k)}
          className={"m-badge "+(tab===k?"b-brand":"b-slate")} style={{whiteSpace:"nowrap", cursor:"pointer"}}>{l}</div>
      ))}
    </div>

    {tab==="resumo" && (<>
      <div className="m-card" style={{marginBottom:12}}>
        <div style={{fontSize:11, color:"var(--fg-3)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em"}}>Cliente</div>
        <div style={{fontWeight:600, fontSize:15, marginTop:4}}>Mercado São João</div>
        <div style={{fontSize:13, color:"var(--fg-3)"}}>(11) 4002-8922 · Rua das Acácias, 248</div>
        <Row style={{gap:8, marginTop:12}}>
          <div className="m-btn m-btn-outline" style={{flex:1, height:38, fontSize:13}}><Icon name="phone" size={14}/>Ligar</div>
          <div className="m-btn m-btn-outline" style={{flex:1, height:38, fontSize:13, color:"#16A34A"}}><Icon name="msg" size={14}/>WhatsApp</div>
          <div className="m-btn m-btn-outline" style={{flex:1, height:38, fontSize:13}}><Icon name="map" size={14}/>Mapa</div>
        </Row>
      </div>
      <div className="m-card" style={{marginBottom:12}}>
        <div style={{fontSize:11, color:"var(--fg-3)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em"}}>Resumo</div>
        <Row style={{justifyContent:"space-between", marginTop:8, fontSize:14}}><span style={{color:"var(--fg-2)"}}>Origem</span><span style={{fontWeight:600}}>Orçamento #248</span></Row>
        <Row style={{justifyContent:"space-between", marginTop:6, fontSize:14}}><span style={{color:"var(--fg-2)"}}>Técnico</span><span style={{fontWeight:600}}>João Pereira</span></Row>
        <Row style={{justifyContent:"space-between", marginTop:6, fontSize:14}}><span style={{color:"var(--fg-2)"}}>Agendada</span><span style={{fontWeight:600}}>14/05 · 14:30</span></Row>
        <Row style={{justifyContent:"space-between", marginTop:6, fontSize:14}}><span style={{color:"var(--fg-2)"}}>Total</span><span className="m-money" style={{fontSize:15}}>{fmtMoney("1480")}</span></Row>
      </div>
      <div className="m-card" style={{marginBottom:12}}>
        <div style={{fontSize:11, color:"var(--fg-3)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8}}>Histórico</div>
        {[
          ["14:38","Execução iniciada","João Pereira"],
          ["14:21","Técnico chegou ao local","João Pereira"],
          ["08:10","OS agendada para 14/05 14:30","Sistema"],
          ["13/05","OS criada a partir do orçamento #248","Carla"],
        ].map(([t,e,who],i)=>(
          <Row key={i} style={{alignItems:"flex-start", gap:10, padding:"6px 0"}}>
            <div style={{width:48, fontFamily:"var(--font-mono)", fontSize:12, color:"var(--fg-3)", fontWeight:600}}>{t}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:500}}>{e}</div>
              <div style={{fontSize:12, color:"var(--fg-3)"}}>{who}</div>
            </div>
          </Row>
        ))}
      </div>
    </>)}

    {tab==="execucao" && (<>
      <div className="m-card" style={{marginBottom:12}}>
        <div style={{fontSize:14, fontWeight:600}}>Checklist da execução</div>
        {["Chegada no local","Conferência do equipamento","Instalação física","Configuração do DVR","Teste com cliente"].map((s,i)=>(
          <Row key={i} style={{padding:"10px 0", borderBottom:i<4?"1px solid var(--border-2)":0, gap:10}}>
            <div style={{width:22, height:22, borderRadius:6, background:i<2?"var(--purple-600)":"#fff", border:i<2?0:"1.5px solid var(--border-1)", display:"flex", alignItems:"center", justifyContent:"center"}}>
              {i<2 && <Icon name="check" size={14} color="#fff" stroke={3}/>}
            </div>
            <div style={{flex:1, fontSize:14, color:i<2?"var(--fg-3)":"var(--ink)", textDecoration:i<2?"line-through":"none"}}>{s}</div>
          </Row>
        ))}
      </div>
      <button className="m-btn m-btn-outline" style={{marginBottom:10}}><Icon name="cam" size={16}/>Adicionar foto</button>
      <button className="m-btn m-btn-outline"><Icon name="clip" size={16}/>Coletar assinatura</button>
    </>)}

    {tab==="materiais" && (<>
      <div className="m-card" style={{marginBottom:12}}>
        {[
          { n:"Câmera CFTV 4MP", q:"4 un", p:"320,00", used:true },
          { n:"Cabo coaxial 30m", q:"1 rolo", p:"180,00", used:true },
          { n:"DVR 8 canais", q:"1 un", p:"480,00", used:false },
        ].map((m,i,a)=>(
          <Row key={i} style={{padding:"10px 0", borderBottom:i<a.length-1?"1px solid var(--border-2)":0}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600, fontSize:14}}>{m.n}</div>
              <div style={{fontSize:12, color:"var(--fg-3)"}}>{m.q} · R$ {m.p}</div>
            </div>
            <Pill kind={m.used?"ok":"slate"}>{m.used?"Usado":"A usar"}</Pill>
          </Row>
        ))}
      </div>
      <button className="m-btn m-btn-outline"><Icon name="plus" size={16}/>Adicionar material</button>
    </>)}

    {tab==="fotos" && (<>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14}}>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{aspectRatio:"1", background:"linear-gradient(135deg,#F1F5F9,#E2E8F0)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", color:"#94A3B8"}}>
            <Icon name="cam" size={22}/>
          </div>
        ))}
        <div style={{aspectRatio:"1", border:"1.5px dashed var(--border-1)", borderRadius:10, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"var(--purple-700)", gap:2}}>
          <Icon name="plus" size={20}/><span style={{fontSize:11, fontWeight:600}}>Adicionar</span>
        </div>
      </div>
    </>)}

    {tab==="financ" && (<>
      <div className="m-card" style={{marginBottom:12}}>
        <Row style={{justifyContent:"space-between", marginBottom:6}}><span style={{color:"var(--fg-2)"}}>Total da OS</span><span className="m-money">{fmtMoney("1480")}</span></Row>
        <Row style={{justifyContent:"space-between", marginBottom:6}}><span style={{color:"var(--fg-2)"}}>Recebido</span><span className="m-money" style={{color:"var(--success)"}}>{fmtMoney("740")}</span></Row>
        <Row style={{justifyContent:"space-between", paddingTop:8, borderTop:"1px solid var(--border-2)", fontWeight:700}}><span>Pendente</span><span className="m-money">{fmtMoney("740")}</span></Row>
      </div>
      <button className="m-btn m-btn-primary"><Icon name="plus" size={16} color="#fff"/>Registrar recebimento</button>
    </>)}

    <Row style={{gap:10, position:"absolute", left:16, right:16, bottom:18}}>
      <button className="m-btn m-btn-outline" style={{flex:1}}>Pausar</button>
      <button className="m-btn m-btn-success" style={{flex:2}}><Icon name="check" size={18} color="#fff"/>Finalizar OS</button>
    </Row>
  </ScreenChrome>);
}

// ============== 4. Catálogo ==============
function ScreenCatalog() {
  const [tab, setTab] = useState("servicos");
  const items = {
    servicos:[
      {n:"Visita técnica",p:"180,00"},{n:"Instalação câmera CFTV 4MP",p:"320,00"},
      {n:"Configuração de DVR",p:"240,00"},{n:"Instalação portão eletrônico",p:"680,00"},
    ],
    produtos:[
      {n:"Câmera CFTV 4MP",p:"320,00",inactive:false},{n:"DVR 8 canais",p:"480,00"},
      {n:"Cabo coaxial 30m",p:"180,00"},{n:"Fonte 12V 5A",p:"75,00", inactive:true},
    ],
    mao:[{n:"Hora técnica padrão",p:"95,00"},{n:"Hora extra",p:"140,00"}],
    outros:[{n:"Deslocamento até 20km",p:"40,00"}]
  };
  const labels = {servicos:"Serviço",produtos:"Produto",mao:"Mão de obra",outros:"Outros"};
  return (<ScreenChrome title="Catálogo" sub="38 itens ativos" scrollPad={120}>
    <div className="m-search" style={{marginBottom:12}}>
      <Icon name="search" size={18} color="#64748B"/><input placeholder="Buscar no catálogo…"/>
    </div>
    <Row style={{gap:6, marginBottom:14}}>
      {Object.keys(items).map(k=>(
        <div key={k} onClick={()=>setTab(k)}
          className={"m-badge "+(tab===k?"b-brand":"b-slate")} style={{cursor:"pointer"}}>{labels[k]}</div>
      ))}
    </Row>
    <div className="m-card" style={{padding:"4px 14px"}}>
      {items[tab].map((it,i,a)=>(
        <Row key={i} style={{padding:"12px 0", borderBottom: i<a.length-1?"1px solid var(--border-2)":0}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:600, fontSize:15, color: it.inactive?"var(--fg-3)":"var(--ink)"}}>{it.n}</div>
            <div style={{fontSize:12, color:"var(--fg-3)", marginTop:2}}>{labels[tab]} · un</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="m-money" style={{fontSize:15}}>R$ {it.p}</div>
            {it.inactive ? <Pill kind="slate">Inativo</Pill> : <Pill kind="ok">Ativo</Pill>}
          </div>
        </Row>
      ))}
    </div>
    <div className="m-fab" style={{position:"absolute"}}><Icon name="plus" size={18} color="#fff"/>Novo item</div>
  </ScreenChrome>);
}

// ============== 5. Financeiro ==============
function ScreenFinance() {
  return (<ScreenChrome title="Financeiro" sub="Maio · 2026" scrollPad={120}>
    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14}}>
      <div className="m-card m-metric"><div className="lbl">Recebido</div><div className="val" style={{color:"var(--success)"}}>{fmtMoney("12480")}</div><div className="sub">17 recebimentos</div></div>
      <div className="m-card m-metric"><div className="lbl">Pendente</div><div className="val">{fmtMoney("2480")}</div><div className="sub">5 lançamentos</div></div>
      <div className="m-card m-metric" style={{gridColumn:"span 2", borderColor:"#FECACA"}}><div className="lbl" style={{color:"var(--danger)"}}>Vencido</div><div className="val" style={{color:"var(--danger)"}}>{fmtMoney("740")}</div><div className="sub">1 lançamento · OS #1019</div></div>
    </div>
    <Row style={{gap:6, marginBottom:14, overflowX:"auto"}}>
      {["Tudo","Pendente","Recebido","Vencido","Pix","Boleto"].map((f,i)=>(
        <div key={i} className={"m-badge "+(i===0?"b-brand":"b-slate")} style={{whiteSpace:"nowrap"}}>{f}</div>
      ))}
    </Row>
    <div className="m-section-title">Lançamentos recentes</div>
    <div className="m-card" style={{padding:"4px 14px"}}>
      {[
        {c:"Mercado São João", o:"OS #1024", v:"740,00", s:"pending", d:"vence 20/05", m:"Pix"},
        {c:"Ana Souza", o:"ORÇ #247", v:"1.480,00", s:"paid", d:"recebido 10/05", m:"Pix"},
        {c:"Construtora Vila Nova", o:"OS #1019", v:"740,00", s:"overdue", d:"venceu 02/05", m:"Boleto"},
        {c:"Roberta Lima", o:"OS #1018", v:"320,00", s:"partial", d:"50% recebido", m:"Dinheiro"},
        {c:"Padaria Quatro Cantos", o:"OS #1015", v:"890,00", s:"paid", d:"recebido 03/05", m:"Pix"},
      ].map((r,i,a)=>(
        <Row key={i} style={{padding:"12px 0", borderBottom:i<a.length-1?"1px solid var(--border-2)":0, alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:600, fontSize:14}}>{r.c}</div>
            <div style={{fontSize:12, color:"var(--fg-3)", marginTop:2}}>{r.o} · {r.m} · {r.d}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="m-money" style={{fontSize:15}}>R$ {r.v}</div>
            <Pill kind={{pending:"warn",paid:"ok",overdue:"bad",partial:"info"}[r.s]}>
              {{pending:"Pendente",paid:"Recebido",overdue:"Vencido",partial:"Parcial"}[r.s]}
            </Pill>
          </div>
        </Row>
      ))}
    </div>
    <div className="m-fab" style={{position:"absolute"}}><Icon name="plus" size={18} color="#fff"/>Registrar recebimento</div>
  </ScreenChrome>);
}

// ============== 6. Documentos ==============
function ScreenDocs() {
  const [tab, setTab] = useState("Orçamentos");
  const tabs = ["Orçamentos","OS","Recibos","Relatórios","Contratos"];
  return (<ScreenChrome title="Documentos" sub="124 documentos">
    <Row style={{gap:6, marginBottom:14, overflowX:"auto"}}>
      {tabs.map(t=>(<div key={t} onClick={()=>setTab(t)}
        className={"m-badge "+(t===tab?"b-brand":"b-slate")} style={{whiteSpace:"nowrap", cursor:"pointer"}}>{t}</div>))}
    </Row>
    <div className="m-card" style={{padding:"4px 14px"}}>
      {[
        { n:"Orçamento #2031", c:"Ana Martins", d:"10/05 · 14h", s:"sent" },
        { n:"Orçamento #2030", c:"Mercado São João", d:"09/05 · 09h", s:"draft" },
        { n:"Orçamento #2029", c:"Construtora Vila Nova", d:"08/05 · 17h", s:"sent" },
        { n:"Orçamento #2028", c:"Padaria Quatro Cantos", d:"05/05 · 11h", s:"sent" },
      ].map((d,i,a)=>(
        <Row key={i} style={{padding:"12px 0", borderBottom:i<a.length-1?"1px solid var(--border-2)":0}}>
          <div style={{width:36, height:44, borderRadius:6, background:"linear-gradient(180deg,#FEE2E2,#FECACA)", display:"flex", alignItems:"center", justifyContent:"center", color:"#991B1B", fontWeight:700, fontSize:10}}>PDF</div>
          <div style={{flex:1, marginLeft:12, minWidth:0}}>
            <div style={{fontWeight:600, fontSize:14}}>{d.n}</div>
            <div style={{fontSize:12, color:"var(--fg-3)", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{d.c} · {d.d}</div>
          </div>
          <Icon name="dots" size={18} color="#94A3B8"/>
        </Row>
      ))}
    </div>
    <Row style={{gap:8, marginTop:14}}>
      <button className="m-btn m-btn-outline" style={{flex:1, height:42}}><Icon name="pdf" size={16}/>Visualizar</button>
      <button className="m-btn m-btn-outline" style={{flex:1, height:42}}><Icon name="msg" size={16}/>Compartilhar</button>
    </Row>
  </ScreenChrome>);
}

// ============== 7. Conta ==============
function ScreenAccount() {
  return (<ScreenChrome title="Conta" back>
    <div className="m-card" style={{marginBottom:14, textAlign:"center", padding:"22px 16px"}}>
      <div className="m-avatar" style={{width:76, height:76, fontSize:24, margin:"0 auto"}}>JP</div>
      <div style={{fontWeight:700, fontSize:18, marginTop:12}}>João Pereira</div>
      <div style={{fontSize:13, color:"var(--fg-3)"}}>joao.pereira@orcivo.com.br</div>
      <Row style={{justifyContent:"center", gap:6, marginTop:8}}><Pill kind="brand">Administrador</Pill><Pill kind="ok">Verificado</Pill></Row>
    </div>
    <div className="m-section-title">Perfil</div>
    <div className="m-card" style={{padding:"4px 14px", marginBottom:14}}>
      {[["Nome","João Pereira"],["Email","joao.pereira@orcivo.com.br"],["Telefone","(11) 98123-4521"],["Empresa atual","Ribeiro Elétrica"]].map(([k,v],i,a)=>(
        <Row key={i} style={{padding:"12px 0", borderBottom:i<a.length-1?"1px solid var(--border-2)":0}}>
          <div style={{flex:1}}><div style={{fontSize:12, color:"var(--fg-3)"}}>{k}</div><div style={{fontSize:14, fontWeight:500, marginTop:2}}>{v}</div></div>
          <Icon name="chev" size={18} color="#94A3B8"/>
        </Row>
      ))}
    </div>
    <div className="m-section-title">Segurança</div>
    <div className="m-card" style={{padding:"4px 14px", marginBottom:14}}>
      <ListCard leading={<Icon name="lock" size={18}/>} title="Alterar senha" sub="Última alteração há 2 meses"/>
      <ListCard leading={<Icon name="shield" size={18}/>} title="Autenticação em 2 fatores" sub="Ativa via SMS" badge={<Pill kind="ok">Ativada</Pill>} chev={false}/>
      <ListCard leading={<Icon name="user" size={18}/>} title="Sessões ativas" sub="2 dispositivos"/>
    </div>
    <button className="m-btn m-btn-outline" style={{color:"var(--danger)", borderColor:"#FECACA"}}>
      <Icon name="back" size={16} color="currentColor"/>Sair da conta
    </button>
  </ScreenChrome>);
}

// ============== 8. Configurações ==============
function ScreenSettings() {
  const groups = [
    { title:"Empresa", items:[
      {i:"building", n:"Dados da empresa", s:"Ribeiro Elétrica · CNPJ 12.345.678/0001-90"},
      {i:"image", n:"Identidade visual", s:"Logo, cor principal e dados no PDF"},
      {i:"money", n:"Chave Pix", s:"CNPJ · 12.345.678/0001-90"},
    ]},
    { title:"Preferências", items:[
      {i:"bell", n:"Notificações", s:"Push, email e WhatsApp"},
      {i:"file", n:"Exportação de dados", s:"Excel, CSV, PDF"},
      {i:"help", n:"Suporte", s:"Central de ajuda · contato@orcivo.com"},
    ]},
  ];
  return (<ScreenChrome title="Configurações" back>
    {groups.map((g,gi)=>(
      <div key={gi} style={{marginBottom:14}}>
        <div className="m-section-title" style={{marginTop:gi===0?0:18}}>{g.title}</div>
        <div className="m-card" style={{padding:"4px 14px"}}>
          {g.items.map((it,i)=>(<ListCard key={i} leading={<Icon name={it.i} size={18}/>} title={it.n} sub={it.s}/>))}
        </div>
      </div>
    ))}
    <div className="m-section-title">Identidade no documento</div>
    <div className="m-card">
      <div style={{display:"flex", gap:14, alignItems:"center"}}>
        <div style={{width:64, height:64, borderRadius:12, background:"var(--purple-50)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--purple-700)", fontWeight:700, fontSize:22}}>RE</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:600}}>Ribeiro Elétrica</div>
          <div style={{fontSize:12, color:"var(--fg-3)"}}>Mostrado no topo dos PDFs</div>
          <button className="m-btn m-btn-outline" style={{height:32, fontSize:12, marginTop:8, width:"auto", padding:"0 12px"}}>Trocar logo</button>
        </div>
      </div>
      <div style={{marginTop:14, paddingTop:14, borderTop:"1px solid var(--border-2)"}}>
        <div style={{fontSize:12, color:"var(--fg-3)", fontWeight:500, marginBottom:8}}>Cor principal</div>
        <Row style={{gap:10}}>
          {["#6D28D9","#0F172A","#16A34A","#DC2626","#0891B2"].map((c,i)=>(
            <div key={i} style={{width:36, height:36, borderRadius:10, background:c, border:i===0?"3px solid #fff":"0", boxShadow:i===0?"0 0 0 2px var(--purple-600)":"inset 0 0 0 1px rgba(0,0,0,.06)"}}/>
          ))}
        </Row>
      </div>
    </div>
  </ScreenChrome>);
}

// ============== 9. Usuários e permissões ==============
function ScreenUsers() {
  const users = [
    { n:"João Pereira", e:"joao@ribeiro.com", r:"Administrador", s:"active", last:"agora", you:true },
    { n:"Marcos Silva", e:"marcos@ribeiro.com", r:"Técnico", s:"active", last:"há 1h" },
    { n:"Carla Lima", e:"carla@ribeiro.com", r:"Operação", s:"active", last:"há 3h" },
    { n:"Rafael Costa", e:"rafael@ribeiro.com", r:"Técnico", s:"invited", last:"convidado 12/05" },
    { n:"Ana Maria", e:"ana@ribeiro.com", r:"Operação", s:"inactive", last:"há 2 meses" },
  ];
  const sm = { active:["ok","Ativo"], invited:["info","Convite pendente"], inactive:["slate","Inativo"] };
  return (<ScreenChrome title="Usuários e permissões" sub="4 ativos · 1 pendente" back scrollPad={120}>
    <button className="m-btn m-btn-primary" style={{marginBottom:14}}><Icon name="plus" size={16} color="#fff"/>Convidar usuário</button>
    <div className="m-card" style={{padding:"4px 14px", marginBottom:14}}>
      {users.map((u,i,a)=>(
        <Row key={i} style={{padding:"12px 0", borderBottom:i<a.length-1?"1px solid var(--border-2)":0}}>
          <div className="m-avatar">{u.n.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
          <div style={{flex:1, marginLeft:12, minWidth:0}}>
            <Row style={{gap:6}}>
              <span style={{fontWeight:600, fontSize:14}}>{u.n}</span>
              {u.you && <Pill kind="brand">você</Pill>}
            </Row>
            <div style={{fontSize:12, color:"var(--fg-3)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{u.r} · {u.last}</div>
          </div>
          <Pill kind={sm[u.s][0]}>{sm[u.s][1]}</Pill>
        </Row>
      ))}
    </div>
    <div className="m-section-title">Permissões — Técnico</div>
    <div className="m-card" style={{padding:"4px 14px"}}>
      {[
        ["Clientes","Ver clientes atribuídos",true],
        ["Orçamentos","Criar e editar",true],
        ["Ordens de Serviço","Executar OS atribuídas",true],
        ["Financeiro","Apenas leitura",false],
        ["Catálogo","Apenas leitura",true],
        ["Agenda","Ver agenda da empresa",true],
        ["Administração","Acesso bloqueado",false],
      ].map(([t,s,on],i,a)=>(
        <Row key={i} style={{padding:"12px 0", borderBottom:i<a.length-1?"1px solid var(--border-2)":0}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:600, fontSize:14}}>{t}</div>
            <div style={{fontSize:12, color:"var(--fg-3)"}}>{s}</div>
          </div>
          <div style={{width:44, height:26, borderRadius:13, background:on?"var(--purple-600)":"#CBD5E1", position:"relative", flexShrink:0}}>
            <div style={{position:"absolute", top:3, left:on?21:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .2s"}}/>
          </div>
        </Row>
      ))}
    </div>
  </ScreenChrome>);
}

// ============== 10. Plano e assinatura ==============
function ScreenPlan() {
  return (<ScreenChrome title="Plano e assinatura" back>
    <div className="m-card" style={{background:"linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)", border:0, color:"#fff", marginBottom:14}}>
      <Row style={{justifyContent:"space-between", alignItems:"center"}}>
        <div style={{fontSize:11, opacity:.7, textTransform:"uppercase", letterSpacing:".06em", fontWeight:600}}>Plano atual</div>
        <div className="m-badge" style={{background:"rgba(255,255,255,.18)", color:"#fff"}}><span className="dot"/>Ativo</div>
      </Row>
      <div style={{fontSize:28, fontWeight:700, marginTop:8, letterSpacing:"-0.02em"}}>Orcivo PRO</div>
      <div style={{fontSize:13, opacity:.85, marginTop:4}}>Próxima cobrança em 28/05 · {fmtMoney("89.90")}/mês</div>
      <div style={{height:1, background:"rgba(255,255,255,.2)", margin:"14px 0"}}/>
      <Row style={{justifyContent:"space-between", fontSize:13}}>
        <div><div style={{opacity:.7}}>Usuários</div><div style={{fontWeight:600, marginTop:2}}>4 / 10</div></div>
        <div><div style={{opacity:.7}}>OS no mês</div><div style={{fontWeight:600, marginTop:2}}>42 / ilim.</div></div>
        <div><div style={{opacity:.7}}>Armaz.</div><div style={{fontWeight:600, marginTop:2}}>1.2 / 20 GB</div></div>
      </Row>
    </div>
    <Row style={{gap:8, marginBottom:14}}>
      <button className="m-btn m-btn-outline" style={{flex:1, height:42, fontSize:13}}>Alterar plano</button>
      <button className="m-btn m-btn-outline" style={{flex:1, height:42, fontSize:13}}>Histórico</button>
    </Row>
    <div className="m-card" style={{marginBottom:14, background:"#FFFBEB", borderColor:"#FDE68A"}}>
      <Row style={{gap:10, alignItems:"flex-start"}}>
        <Icon name="info" size={18} color="#92400E"/>
        <div style={{flex:1, fontSize:13, color:"#92400E", lineHeight:1.45}}>
          Sua assinatura é gerenciada pelo painel da sua conta. Acesse o painel para regularizar ou alterar seu plano.
        </div>
      </Row>
    </div>
    <div className="m-section-title">Pagamentos recentes</div>
    <div className="m-card" style={{padding:"4px 14px"}}>
      {[
        {d:"28/04",v:"89,90",s:"paid"},{d:"28/03",v:"89,90",s:"paid"},
        {d:"28/02",v:"89,90",s:"paid"},{d:"28/01",v:"89,90",s:"paid"},
      ].map((p,i,a)=>(
        <Row key={i} style={{padding:"12px 0", borderBottom:i<a.length-1?"1px solid var(--border-2)":0}}>
          <div style={{width:36, height:36, borderRadius:9, background:"var(--success-bg)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--success)"}}><Icon name="check" size={18}/></div>
          <div style={{flex:1, marginLeft:12}}>
            <div style={{fontWeight:600, fontSize:14}}>Orcivo PRO · mensal</div>
            <div style={{fontSize:12, color:"var(--fg-3)"}}>Pago em {p.d}</div>
          </div>
          <span className="m-money">R$ {p.v}</span>
        </Row>
      ))}
    </div>
  </ScreenChrome>);
}

// ----- router -----
const MOBILE_SCREENS = {
  mais:        ["Operação", ScreenMais],
  os:          ["Ordens de Serviço", ScreenOSList],
  "os-detail": ["Detalhe da OS", ScreenOSDetail],
  catalog:     ["Catálogo", ScreenCatalog],
  finance:     ["Financeiro", ScreenFinance],
  docs:        ["Documentos", ScreenDocs],
  account:     ["Conta", ScreenAccount],
  settings:    ["Configurações", ScreenSettings],
  users:       ["Usuários", ScreenUsers],
  plan:        ["Plano", ScreenPlan],
};
window.MOBILE_SCREENS = MOBILE_SCREENS;
