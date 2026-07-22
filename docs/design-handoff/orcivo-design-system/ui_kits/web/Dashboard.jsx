function Dashboard({ onNav }) {
  const metrics = [
    { label: "Orçamentos pendentes", value: "8", sub: "2 vencem em 7 dias" },
    { label: "OS em execução", value: "3", sub: "1 aguardando material" },
    { label: "Compromissos hoje", value: "5", sub: "2 atribuídos a você" },
    { label: "Recebido no mês", value: fmtMoney("12480"), sub: "17 recebimentos", money: true },
  ];
  const upcoming = [
    { time: "09:00", title: "Visita técnica — CFTV", who: "Marcos Pereira", tag: "OS #312" },
    { time: "11:30", title: "Instalação portão eletrônico", who: "Ana Souza", tag: "OS #318" },
    { time: "14:00", title: "Orçamento presencial", who: "Construtora Vila Nova", tag: "ORÇ #248" },
    { time: "16:00", title: "Retorno cliente", who: "Luiz Henrique", tag: "Cliente" },
  ];
  const activity = [
    { who: "Marcos Pereira", what: "aprovou o orçamento", target: "#248", when: "há 2h", intent: "success" },
    { who: "Você", what: "criou a OS", target: "#318", when: "há 4h", intent: "brand" },
    { who: "Téc. Carlos", what: "finalizou a OS", target: "#311", when: "ontem", intent: "success" },
    { who: "Ana Souza", what: "rejeitou o orçamento", target: "#244", when: "ontem", intent: "danger" },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Bom dia, João</h1>
          <div className="desc">Aqui está o resumo da sua operação hoje.</div>
        </div>
        <div className="row-flex">
          <button className="btn btn-outline"><Icon name="plus" size={16} />Novo cliente</button>
          <button className="btn btn-primary" onClick={() => onNav("quote-new")}><Icon name="plus" size={16} />Novo orçamento</button>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:20}}>
        {metrics.map((m,i) => (
          <div key={i} className="card"><div className="card-body metric">
            <div className="label">{m.label}</div>
            <div className="value">{m.value}</div>
            <div className="sub">{m.sub}</div>
          </div></div>
        ))}
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16}}>
        <div className="card">
          <div style={{padding:"14px 18px", borderBottom:"1px solid var(--border-2)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div style={{fontWeight:600, fontSize:15}}>Próximos compromissos</div>
            <a style={{fontSize:13, color:"var(--purple-700)"}} onClick={()=>onNav("agenda")}>Ver agenda</a>
          </div>
          {upcoming.map((u,i) => (
            <div key={i} style={{display:"flex", alignItems:"center", gap:14, padding:"12px 18px", borderBottom: i<upcoming.length-1 ? "1px solid var(--border-2)" : 0}}>
              <div style={{width:54, fontFamily:"var(--font-mono)", fontWeight:600, color:"var(--ink)"}}>{u.time}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600, fontSize:14}}>{u.title}</div>
                <div style={{fontSize:13, color:"var(--fg-3)"}}>{u.who}</div>
              </div>
              <span className="badge slate">{u.tag}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{padding:"14px 18px", borderBottom:"1px solid var(--border-2)", fontWeight:600, fontSize:15}}>Atividades recentes</div>
          {activity.map((a,i) => (
            <div key={i} style={{display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderBottom: i<activity.length-1 ? "1px solid var(--border-2)" : 0}}>
              <span className={"badge "+a.intent}><span className="dot"></span>{a.target}</span>
              <div style={{flex:1, fontSize:13}}>
                <b style={{fontWeight:600}}>{a.who}</b> <span style={{color:"var(--fg-3)"}}>{a.what}</span>
              </div>
              <div style={{fontSize:12, color:"var(--fg-3)"}}>{a.when}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.Dashboard = Dashboard;
