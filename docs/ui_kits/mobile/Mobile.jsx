// Orcivo Mobile UI Kit — all screens in one file
const { useState } = React;

// ---------- shared atoms ----------
function StatusPill({ status }) {
  const m = {
    draft:["b-slate","Rascunho"], pending:["b-warn","Pendente"], approved:["b-ok","Aprovado"],
    rejected:["b-bad","Rejeitado"], expired:["b-slate","Expirado"],
    open:["b-info","Aberta"], scheduled:["b-brand","Agendada"],
    in_progress:["b-warn","Em execução"], finished:["b-ok","Finalizada"],
    paid:["b-ok","Recebido"], overdue:["b-bad","Vencido"], partial:["b-info","Parcial"],
  };
  const [cls,label] = m[status] || ["b-slate", status];
  return <span className={"m-badge "+cls}><span className="dot"/>{label}</span>;
}

function ScreenHeader({ title, back, onBack, right }) {
  return (
    <div className="m-header">
      {back && <div className="iconbtn" onClick={onBack}><Icon name="back" size={20}/></div>}
      <h1>{title}</h1>
      {right || <div className="iconbtn"><Icon name="bell" size={20}/></div>}
    </div>
  );
}

// ---------- Home ----------
function Home({ go }) {
  return (<>
    <ScreenHeader title="Bom dia, João" />
    <div className="m-scroll">
      <div style={{fontSize:13, color:"var(--fg-3)", marginBottom:12}}>Ribeiro Elétrica · PRO</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14}}>
        <div className="m-card m-metric"><div className="lbl">Orçamentos pendentes</div><div className="val">8</div><div className="sub">2 vencem em 7 dias</div></div>
        <div className="m-card m-metric"><div className="lbl">OS em execução</div><div className="val">3</div><div className="sub">1 aguarda material</div></div>
        <div className="m-card m-metric"><div className="lbl">Compromissos hoje</div><div className="val">5</div><div className="sub">2 atribuídos a você</div></div>
        <div className="m-card m-metric"><div className="lbl">Recebido no mês</div><div className="val" style={{color:"var(--success)"}}>{fmtMoney("12480")}</div><div className="sub">17 recebimentos</div></div>
      </div>
      <div className="m-quick">
        <div onClick={()=>go("quote-new")}><Icon name="file" size={22}/><span>Novo orçamento</span></div>
        <div><Icon name="users" size={22}/><span>Novo cliente</span></div>
        <div><Icon name="cal" size={22}/><span>Agendar</span></div>
      </div>
      <div className="m-section-title">Próximos compromissos</div>
      <div className="m-card">
        {[
          {t:"09:00", title:"Visita CFTV", who:"Marcos Pereira", s:"in_progress"},
          {t:"11:30", title:"Instalação portão", who:"Ana Souza", s:"scheduled"},
          {t:"14:00", title:"Orçamento presencial", who:"Construtora Vila Nova", s:"open"},
        ].map((u,i)=>(
          <div key={i} className="m-list-item">
            <div style={{width:48, fontFamily:"var(--font-mono)", fontWeight:600, fontSize:13}}>{u.t}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600, fontSize:14}}>{u.title}</div>
              <div style={{fontSize:13, color:"var(--fg-3)"}}>{u.who}</div>
            </div>
            <StatusPill status={u.s}/>
          </div>
        ))}
      </div>
    </div>
  </>);
}

// ---------- Customers ----------
function Customers() {
  const list = [
    {n:"Marcos Pereira", p:"(11) 98123-4521", c:"São Paulo / SP", t:"há 2 dias", pend:true},
    {n:"Construtora Vila Nova", p:"(11) 4002-8922", c:"Guarulhos / SP", t:"há 1 dia"},
    {n:"Ana Souza", p:"(11) 97744-1188", c:"São Paulo / SP", t:"há 5 dias"},
    {n:"Luiz Henrique", p:"(21) 99887-3300", c:"Rio de Janeiro / RJ", t:"há 8 dias"},
    {n:"Padaria Quatro Cantos", p:"(11) 3221-7788", c:"São Paulo / SP", t:"há 12 dias"},
  ];
  return (<>
    <ScreenHeader title="Clientes"/>
    <div className="m-scroll">
      <div className="m-search" style={{marginBottom:12}}>
        <Icon name="search" size={18} color="#64748B"/><input placeholder="Buscar cliente…"/>
      </div>
      <div className="m-card">
        {list.map((c,i)=>(
          <div key={i} className="m-list-item">
            <div className="m-avatar">{c.n.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600, fontSize:15}}>{c.n}</div>
              <div style={{fontSize:13, color:"var(--fg-3)"}}>{c.p} · {c.c}</div>
              <div style={{fontSize:12, color:"var(--fg-3)", marginTop:2}}>Última atividade {c.t}{c.pend && " · 1 pendência"}</div>
            </div>
            <Icon name="chev" size={18} color="#94A3B8"/>
          </div>
        ))}
      </div>
    </div>
  </>);
}

// ---------- Quotes ----------
function Quotes({ go }) {
  const items = [
    {id:248, cust:"Construtora Vila Nova", s:"pending",  total:"4480",  date:"08/05"},
    {id:247, cust:"Marcos Pereira",        s:"approved", total:"1480",  date:"07/05"},
    {id:246, cust:"Ana Souza",             s:"rejected", total:"2300",  date:"01/05"},
    {id:245, cust:"Padaria Quatro Cantos", s:"draft",    total:"890",   date:"30/04"},
    {id:243, cust:"Roberta Lima",          s:"expired",  total:"760",   date:"15/04"},
  ];
  return (<>
    <ScreenHeader title="Orçamentos"/>
    <div className="m-scroll">
      <div className="m-search" style={{marginBottom:12}}>
        <Icon name="search" size={18} color="#64748B"/><input placeholder="Buscar orçamento…"/>
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        {items.map(q=>(
          <div key={q.id} className="m-card" onClick={()=>go("quote-detail", q)}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:13, color:"var(--fg-3)", fontFamily:"var(--font-mono)", fontWeight:600}}>#{q.id}</div>
                <div style={{fontWeight:600, fontSize:15, marginTop:2}}>{q.cust}</div>
                <div style={{fontSize:12, color:"var(--fg-3)", marginTop:4}}>Criado {q.date}</div>
              </div>
              <StatusPill status={q.s}/>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:10, paddingTop:10, borderTop:"1px solid var(--border-2)"}}>
              <span style={{fontSize:12, color:"var(--fg-3)"}}>Total</span>
              <span className="m-money" style={{fontSize:18}}>{fmtMoney(q.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </>);
}

// ---------- Quote detail ----------
function QuoteDetail({ q, go }) {
  const [status, setStatus] = useState(q?.s || "pending");
  const items = [
    { n:"Visita técnica", qty:1, p:"180.00" },
    { n:"Instalação câmera CFTV 4MP", qty:4, p:"320.00" },
    { n:"Configuração de DVR", qty:1, p:"240.00" },
  ];
  const total = items.reduce((s,i)=>s+i.qty*parseFloat(i.p),0);
  return (<>
    <ScreenHeader title={"Orçamento #"+(q?.id||248)} back onBack={()=>go("quotes")}
      right={<div className="iconbtn"><Icon name="dots" size={20}/></div>}/>
    <div className="m-scroll">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
        <StatusPill status={status}/>
        <span style={{fontSize:12, color:"var(--fg-3)"}}>Validade 15/05</span>
      </div>
      <div className="m-card" style={{marginBottom:12}}>
        <div style={{fontSize:12, color:"var(--fg-3)", fontWeight:500}}>CLIENTE</div>
        <div style={{fontWeight:600, fontSize:15, marginTop:4}}>{q?.cust || "Construtora Vila Nova"}</div>
        <div style={{fontSize:13, color:"var(--fg-3)"}}>(11) 4002-8922 · Guarulhos / SP</div>
        <div className="m-row" style={{marginTop:12, gap:8}}>
          <div className="m-btn m-btn-outline" style={{flex:1, height:40}}><Icon name="phone" size={16}/>Ligar</div>
          <div className="m-btn m-btn-outline" style={{flex:1, height:40, color:"#16A34A"}}><Icon name="msg" size={16}/>WhatsApp</div>
        </div>
      </div>
      <div className="m-card" style={{marginBottom:12}}>
        <div style={{fontSize:12, color:"var(--fg-3)", fontWeight:500, marginBottom:8}}>ITENS</div>
        {items.map((it,i)=>(
          <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom: i<items.length-1?"1px solid var(--border-2)":0}}>
            <div>
              <div style={{fontWeight:600, fontSize:14}}>{it.n}</div>
              <div style={{fontSize:12, color:"var(--fg-3)"}}>{it.qty} × {fmtMoney(it.p)}</div>
            </div>
            <div className="m-money">{fmtMoney(it.qty*parseFloat(it.p))}</div>
          </div>
        ))}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:10, paddingTop:10, borderTop:"1px solid var(--border-1)", fontWeight:700}}>
          <span>Total</span><span className="m-money" style={{fontSize:20}}>{fmtMoney(total)}</span>
        </div>
      </div>
      <div className="m-card" style={{marginBottom:12}}>
        <div className="m-row" style={{gap:8}}>
          <div className="m-btn m-btn-outline" style={{flex:1, height:42}}><Icon name="pdf" size={16}/>PDF</div>
          <div className="m-btn m-btn-outline" style={{flex:1, height:42, color:"#16A34A"}}><Icon name="msg" size={16}/>Enviar</div>
        </div>
      </div>
      {status==="pending" && (
        <div className="m-row" style={{gap:10}}>
          <button className="m-btn m-btn-danger" onClick={()=>setStatus("rejected")}><Icon name="x" size={18} color="#fff"/>Rejeitar</button>
          <button className="m-btn m-btn-success" onClick={()=>setStatus("approved")}><Icon name="check" size={18} color="#fff"/>Aprovar</button>
        </div>
      )}
      {status==="approved" && (
        <div className="m-card" style={{background:"var(--success-bg)", border:"1px solid #BBF7D0"}}>
          <div style={{fontWeight:600, color:"#166534"}}>Orçamento aprovado.</div>
          <div style={{fontSize:13, color:"#166534", marginTop:4}}>A OS #319 foi criada automaticamente. Toque para abrir.</div>
        </div>
      )}
    </div>
  </>);
}

// ---------- Quote wizard ----------
function QuoteWizard({ go }) {
  const [step, setStep] = useState(0);
  const steps = ["Cliente","Itens","Validade","Termos","Revisão"];
  return (<>
    <ScreenHeader title="Novo orçamento" back onBack={()=>go("home")}/>
    <div className="m-step-dots">
      {steps.map((_,i)=><div key={i} className={"m-step-dot"+(i===step?" active":"")}/>)}
    </div>
    <div className="m-scroll" style={{paddingTop:0}}>
      <div style={{fontSize:13, color:"var(--fg-3)", marginBottom:14}}>Etapa {step+1} de {steps.length} · {steps[step]}</div>
      <div className="m-card" style={{marginBottom:14}}>
        {step===0 && (<>
          <label className="m-label">Cliente</label><input className="m-input" defaultValue="Construtora Vila Nova"/>
          <label className="m-label" style={{marginTop:12}}>Contato</label><input className="m-input" defaultValue="Carlos · (11) 4002-8922"/>
          <label className="m-label" style={{marginTop:12}}>Endereço da obra</label><input className="m-input" defaultValue="Rua das Acácias, 248"/>
        </>)}
        {step===1 && (<>
          {[{n:"Visita técnica",p:"180,00"},{n:"Câmera 4MP × 4",p:"1.280,00"}].map((it,i)=>(
            <div key={i} className="m-list-item">
              <div style={{flex:1, fontWeight:600}}>{it.n}</div>
              <div className="m-money">R$ {it.p}</div>
            </div>
          ))}
          <div className="m-btn m-btn-outline" style={{marginTop:12}}><Icon name="plus" size={16}/>Adicionar item</div>
        </>)}
        {step===2 && (<>
          <label className="m-label">Validade do orçamento</label><input className="m-input" defaultValue="15 dias"/>
          <label className="m-label" style={{marginTop:12}}>Desconto (R$)</label><input className="m-input" defaultValue="0,00"/>
        </>)}
        {step===3 && (<>
          <label className="m-label">Termos</label>
          <textarea className="m-input" style={{height:100, padding:12}} defaultValue="50% no início, 50% na entrega. Garantia de 90 dias."/>
        </>)}
        {step===4 && (<>
          <div style={{fontWeight:600, marginBottom:6}}>Construtora Vila Nova</div>
          <div style={{fontSize:13, color:"var(--fg-3)", marginBottom:14}}>2 itens · Validade 15 dias</div>
          <div style={{display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:"1px solid var(--border-1)", fontWeight:700}}>
            <span>Total</span><span className="m-money" style={{fontSize:22}}>{fmtMoney("1460")}</span>
          </div>
        </>)}
      </div>
      <div className="m-row" style={{gap:10}}>
        {step>0 && <button className="m-btn m-btn-outline" onClick={()=>setStep(s=>s-1)}>Voltar</button>}
        {step<4 ? <button className="m-btn m-btn-primary" onClick={()=>setStep(s=>s+1)}>Avançar</button>
                : <button className="m-btn m-btn-primary" onClick={()=>go("home")}><Icon name="pdf" size={16} color="#fff"/>Gerar PDF</button>}
      </div>
    </div>
  </>);
}

// ---------- Agenda ----------
function Agenda() {
  const evts = [
    { t:"09:00 – 10:30", title:"Visita técnica CFTV", who:"Marcos Pereira", tag:"OS #312", s:"in_progress" },
    { t:"11:30 – 12:30", title:"Instalação portão eletrônico", who:"Ana Souza", tag:"OS #318", s:"scheduled" },
    { t:"14:00 – 15:00", title:"Orçamento presencial", who:"Construtora Vila Nova", tag:"ORÇ #248", s:"open" },
    { t:"16:00 – 16:30", title:"Retorno ao cliente", who:"Luiz Henrique", tag:"Cliente" },
  ];
  return (<>
    <ScreenHeader title="Agenda"/>
    <div className="m-scroll">
      <div className="m-row" style={{gap:6, marginBottom:14}}>
        <div className="m-badge b-brand">Hoje</div>
        <div className="m-badge b-slate">Semana</div>
        <div className="m-badge b-slate">Lista</div>
        <div style={{flex:1}}/>
        <span style={{fontSize:13, color:"var(--fg-3)"}}>Ter, 14 de maio</span>
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        {evts.map((e,i)=>(
          <div key={i} className="m-card">
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <div style={{fontSize:13, fontFamily:"var(--font-mono)", fontWeight:600, color:"var(--ink)"}}>{e.t}</div>
              {e.s && <StatusPill status={e.s}/>}
            </div>
            <div style={{fontWeight:600, fontSize:15, marginTop:6}}>{e.title}</div>
            <div style={{fontSize:13, color:"var(--fg-3)"}}>{e.who} · {e.tag}</div>
          </div>
        ))}
      </div>
    </div>
  </>);
}

// ---------- Mais (More) ----------
function More() {
  const groups = [
    { title:"Operação", items:[
      {i:"clip", n:"Ordens de Serviço"},{i:"pkg", n:"Catálogo"},{i:"money", n:"Financeiro"},
    ]},
    { title:"Conta", items:[
      {i:"cog", n:"Configurações"},{i:"users", n:"Usuários e permissões"},{i:"file", n:"Documentos"},
    ]},
  ];
  return (<>
    <ScreenHeader title="Mais"/>
    <div className="m-scroll">
      {groups.map((g,gi)=>(
        <div key={gi} style={{marginBottom:14}}>
          <div className="m-section-title" style={{marginTop:gi===0?0:18}}>{g.title}</div>
          <div className="m-card" style={{padding:0}}>
            {g.items.map((it,i)=>(
              <div key={i} className="m-list-item" style={{padding:"14px 16px", borderBottom: i<g.items.length-1?"1px solid var(--border-2)":0}}>
                <div style={{width:36, height:36, borderRadius:10, background:"var(--purple-50)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--purple-700)"}}>
                  <Icon name={it.i} size={18}/>
                </div>
                <div style={{flex:1, fontWeight:600, fontSize:15}}>{it.n}</div>
                <Icon name="chev" size={18} color="#94A3B8"/>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="m-card" style={{background:"var(--purple-50)", border:"1px solid var(--purple-200)", marginTop:18}}>
        <div style={{fontWeight:600, color:"var(--purple-800)"}}>Plano PRO</div>
        <div style={{fontSize:13, color:"var(--slate-700)", marginTop:4}}>Próxima cobrança em 28/05 · {fmtMoney("89.90")}</div>
        <div className="m-btn m-btn-outline" style={{marginTop:12, height:40}}>Ver detalhes do plano</div>
      </div>
    </div>
  </>);
}

// ---------- Shell ----------
function MobileApp() {
  const [route, setRoute] = useState({ name:"home" });
  const go = (name, data) => setRoute({ name, data });
  const tab = route.name === "quote-detail" ? "quotes"
            : route.name === "quote-new" ? "home" : route.name;

  return (
    <div className="m-app" data-screen-label="Orcivo Mobile App">
      {route.name === "home"         && <Home go={go}/>}
      {route.name === "customers"    && <Customers/>}
      {route.name === "quotes"       && <Quotes go={go}/>}
      {route.name === "quote-detail" && <QuoteDetail q={route.data} go={go}/>}
      {route.name === "quote-new"    && <QuoteWizard go={go}/>}
      {route.name === "agenda"       && <Agenda/>}
      {route.name === "more"         && <More/>}

      {route.name === "home" && <div className="m-fab" onClick={()=>go("quote-new")}><Icon name="plus" size={18} color="#fff"/>Novo orçamento</div>}

      <div className="m-tabbar">
        {[
          ["home","Início","home"],
          ["customers","Clientes","users"],
          ["quotes","Orçamentos","file"],
          ["agenda","Agenda","cal"],
          ["more","Mais","dots"],
        ].map(([id,label,icon])=>(
          <div key={id} className={"m-tab"+(tab===id?" active":"")} onClick={()=>go(id)}>
            <Icon name={icon} size={22}/>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
window.MobileApp = MobileApp;
