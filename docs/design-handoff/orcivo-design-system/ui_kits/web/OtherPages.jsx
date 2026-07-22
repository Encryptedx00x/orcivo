// Catalog / WorkOrders / Agenda / Finance / Settings — keep focused
function Catalog() {
  const [tab, setTab] = React.useState("servicos");
  const all = {
    servicos: [
      { name:"Visita técnica", unit:"un", price:"180.00", on:true },
      { name:"Instalação câmera CFTV 4MP", unit:"un", price:"320.00", on:true },
      { name:"Configuração de DVR", unit:"un", price:"240.00", on:true },
      { name:"Manutenção preventiva", unit:"hora", price:"120.00", on:false },
    ],
    produtos: [
      { name:"Câmera Bullet 4MP", unit:"un", price:"450.00", on:true },
      { name:"Cabo coaxial RG-59", unit:"m", price:"4.20", on:true },
      { name:"DVR 8 canais", unit:"un", price:"890.00", on:true },
    ],
    mao: [
      { name:"Hora técnica", unit:"hora", price:"120.00", on:true },
    ],
  };
  const rows = all[tab];
  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Catálogo</h1><div className="desc">Serviços, produtos e mão de obra</div></div>
        <button className="btn btn-primary"><Icon name="plus" size={16}/>Novo item</button>
      </div>
      <div className="tabs">
        {[["servicos","Serviços"],["produtos","Produtos"],["mao","Mão de obra"]].map(([id,l])=>(
          <div key={id} className={"tab"+(tab===id?" active":"")} onClick={()=>setTab(id)}>{l}</div>
        ))}
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <table className="table">
          <thead><tr><th>Nome</th><th>Unidade</th><th className="num">Preço</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={i}>
              <td><b style={{fontWeight:600}}>{r.name}</b></td>
              <td className="muted">{r.unit}</td>
              <td className="num money">{fmtMoney(r.price)}</td>
              <td><span className={"badge "+(r.on?"success":"slate")}><span className="dot"></span>{r.on?"Ativo":"Inativo"}</span></td>
              <td><Icon name="chev" size={16} color="#94A3B8"/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
window.Catalog = Catalog;

function WorkOrders() {
  const rows = [
    { n:"#312", cust:"Marcos Pereira", tech:"João R.", status:"in_progress", date:"Hoje 09:00" },
    { n:"#318", cust:"Ana Souza", tech:"Téc. Carlos", status:"scheduled", date:"Amanhã 14:00" },
    { n:"#311", cust:"Padaria Quatro Cantos", tech:"Téc. Marcos", status:"finished", date:"Ontem" },
    { n:"#310", cust:"Roberta Lima", tech:"João R.", status:"open", date:"Sem data" },
    { n:"#308", cust:"Luiz Henrique", tech:"Téc. Carlos", status:"waiting_parts", date:"05/05" },
  ];
  const sm = {
    open:{cls:"info",label:"Aberta"}, scheduled:{cls:"brand",label:"Agendada"},
    in_progress:{cls:"warning",label:"Em execução"}, waiting_parts:{cls:"warning",label:"Aguardando material"},
    finished:{cls:"success",label:"Finalizada"}, cancelled:{cls:"danger",label:"Cancelada"},
  };
  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Ordens de Serviço</h1><div className="desc">{rows.length} em andamento</div></div>
        <button className="btn btn-primary"><Icon name="plus" size={16}/>Nova OS</button>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <table className="table">
          <thead><tr><th>Número</th><th>Cliente</th><th>Técnico</th><th>Status</th><th>Agendada para</th><th></th></tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={i}>
              <td style={{fontFamily:"var(--font-mono)", fontWeight:600}}>{r.n}</td>
              <td><b style={{fontWeight:600}}>{r.cust}</b></td>
              <td>{r.tech}</td>
              <td><span className={"badge "+sm[r.status].cls}><span className="dot"></span>{sm[r.status].label}</span></td>
              <td className="muted">{r.date}</td>
              <td><Icon name="chev" size={16} color="#94A3B8"/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
window.WorkOrders = WorkOrders;

function Agenda() {
  const days = ["seg 12","ter 13","qua 14","qui 15","sex 16","sáb 17","dom 18"];
  const hours = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
  const evts = [
    { d:0, h:1, title:"Visita CFTV", tag:"OS #312", cls:"brand", span:1 },
    { d:0, h:6, title:"Orçamento presencial", tag:"ORÇ #248", cls:"warning", span:1 },
    { d:2, h:2, title:"Instalação portão", tag:"OS #318", cls:"brand", span:2 },
    { d:3, h:4, title:"Reunião equipe", tag:"Interno", cls:"slate", span:1 },
    { d:4, h:1, title:"Manutenção preventiva", tag:"OS #305", cls:"success", span:2 },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Agenda</h1><div className="desc">Semana de 12 a 18 de maio</div></div>
        <div className="row-flex">
          <div className="btn btn-outline">Mês</div><div className="btn btn-secondary">Semana</div><div className="btn btn-outline">Dia</div>
          <button className="btn btn-primary"><Icon name="plus" size={16}/>Novo compromisso</button>
        </div>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{display:"grid", gridTemplateColumns:"60px repeat(7, 1fr)", borderBottom:"1px solid var(--border-1)", background:"var(--slate-50)"}}>
          <div></div>
          {days.map((d,i)=>(<div key={i} style={{padding:"10px 12px", fontSize:12, fontWeight:600, color:"var(--fg-2)", textTransform:"uppercase", letterSpacing:".04em"}}>{d}</div>))}
        </div>
        {hours.map((h,hi)=>(
          <div key={hi} style={{display:"grid", gridTemplateColumns:"60px repeat(7, 1fr)", borderBottom:"1px solid var(--border-2)", minHeight:48}}>
            <div style={{padding:"6px 8px", fontSize:11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>{h}</div>
            {days.map((_,di)=>{
              const e = evts.find(x=>x.d===di && x.h===hi);
              return (
                <div key={di} style={{borderLeft:"1px solid var(--border-2)", padding:4, position:"relative"}}>
                  {e && (
                    <div style={{padding:"6px 8px", borderRadius:8, background:"var(--purple-50)", borderLeft:"3px solid var(--purple-600)", height:48*e.span - 8}}>
                      <div style={{fontSize:12, fontWeight:600, color:"var(--ink)"}}>{e.title}</div>
                      <div style={{fontSize:11, color:"var(--fg-3)"}}>{e.tag}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
window.Agenda = Agenda;

function Finance() {
  const rows = [
    { cust:"Marcos Pereira", origin:"OS #311", value:"890.00", method:"Pix", status:"paid", due:"05/05", paid:"05/05" },
    { cust:"Construtora Vila Nova", origin:"OS #305", value:"3210.00", method:"Boleto", status:"paid", due:"02/05", paid:"03/05" },
    { cust:"Ana Souza", origin:"ORÇ #244", value:"880.00", method:"Pix", status:"overdue", due:"28/04", paid:"—" },
    { cust:"Luiz Henrique", origin:"OS #298", value:"1240.00", method:"Cartão", status:"partial", due:"20/05", paid:"50%" },
    { cust:"Padaria Quatro Cantos", origin:"OS #295", value:"480.00", method:"Pix", status:"pending", due:"18/05", paid:"—" },
  ];
  const sm = { paid:{cls:"success",label:"Recebido"}, pending:{cls:"warning",label:"Pendente"}, overdue:{cls:"danger",label:"Vencido"}, partial:{cls:"info",label:"Parcial"} };
  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Financeiro</h1><div className="desc">Maio · 2026</div></div>
        <div className="row-flex">
          <button className="btn btn-outline">Exportar</button>
          <button className="btn btn-primary"><Icon name="plus" size={16}/>Registrar recebimento</button>
        </div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:18}}>
        {[
          {label:"Recebido no período", v:fmtMoney("12480"), s:"17 recebimentos"},
          {label:"Pendente",            v:fmtMoney("3250"),  s:"5 em aberto"},
          {label:"Vencido",             v:fmtMoney("880"),   s:"2 recebimentos"},
          {label:"Ticket médio",        v:fmtMoney("734"),   s:"+8% vs mês anterior"},
        ].map((m,i)=>(
          <div key={i} className="card"><div className="card-body metric">
            <div className="label">{m.label}</div><div className="value">{m.v}</div><div className="sub">{m.s}</div>
          </div></div>
        ))}
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <table className="table">
          <thead><tr><th>Cliente</th><th>Origem</th><th className="num">Valor</th><th>Método</th><th>Status</th><th>Vencimento</th><th>Pago em</th></tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={i}>
              <td><b style={{fontWeight:600}}>{r.cust}</b></td>
              <td className="muted">{r.origin}</td>
              <td className="num money">{fmtMoney(r.value)}</td>
              <td className="muted">{r.method}</td>
              <td><span className={"badge "+sm[r.status].cls}><span className="dot"></span>{sm[r.status].label}</span></td>
              <td className="muted">{r.due}</td>
              <td className="muted">{r.paid}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
window.Finance = Finance;

function Settings() {
  return (
    <div className="page">
      <div className="page-header"><div><h1>Configurações</h1><div className="desc">Empresa, marca e plano</div></div></div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div className="card"><div className="card-body">
          <h3>Empresa</h3>
          <div style={{display:"grid", gap:10, marginTop:12}}>
            <div><label style={{fontSize:12, color:"var(--fg-2)"}}>Nome fantasia</label><input className="input" defaultValue="Ribeiro Elétrica"/></div>
            <div><label style={{fontSize:12, color:"var(--fg-2)"}}>CNPJ</label><input className="input" defaultValue="12.345.678/0001-90"/></div>
            <div><label style={{fontSize:12, color:"var(--fg-2)"}}>Cidade / UF</label><input className="input" defaultValue="São Paulo / SP"/></div>
          </div>
        </div></div>
        <div className="card"><div className="card-body">
          <h3>Identidade visual</h3>
          <div style={{marginTop:12, padding:14, border:"1px dashed var(--border-1)", borderRadius:10, display:"flex", alignItems:"center", gap:14}}>
            <div style={{width:56, height:56, borderRadius:14, background:"linear-gradient(135deg,#0A0A0F,#6D28D9)"}}/>
            <div><div style={{fontWeight:600}}>Ribeiro Elétrica</div><div style={{fontSize:12, color:"var(--fg-3)"}}>Logo · usado em PDFs e link público</div></div>
            <button className="btn btn-outline" style={{marginLeft:"auto"}}>Trocar</button>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12}}>
            <div><label style={{fontSize:12, color:"var(--fg-2)"}}>Cor da marca</label><input className="input" defaultValue="#6D28D9"/></div>
            <div><label style={{fontSize:12, color:"var(--fg-2)"}}>Chave Pix</label><input className="input" defaultValue="12.345.678/0001-90"/></div>
          </div>
        </div></div>
        <div className="card" style={{gridColumn:"1 / -1"}}><div className="card-body">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div><h3>Plano Orcivo Mais</h3><div className="muted" style={{fontSize:13, marginTop:4}}>Próxima cobrança em 28/05 · conforme o plano</div></div>
            <div className="row-flex">
              <button className="btn btn-outline">Mudar plano</button>
              <button className="btn btn-primary">Regularizar</button>
            </div>
          </div>
        </div></div>
      </div>
    </div>
  );
}
window.Settings = Settings;
