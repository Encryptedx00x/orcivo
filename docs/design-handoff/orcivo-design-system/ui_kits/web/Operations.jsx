// Orcivo Web Operations — all 9 screens, hash-routed
const { useState } = React;

const Pill = ({k, children}) => <span className={"badge "+(k||"slate")}><span className="dot"/>{children}</span>;
const SM_OS = { open:["info","Aberta"], scheduled:["brand","Agendada"], in_progress:["warning","Em execução"], waiting_client:["slate","Aguard. cliente"], waiting_material:["slate","Aguard. material"], finished:["success","Finalizada"], cancelled:["danger","Cancelada"] };
const SM_FIN = { pending:["warning","Pendente"], paid:["success","Recebido"], overdue:["danger","Vencido"], partial:["info","Parcial"] };

// ============== DASHBOARD OPERACIONAL ==============
function WDashboard() {
  return (<>
    <div className="page-header">
      <div><h1>Bom dia, João</h1><div className="desc">Ter, 14 de maio · Ribeiro Elétrica · PRO</div></div>
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-outline">Hoje</button>
        <button className="btn btn-primary"><Icon name="plus" size={16} color="#fff"/>Ação rápida</button>
      </div>
    </div>
    <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:20}}>
      {[
        ["Agenda hoje","5","2 em execução","brand"],
        ["OS pendentes","12","3 aguard. material","warning"],
        ["Orçamentos pendentes","8","2 vencem em 7 dias","info"],
        ["Recebimentos pendentes",fmtMoney("2480"),"1 vencido", "danger"],
      ].map(([l,v,s,c],i)=>(
        <div key={i} className="card card-body">
          <div style={{fontSize:11, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em", fontWeight:500}}>{l}</div>
          <div style={{fontSize:28, fontWeight:700, marginTop:4, letterSpacing:"-0.02em", color: c==="danger"?"var(--danger)":"var(--ink)"}}>{v}</div>
          <Pill k={c}>{s}</Pill>
        </div>
      ))}
    </div>

    <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16}}>
      <div className="card">
        <div style={{padding:"14px 18px", borderBottom:"1px solid var(--border-2)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h3 style={{margin:0, fontSize:15}}>Agenda de hoje</h3>
          <a style={{color:"var(--purple-700)", fontSize:13, fontWeight:500}}>Ver tudo →</a>
        </div>
        <div>
          {[
            ["09:00","Visita CFTV","Mercado São João","João Pereira","in_progress"],
            ["11:30","Instalação portão","Ana Souza","Marcos Silva","scheduled"],
            ["14:00","Orçamento presencial","Construtora Vila Nova","João Pereira","open"],
            ["16:00","Retorno cliente","Luiz Henrique","Carla Lima","scheduled"],
          ].map(([t,e,c,w,s],i,a)=>(
            <div key={i} style={{display:"flex", alignItems:"center", gap:14, padding:"12px 18px", borderBottom: i<a.length-1?"1px solid var(--border-2)":0}}>
              <div style={{width:56, fontFamily:"var(--font-mono)", fontWeight:600, fontSize:13}}>{t}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600, fontSize:14}}>{e}</div>
                <div style={{fontSize:12, color:"var(--fg-3)"}}>{c} · {w}</div>
              </div>
              <Pill k={SM_OS[s][0]}>{SM_OS[s][1]}</Pill>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:16}}>
        <div className="card">
          <div style={{padding:"14px 18px", borderBottom:"1px solid var(--border-2)"}}><h3 style={{margin:0, fontSize:15}}>Ações rápidas</h3></div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:0}}>
            {[["users","Novo cliente"],["file","Novo orçamento"],["clip","Nova OS"],["cal","Compromisso"],["money","Recebimento"],["pkg","Item catálogo"]].map(([i,l],x)=>(
              <button key={x} className="btn btn-ghost" style={{height:64, justifyContent:"flex-start", borderRadius:0, padding:"0 18px", borderRight: x%2===0?"1px solid var(--border-2)":0, borderTop: x>1?"1px solid var(--border-2)":0}}>
                <Icon name={i} size={18} color="#6D28D9"/>{l}
              </button>
            ))}
          </div>
        </div>

        <div className="card card-body" style={{background:"#FFFBEB", borderColor:"#FDE68A"}}>
          <div style={{display:"flex", alignItems:"flex-start", gap:10}}>
            <Icon name="info" size={18} color="#92400E"/>
            <div style={{flex:1}}>
              <div style={{fontWeight:600, fontSize:14, color:"#92400E"}}>Plano PRO · 80% dos usuários ativos</div>
              <div style={{fontSize:13, color:"#92400E", marginTop:4}}>4 de 10 usuários. Considere o plano TOP se planeja escalar.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <h3 style={{fontSize:15, margin:"24px 0 12px"}}>Últimas atividades</h3>
    <div className="card">
      {[
        ["14:38","João Pereira iniciou execução da OS #1024","Em execução"],
        ["13:21","Carla Lima criou orçamento #2031 para Ana Martins","Rascunho"],
        ["11:08","Pagamento de R$ 1.480 recebido — Ana Souza · ORÇ #247","Pix"],
        ["10:55","OS #1019 marcada como finalizada por Marcos Silva","Finalizada"],
        ["09:12","Convite enviado para rafael@ribeiro.com","Pendente"],
      ].map(([t,e,b],i,a)=>(
        <div key={i} style={{display:"flex", alignItems:"center", gap:14, padding:"12px 18px", borderBottom:i<a.length-1?"1px solid var(--border-2)":0}}>
          <div style={{fontFamily:"var(--font-mono)", fontSize:12, color:"var(--fg-3)", width:48, fontWeight:600}}>{t}</div>
          <div style={{flex:1, fontSize:13}}>{e}</div>
          <Pill k="slate">{b}</Pill>
        </div>
      ))}
    </div>
  </>);
}

// ============== ORDENS DE SERVIÇO ==============
function WOS() {
  const rows = [
    [1024,"Mercado São João","Instalação câmera CFTV","João Pereira","in_progress","Hoje · 14:30","—","R$ 1.480,00"],
    [1023,"Ana Souza","Manutenção portão","Marcos Silva","scheduled","Hoje · 09:00","—","R$ 680,00"],
    [1022,"Roberta Lima","Instalação alarme","João Pereira","waiting_material","13/05 · 10:00","—","R$ 2.140,00"],
    [1021,"Padaria Quatro Cantos","Visita preventiva","Marcos Silva","finished","13/05 · 15:00","13/05 · 16:20","R$ 320,00"],
    [1020,"Luiz Henrique","Troca de fechadura","Carla Lima","finished","12/05 · 11:00","12/05 · 11:45","R$ 280,00"],
    [1019,"Construtora Vila Nova","Substituição DVR","João Pereira","finished","10/05 · 14:00","10/05 · 17:30","R$ 1.480,00"],
    [1018,"Mercado São João","Reparo elétrico","Marcos Silva","finished","09/05 · 10:00","09/05 · 12:00","R$ 540,00"],
  ];
  return (<>
    <div className="page-header">
      <div><h1>Ordens de Serviço</h1><div className="desc">42 ativas · 12 deste mês</div></div>
      <button className="btn btn-primary"><Icon name="plus" size={16} color="#fff"/>Nova OS</button>
    </div>
    <div className="card" style={{padding:14, marginBottom:14, display:"flex", gap:10, alignItems:"center"}}>
      <div style={{flex:1, height:36, border:"1px solid var(--border-1)", borderRadius:9, padding:"0 12px", display:"flex", alignItems:"center", gap:8, background:"var(--slate-50)"}}>
        <Icon name="search" size={16} color="#64748B"/><input style={{border:0, background:"transparent", outline:0, flex:1, fontSize:14}} placeholder="Buscar OS, cliente, técnico…"/>
      </div>
      <select className="input" style={{width:160, height:36}}><option>Todos os status</option></select>
      <select className="input" style={{width:160, height:36}}><option>Todos os técnicos</option></select>
      <select className="input" style={{width:140, height:36}}><option>Este mês</option></select>
    </div>
    <div className="card" style={{padding:0, overflow:"hidden"}}>
      <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
        <thead><tr style={{background:"var(--slate-50)", textAlign:"left"}}>
          {["Número","Cliente","Serviço","Técnico","Status","Agendada","Finalizada","Total",""].map(h=>(
            <th key={h} style={{padding:"10px 14px", fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em"}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>{rows.map((r,i)=>(
          <tr key={i} style={{borderTop:"1px solid var(--border-2)"}}>
            <td style={{padding:"12px 14px", fontFamily:"var(--font-mono)", fontWeight:600}}>#{r[0]}</td>
            <td style={{padding:"12px 14px", fontWeight:500}}>{r[1]}</td>
            <td style={{padding:"12px 14px", color:"var(--fg-2)"}}>{r[2]}</td>
            <td style={{padding:"12px 14px", color:"var(--fg-2)"}}>{r[3]}</td>
            <td style={{padding:"12px 14px"}}><Pill k={SM_OS[r[4]][0]}>{SM_OS[r[4]][1]}</Pill></td>
            <td style={{padding:"12px 14px", color:"var(--fg-3)", fontFamily:"var(--font-mono)", fontSize:12}}>{r[5]}</td>
            <td style={{padding:"12px 14px", color:"var(--fg-3)", fontFamily:"var(--font-mono)", fontSize:12}}>{r[6]}</td>
            <td style={{padding:"12px 14px", fontWeight:600, fontFamily:"var(--font-mono)"}}>{r[7]}</td>
            <td style={{padding:"12px 14px", textAlign:"right"}}><Icon name="dots" size={16} color="#94A3B8"/></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>);
}

// ============== DETALHE OS ==============
function WOSDetail() {
  return (<>
    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14, fontSize:13, color:"var(--fg-3)"}}>
      <a style={{color:"var(--purple-700)", fontWeight:500}}>Ordens de Serviço</a> / <span>OS #1024</span>
    </div>
    <div className="page-header">
      <div>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:6}}>
          <h1 style={{margin:0}}>OS #1024 · Instalação câmera CFTV</h1>
          <Pill k="warning">Em execução</Pill>
        </div>
        <div className="desc">Iniciada hoje às 14:38 · Técnico: João Pereira</div>
      </div>
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-outline"><Icon name="pdf" size={16}/>Gerar relatório</button>
        <button className="btn btn-outline">Duplicar</button>
        <button className="btn btn-success"><Icon name="check" size={16} color="#fff"/>Finalizar OS</button>
      </div>
    </div>

    <div style={{display:"grid", gridTemplateColumns:"1fr 360px", gap:16}}>
      <div style={{display:"flex", flexDirection:"column", gap:16}}>
        <div className="card">
          <div style={{padding:"14px 18px", borderBottom:"1px solid var(--border-2)"}}><h3 style={{margin:0, fontSize:15}}>Execução</h3></div>
          <div style={{padding:18}}>
            {["Chegada no local","Conferência do equipamento","Instalação física","Configuração do DVR","Teste com cliente"].map((s,i)=>(
              <div key={i} style={{display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: i<4?"1px solid var(--border-2)":0}}>
                <div style={{width:22, height:22, borderRadius:6, background:i<2?"var(--purple-600)":"#fff", border:i<2?0:"1.5px solid var(--border-1)", display:"flex", alignItems:"center", justifyContent:"center"}}>
                  {i<2 && <Icon name="check" size={14} color="#fff" stroke={3}/>}
                </div>
                <div style={{flex:1, fontSize:14, color:i<2?"var(--fg-3)":"var(--ink)", textDecoration:i<2?"line-through":"none"}}>{s}</div>
                <span style={{fontSize:12, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>{i<2?"14:"+(38+i*5):""}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{padding:"14px 18px", borderBottom:"1px solid var(--border-2)", display:"flex", justifyContent:"space-between"}}>
            <h3 style={{margin:0, fontSize:15}}>Materiais usados</h3>
            <button className="btn btn-ghost" style={{height:30, fontSize:13}}><Icon name="plus" size={14}/>Adicionar</button>
          </div>
          <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
            <tbody>{[
              ["Câmera CFTV 4MP","4 un","R$ 320,00","R$ 1.280,00"],
              ["Cabo coaxial 30m","1 rolo","R$ 180,00","R$ 180,00"],
              ["DVR 8 canais","1 un","R$ 480,00","R$ 480,00"],
            ].map((r,i)=>(
              <tr key={i} style={{borderTop:"1px solid var(--border-2)"}}>
                <td style={{padding:"12px 18px", fontWeight:500}}>{r[0]}</td>
                <td style={{padding:"12px 18px", color:"var(--fg-3)"}}>{r[1]}</td>
                <td style={{padding:"12px 18px", color:"var(--fg-3)", textAlign:"right"}}>{r[2]}</td>
                <td style={{padding:"12px 18px", fontWeight:600, fontFamily:"var(--font-mono)", textAlign:"right"}}>{r[3]}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div className="card">
          <div style={{padding:"14px 18px", borderBottom:"1px solid var(--border-2)"}}><h3 style={{margin:0, fontSize:15}}>Fotos</h3></div>
          <div style={{padding:18, display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10}}>
            {[1,2,3,4,5].map(i=>(
              <div key={i} style={{aspectRatio:"1", background:"linear-gradient(135deg,#F1F5F9,#E2E8F0)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", color:"#94A3B8"}}>
                <Icon name="cam" size={22}/>
              </div>
            ))}
            <div style={{aspectRatio:"1", border:"1.5px dashed var(--border-1)", borderRadius:10, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"var(--purple-700)", gap:2}}>
              <Icon name="plus" size={18}/><span style={{fontSize:11, fontWeight:600}}>Adicionar</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:16}}>
        <div className="card card-body">
          <div style={{fontSize:11, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em", fontWeight:600}}>Cliente</div>
          <div style={{fontWeight:600, fontSize:15, marginTop:6}}>Mercado São João</div>
          <div style={{fontSize:13, color:"var(--fg-3)"}}>(11) 4002-8922</div>
          <div style={{fontSize:13, color:"var(--fg-3)"}}>Rua das Acácias, 248 — Guarulhos / SP</div>
          <div style={{display:"flex", gap:6, marginTop:12}}>
            <button className="btn btn-outline" style={{height:32, fontSize:12, flex:1}}><Icon name="phone" size={12}/>Ligar</button>
            <button className="btn btn-outline" style={{height:32, fontSize:12, flex:1, color:"#16A34A"}}><Icon name="msg" size={12}/>WhatsApp</button>
          </div>
        </div>

        <div className="card card-body">
          <div style={{fontSize:11, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em", fontWeight:600}}>Financeiro</div>
          <div style={{display:"flex", justifyContent:"space-between", marginTop:8, fontSize:14}}><span style={{color:"var(--fg-2)"}}>Total da OS</span><span style={{fontWeight:600, fontFamily:"var(--font-mono)"}}>R$ 1.480,00</span></div>
          <div style={{display:"flex", justifyContent:"space-between", marginTop:6, fontSize:14}}><span style={{color:"var(--fg-2)"}}>Recebido</span><span style={{fontWeight:600, fontFamily:"var(--font-mono)", color:"var(--success)"}}>R$ 740,00</span></div>
          <div style={{display:"flex", justifyContent:"space-between", marginTop:8, paddingTop:8, borderTop:"1px solid var(--border-2)", fontWeight:700}}><span>Pendente</span><span style={{fontFamily:"var(--font-mono)"}}>R$ 740,00</span></div>
          <button className="btn btn-primary" style={{width:"100%", marginTop:12}}><Icon name="plus" size={14} color="#fff"/>Registrar recebimento</button>
        </div>

        <div className="card card-body">
          <div style={{fontSize:11, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em", fontWeight:600, marginBottom:8}}>Histórico</div>
          {[["14:38","Execução iniciada"],["14:21","Técnico chegou ao local"],["08:10","Agendada 14/05 14:30"],["13/05","Criada do ORÇ #248"]].map(([t,e],i)=>(
            <div key={i} style={{display:"flex", gap:10, padding:"6px 0", fontSize:13}}>
              <span style={{width:56, color:"var(--fg-3)", fontFamily:"var(--font-mono)", fontSize:12, fontWeight:600}}>{t}</span>
              <span style={{flex:1}}>{e}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>);
}

// ============== CATÁLOGO ==============
function WCatalog() {
  const rows = [
    ["Serviço","Visita técnica","un","R$ 180,00",true],
    ["Serviço","Instalação câmera CFTV 4MP","un","R$ 320,00",true],
    ["Serviço","Configuração DVR","un","R$ 240,00",true],
    ["Serviço","Instalação portão eletrônico","un","R$ 680,00",true],
    ["Produto","Câmera CFTV 4MP","un","R$ 320,00",true],
    ["Produto","DVR 8 canais","un","R$ 480,00",true],
    ["Produto","Cabo coaxial 30m","rolo","R$ 180,00",true],
    ["Produto","Fonte 12V 5A","un","R$ 75,00",false],
    ["Mão de obra","Hora técnica padrão","h","R$ 95,00",true],
    ["Mão de obra","Hora extra","h","R$ 140,00",true],
    ["Outros","Deslocamento até 20km","un","R$ 40,00",true],
  ];
  return (<>
    <div className="page-header">
      <div><h1>Catálogo</h1><div className="desc">38 itens ativos · 4 inativos</div></div>
      <button className="btn btn-primary"><Icon name="plus" size={16} color="#fff"/>Novo item</button>
    </div>
    <div className="card" style={{padding:14, marginBottom:14, display:"flex", gap:10}}>
      <div style={{flex:1, height:36, border:"1px solid var(--border-1)", borderRadius:9, padding:"0 12px", display:"flex", alignItems:"center", gap:8, background:"var(--slate-50)"}}>
        <Icon name="search" size={16} color="#64748B"/><input style={{border:0, background:"transparent", outline:0, flex:1, fontSize:14}} placeholder="Buscar no catálogo…"/>
      </div>
      <select className="input" style={{width:160, height:36}}><option>Todos os tipos</option></select>
      <select className="input" style={{width:140, height:36}}><option>Ativos e inativos</option></select>
    </div>
    <div className="card" style={{padding:0}}>
      <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
        <thead><tr style={{background:"var(--slate-50)", textAlign:"left"}}>
          {["Tipo","Nome","Unidade","Preço","Status",""].map(h=>(
            <th key={h} style={{padding:"10px 16px", fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em"}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>{rows.map((r,i)=>(
          <tr key={i} style={{borderTop:"1px solid var(--border-2)"}}>
            <td style={{padding:"12px 16px"}}><Pill k="brand">{r[0]}</Pill></td>
            <td style={{padding:"12px 16px", fontWeight:500, color: r[4]?"var(--ink)":"var(--fg-3)"}}>{r[1]}</td>
            <td style={{padding:"12px 16px", color:"var(--fg-3)"}}>{r[2]}</td>
            <td style={{padding:"12px 16px", fontFamily:"var(--font-mono)", fontWeight:600}}>{r[3]}</td>
            <td style={{padding:"12px 16px"}}>{r[4] ? <Pill k="success">Ativo</Pill> : <Pill k="slate">Inativo</Pill>}</td>
            <td style={{padding:"12px 16px", textAlign:"right"}}><Icon name="dots" size={16} color="#94A3B8"/></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>);
}

// ============== FINANCEIRO ==============
function WFinance() {
  return (<>
    <div className="page-header">
      <div><h1>Financeiro</h1><div className="desc">Maio · 2026</div></div>
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-outline"><Icon name="file" size={16}/>Exportar</button>
        <button className="btn btn-primary"><Icon name="plus" size={16} color="#fff"/>Registrar recebimento</button>
      </div>
    </div>
    <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:20}}>
      {[
        ["Recebido no período",fmtMoney("12480"),"17 lançamentos","success"],
        ["Pendente",fmtMoney("2480"),"5 lançamentos","warning"],
        ["Vencido",fmtMoney("740"),"1 lançamento — OS #1019","danger"],
        ["Ticket médio",fmtMoney("734"),"+8% vs abril","brand"],
      ].map(([l,v,s,c],i)=>(
        <div key={i} className="card card-body">
          <div style={{fontSize:11, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em", fontWeight:500}}>{l}</div>
          <div style={{fontSize:24, fontWeight:700, marginTop:4, fontFamily:"var(--font-mono)", color:c==="danger"?"var(--danger)":c==="success"?"var(--success)":"var(--ink)"}}>{v}</div>
          <Pill k={c}>{s}</Pill>
        </div>
      ))}
    </div>

    <div className="card card-body" style={{marginBottom:16}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14}}>
        <div><div style={{fontSize:13, color:"var(--fg-3)"}}>Recebido por dia</div><div style={{fontSize:18, fontWeight:700, marginTop:2}}>Últimos 30 dias</div></div>
        <div style={{display:"flex", gap:6, fontSize:12}}>
          {["7d","30d","90d"].map((t,i)=>(<div key={t} className={"badge "+(i===1?"brand":"slate")}>{t}</div>))}
        </div>
      </div>
      <div style={{display:"flex", alignItems:"flex-end", gap:4, height:120}}>
        {Array.from({length:30}, (_,i)=>{
          const h = 30 + ((Math.sin(i*0.7)+1)*0.5 * 70) + (i%5===0?20:0);
          return <div key={i} style={{flex:1, height:h+"%", background:i>25?"var(--purple-600)":"var(--purple-200)", borderRadius:"3px 3px 0 0"}}/>;
        })}
      </div>
    </div>

    <div className="card" style={{padding:0}}>
      <div style={{padding:14, display:"flex", gap:10, borderBottom:"1px solid var(--border-2)"}}>
        <select className="input" style={{width:160, height:36}}><option>Maio · 2026</option></select>
        <select className="input" style={{width:160, height:36}}><option>Todos os status</option></select>
        <select className="input" style={{width:140, height:36}}><option>Todos os métodos</option></select>
        <select className="input" style={{width:160, height:36}}><option>Todos os clientes</option></select>
      </div>
      <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
        <thead><tr style={{background:"var(--slate-50)", textAlign:"left"}}>
          {["Cliente","Origem","Valor","Método","Status","Vencimento","Pago em",""].map(h=>(
            <th key={h} style={{padding:"10px 16px", fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em"}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>{[
          ["Mercado São João","OS #1024","R$ 740,00","Pix","pending","20/05","—"],
          ["Ana Souza","ORÇ #247","R$ 1.480,00","Pix","paid","10/05","10/05"],
          ["Construtora Vila Nova","OS #1019","R$ 740,00","Boleto","overdue","02/05","—"],
          ["Roberta Lima","OS #1018","R$ 320,00","Dinheiro","partial","08/05","08/05"],
          ["Padaria Quatro Cantos","OS #1015","R$ 890,00","Pix","paid","03/05","03/05"],
          ["Luiz Henrique","ORÇ #243","R$ 540,00","Cartão","paid","30/04","30/04"],
        ].map((r,i)=>(
          <tr key={i} style={{borderTop:"1px solid var(--border-2)"}}>
            <td style={{padding:"12px 16px", fontWeight:500}}>{r[0]}</td>
            <td style={{padding:"12px 16px", color:"var(--fg-3)", fontFamily:"var(--font-mono)", fontSize:12}}>{r[1]}</td>
            <td style={{padding:"12px 16px", fontWeight:600, fontFamily:"var(--font-mono)"}}>{r[2]}</td>
            <td style={{padding:"12px 16px", color:"var(--fg-2)"}}>{r[3]}</td>
            <td style={{padding:"12px 16px"}}><Pill k={SM_FIN[r[4]][0]}>{SM_FIN[r[4]][1]}</Pill></td>
            <td style={{padding:"12px 16px", fontFamily:"var(--font-mono)", fontSize:12, color:r[4]==="overdue"?"var(--danger)":"var(--fg-3)"}}>{r[5]}</td>
            <td style={{padding:"12px 16px", fontFamily:"var(--font-mono)", fontSize:12, color:"var(--fg-3)"}}>{r[6]}</td>
            <td style={{padding:"12px 16px", textAlign:"right"}}><Icon name="dots" size={16} color="#94A3B8"/></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>);
}

// ============== DOCUMENTOS ==============
function WDocs() {
  const [tab, setTab] = useState("orc");
  const tabs = [["orc","Orçamentos","32"],["os","Ordens de Serviço","42"],["rec","Recibos","28"],["rel","Relatórios","14"],["con","Contratos","8"]];
  return (<>
    <div className="page-header">
      <div><h1>Documentos</h1><div className="desc">124 documentos gerados</div></div>
      <div style={{display:"flex", gap:8}}><button className="btn btn-outline"><Icon name="file" size={16}/>Exportar lote</button></div>
    </div>
    <div style={{display:"flex", gap:6, marginBottom:16, borderBottom:"1px solid var(--border-1)"}}>
      {tabs.map(([k,l,c])=>(
        <div key={k} onClick={()=>setTab(k)} style={{padding:"10px 14px", cursor:"pointer", fontSize:14, fontWeight:500, borderBottom:tab===k?"2px solid var(--purple-600)":"2px solid transparent", color:tab===k?"var(--purple-700)":"var(--fg-2)", marginBottom:-1, display:"flex", gap:6, alignItems:"center"}}>
          {l}<span className={"badge "+(tab===k?"brand":"slate")} style={{fontSize:10, padding:"2px 6px"}}>{c}</span>
        </div>
      ))}
    </div>
    <div className="card" style={{padding:0}}>
      <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
        <thead><tr style={{background:"var(--slate-50)", textAlign:"left"}}>
          {["","Número","Cliente","Gerado em","Tamanho","Status",""].map(h=>(
            <th key={h} style={{padding:"10px 16px", fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em"}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>{[
          [2031,"Ana Martins","10/05 · 14:21","182 KB","sent"],
          [2030,"Mercado São João","09/05 · 09:08","210 KB","draft"],
          [2029,"Construtora Vila Nova","08/05 · 17:33","176 KB","sent"],
          [2028,"Padaria Quatro Cantos","05/05 · 11:02","154 KB","sent"],
          [2027,"Roberta Lima","04/05 · 16:14","198 KB","viewed"],
          [2026,"Luiz Henrique","03/05 · 10:09","142 KB","sent"],
        ].map((r,i)=>(
          <tr key={i} style={{borderTop:"1px solid var(--border-2)"}}>
            <td style={{padding:"12px 16px"}}><div style={{width:30, height:36, borderRadius:5, background:"linear-gradient(180deg,#FEE2E2,#FECACA)", display:"flex", alignItems:"center", justifyContent:"center", color:"#991B1B", fontWeight:700, fontSize:9}}>PDF</div></td>
            <td style={{padding:"12px 16px", fontFamily:"var(--font-mono)", fontWeight:600}}>#{r[0]}</td>
            <td style={{padding:"12px 16px", fontWeight:500}}>{r[1]}</td>
            <td style={{padding:"12px 16px", color:"var(--fg-3)", fontSize:12}}>{r[2]}</td>
            <td style={{padding:"12px 16px", color:"var(--fg-3)", fontSize:12}}>{r[3]}</td>
            <td style={{padding:"12px 16px"}}><Pill k={r[4]==="sent"?"info":r[4]==="viewed"?"success":"slate"}>{r[4]==="sent"?"Enviado":r[4]==="viewed"?"Visualizado":"Rascunho"}</Pill></td>
            <td style={{padding:"12px 16px", textAlign:"right"}}>
              <div style={{display:"flex", gap:4, justifyContent:"flex-end"}}>
                <button className="btn btn-ghost" style={{height:30, padding:"0 8px"}}><Icon name="pdf" size={14}/></button>
                <button className="btn btn-ghost" style={{height:30, padding:"0 8px"}}><Icon name="msg" size={14}/></button>
                <button className="btn btn-ghost" style={{height:30, padding:"0 8px"}}><Icon name="dots" size={14}/></button>
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>);
}

// ============== CONFIGURAÇÕES ==============
function WSettings() {
  const [tab, setTab] = useState("empresa");
  const tabs = [["empresa","Empresa","building"],["visual","Identidade visual","image"],["pix","Chave Pix","money"],["users","Usuários","users"],["plan","Plano","pkg"],["seg","Segurança","shield"],["exp","Exportação","file"],["notif","Notificações","bell"]];
  return (<>
    <div className="page-header"><div><h1>Configurações</h1><div className="desc">Empresa, identidade, usuários e plano</div></div></div>
    <div style={{display:"grid", gridTemplateColumns:"240px 1fr", gap:24}}>
      <aside>
        {tabs.map(([k,l,i])=>(
          <div key={k} onClick={()=>setTab(k)} className={"nav-item"+(tab===k?" active":"")} style={{display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:9, fontSize:14, fontWeight:500, cursor:"pointer", color:tab===k?"var(--purple-800)":"var(--fg-2)", background:tab===k?"var(--purple-50)":"transparent", marginBottom:2}}>
            <Icon name={i} size={16} color={tab===k?"#6D28D9":"#64748B"}/>{l}
          </div>
        ))}
      </aside>
      <div>
        {tab==="empresa" && (
          <div className="card card-body" style={{padding:24}}>
            <h3 style={{margin:"0 0 4px", fontSize:17}}>Dados da empresa</h3>
            <div className="desc" style={{marginBottom:20, color:"var(--fg-3)", fontSize:13}}>Aparecem no topo de orçamentos, OS e recibos.</div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
              {[["Nome fantasia","Ribeiro Elétrica"],["Razão social","Ribeiro Serviços LTDA"],["CNPJ","12.345.678/0001-90"],["Telefone","(11) 98123-4521"],["Email","contato@ribeiroeletrica.com.br"],["Endereço","Rua das Acácias, 248"]].map(([l,v],i)=>(
                <div key={i} style={{gridColumn: i===5?"span 2":"auto"}}>
                  <label style={{fontSize:12, color:"var(--fg-2)", fontWeight:500, marginBottom:6, display:"block"}}>{l}</label>
                  <input className="input" defaultValue={v}/>
                </div>
              ))}
            </div>
            <div style={{marginTop:24, display:"flex", justifyContent:"flex-end", gap:8}}>
              <button className="btn btn-outline">Cancelar</button>
              <button className="btn btn-primary">Salvar alterações</button>
            </div>
          </div>
        )}
        {tab==="visual" && (<>
          <div className="card card-body" style={{padding:24, marginBottom:16}}>
            <h3 style={{margin:"0 0 4px", fontSize:17}}>Logo</h3>
            <div className="desc" style={{marginBottom:20, color:"var(--fg-3)", fontSize:13}}>Mostrado no topo dos PDFs.</div>
            <div style={{display:"flex", alignItems:"center", gap:18}}>
              <div style={{width:96, height:96, borderRadius:14, background:"var(--purple-50)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--purple-700)", fontWeight:700, fontSize:32}}>RE</div>
              <div>
                <button className="btn btn-primary">Trocar logo</button>
                <div style={{fontSize:12, color:"var(--fg-3)", marginTop:8}}>PNG ou SVG, recomendado 512×512px.</div>
              </div>
            </div>
          </div>
          <div className="card card-body" style={{padding:24}}>
            <h3 style={{margin:"0 0 4px", fontSize:17}}>Cor principal</h3>
            <div className="desc" style={{marginBottom:16, color:"var(--fg-3)", fontSize:13}}>Usada em destaques e no PDF.</div>
            <div style={{display:"flex", gap:12}}>
              {["#6D28D9","#0F172A","#16A34A","#DC2626","#0891B2","#EA580C"].map((c,i)=>(
                <div key={c} style={{width:48, height:48, borderRadius:12, background:c, border:i===0?"3px solid #fff":"0", boxShadow:i===0?"0 0 0 2px var(--purple-600)":"inset 0 0 0 1px rgba(0,0,0,.06)", cursor:"pointer"}}/>
              ))}
            </div>
          </div>
        </>)}
        {tab==="pix" && (
          <div className="card card-body" style={{padding:24}}>
            <h3 style={{margin:"0 0 4px", fontSize:17}}>Chave Pix</h3>
            <div className="desc" style={{marginBottom:20, color:"var(--fg-3)", fontSize:13}}>Inserida automaticamente nos recibos.</div>
            <div style={{display:"grid", gap:16, maxWidth:520}}>
              <div><label style={{fontSize:12, color:"var(--fg-2)", fontWeight:500, marginBottom:6, display:"block"}}>Tipo de chave</label>
                <select className="input"><option>CNPJ</option><option>CPF</option><option>Email</option><option>Telefone</option><option>Aleatória</option></select></div>
              <div><label style={{fontSize:12, color:"var(--fg-2)", fontWeight:500, marginBottom:6, display:"block"}}>Chave</label>
                <input className="input" defaultValue="12.345.678/0001-90"/></div>
              <div><label style={{fontSize:12, color:"var(--fg-2)", fontWeight:500, marginBottom:6, display:"block"}}>Nome do recebedor</label>
                <input className="input" defaultValue="Ribeiro Serviços LTDA"/></div>
            </div>
            <div style={{marginTop:24}}><button className="btn btn-primary">Salvar chave</button></div>
          </div>
        )}
        {(tab==="users"||tab==="plan"||tab==="seg"||tab==="exp"||tab==="notif") && (
          <div className="card card-body" style={{padding:40, textAlign:"center", color:"var(--fg-3)"}}>
            <div style={{fontWeight:600, color:"var(--ink)", fontSize:15, marginBottom:6}}>{tabs.find(t=>t[0]===tab)[1]}</div>
            <div style={{fontSize:13}}>Disponível na tela dedicada — veja os cards "Usuários e permissões" e "Plano e assinatura".</div>
          </div>
        )}
      </div>
    </div>
  </>);
}

// ============== USUÁRIOS ==============
function WUsers() {
  const users = [
    ["JP","João Pereira","joao@ribeiro.com","Administrador","active","agora","Você"],
    ["MS","Marcos Silva","marcos@ribeiro.com","Técnico","active","há 1h",""],
    ["CL","Carla Lima","carla@ribeiro.com","Operação","active","há 3h",""],
    ["RC","Rafael Costa","rafael@ribeiro.com","Técnico","invited","convidado 12/05",""],
    ["AM","Ana Maria","ana@ribeiro.com","Operação","inactive","há 2 meses",""],
  ];
  const SM = { active:["success","Ativo"], invited:["info","Convite pendente"], inactive:["slate","Inativo"] };
  return (<>
    <div className="page-header">
      <div><h1>Usuários e permissões</h1><div className="desc">4 ativos · 1 convite pendente · 1 inativo · plano permite até 10</div></div>
      <button className="btn btn-primary"><Icon name="plus" size={16} color="#fff"/>Convidar usuário</button>
    </div>
    <div className="card" style={{padding:0, marginBottom:24}}>
      <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
        <thead><tr style={{background:"var(--slate-50)", textAlign:"left"}}>
          {["Nome","Email","Função","Status","Último acesso",""].map(h=>(
            <th key={h} style={{padding:"10px 16px", fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em"}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>{users.map((u,i)=>(
          <tr key={i} style={{borderTop:"1px solid var(--border-2)"}}>
            <td style={{padding:"12px 16px"}}>
              <div style={{display:"flex", alignItems:"center", gap:10}}>
                <div style={{width:32, height:32, borderRadius:"50%", background:"var(--purple-100)", color:"var(--purple-800)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:12}}>{u[0]}</div>
                <div><span style={{fontWeight:600}}>{u[1]}</span>{u[6] && <Pill k="brand">{u[6]}</Pill>}</div>
              </div>
            </td>
            <td style={{padding:"12px 16px", color:"var(--fg-2)"}}>{u[2]}</td>
            <td style={{padding:"12px 16px"}}>{u[3]}</td>
            <td style={{padding:"12px 16px"}}><Pill k={SM[u[4]][0]}>{SM[u[4]][1]}</Pill></td>
            <td style={{padding:"12px 16px", color:"var(--fg-3)", fontSize:12}}>{u[5]}</td>
            <td style={{padding:"12px 16px", textAlign:"right"}}>
              <div style={{display:"flex", gap:6, justifyContent:"flex-end"}}>
                <button className="btn btn-ghost" style={{height:30, fontSize:12, padding:"0 10px"}}>Editar permissões</button>
                <button className="btn btn-ghost" style={{height:30, padding:"0 8px"}}><Icon name="dots" size={14}/></button>
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>

    <h3 style={{fontSize:15, margin:"0 0 12px"}}>Permissões — Função: Técnico</h3>
    <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16}}>
      {[
        ["Clientes",[["Ver clientes atribuídos",true],["Criar e editar clientes",false],["Excluir clientes",false]]],
        ["Orçamentos",[["Criar orçamentos",true],["Editar orçamentos",true],["Aprovar / rejeitar",false]]],
        ["Ordens de Serviço",[["Executar OS atribuídas",true],["Atribuir técnicos",false],["Cancelar OS",false]]],
        ["Financeiro",[["Apenas leitura",true],["Registrar recebimentos",false],["Editar lançamentos",false]]],
        ["Catálogo",[["Ver catálogo",true],["Criar e editar itens",false]]],
        ["Administração",[["Convidar usuários",false],["Alterar plano",false],["Configurações da empresa",false]]],
      ].map(([t,perms],i)=>(
        <div key={i} className="card card-body">
          <div style={{fontWeight:600, fontSize:14, marginBottom:10}}>{t}</div>
          {perms.map(([n,on],j)=>(
            <div key={j} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom: j<perms.length-1?"1px solid var(--border-2)":0}}>
              <span style={{fontSize:13, color:"var(--fg-2)"}}>{n}</span>
              <div style={{width:36, height:22, borderRadius:11, background:on?"var(--purple-600)":"#CBD5E1", position:"relative"}}>
                <div style={{position:"absolute", top:3, left:on?17:3, width:16, height:16, borderRadius:"50%", background:"#fff"}}/>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </>);
}

// ============== PLANO ==============
function WPlan() {
  return (<>
    <div className="page-header"><div><h1>Plano e assinatura</h1><div className="desc">Gerencie seu plano, pagamentos e uso</div></div></div>

    <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16, marginBottom:24}}>
      <div className="card card-body" style={{padding:24, background:"linear-gradient(135deg,#6D28D9,#4C1D95)", border:0, color:"#fff"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:11, opacity:.7, textTransform:"uppercase", letterSpacing:".06em", fontWeight:600}}>Plano atual</div>
            <div style={{fontSize:32, fontWeight:700, marginTop:4, letterSpacing:"-0.02em"}}>Orcivo PRO</div>
            <div style={{fontSize:14, opacity:.85, marginTop:4}}>Próxima cobrança em 28/05 · R$ 89,90/mês</div>
          </div>
          <div className="badge" style={{background:"rgba(255,255,255,.18)", color:"#fff"}}><span className="dot"/>Ativo</div>
        </div>
        <div style={{height:1, background:"rgba(255,255,255,.2)", margin:"20px 0"}}/>
        <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:18}}>
          {[["Usuários","4 / 10"],["OS no mês","42 / ilim."],["Armazenamento","1.2 / 20 GB"],["NF emitidas","18 / 50"]].map(([l,v],i)=>(
            <div key={i}>
              <div style={{fontSize:11, opacity:.7, fontWeight:500, textTransform:"uppercase", letterSpacing:".05em"}}>{l}</div>
              <div style={{fontSize:18, fontWeight:700, marginTop:4}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex", gap:8, marginTop:20}}>
          <button className="btn" style={{background:"rgba(255,255,255,.18)", color:"#fff"}}>Alterar plano</button>
          <button className="btn btn-ghost" style={{color:"#fff"}}>Histórico de pagamentos</button>
          <button className="btn btn-ghost" style={{color:"rgba(255,255,255,.7)"}}>Cancelar assinatura</button>
        </div>
      </div>

      <div className="card card-body">
        <h3 style={{margin:"0 0 12px", fontSize:15}}>Pagamentos recentes</h3>
        {[["28/04","R$ 89,90","Pago"],["28/03","R$ 89,90","Pago"],["28/02","R$ 89,90","Pago"],["28/01","R$ 89,90","Pago"]].map((p,i,a)=>(
          <div key={i} style={{display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: i<a.length-1?"1px solid var(--border-2)":0}}>
            <div style={{width:32, height:32, borderRadius:8, background:"var(--success-bg)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--success)"}}><Icon name="check" size={16}/></div>
            <div style={{flex:1}}><div style={{fontWeight:600, fontSize:13}}>Orcivo PRO · mensal</div><div style={{fontSize:12, color:"var(--fg-3)"}}>Pago em {p[0]}</div></div>
            <span style={{fontFamily:"var(--font-mono)", fontWeight:600, fontSize:13}}>{p[1]}</span>
          </div>
        ))}
      </div>
    </div>

    <h3 style={{fontSize:15, margin:"0 0 12px"}}>Compare os planos</h3>
    <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16}}>
      {[
        ["Grátis","R$ 0","Para começar",["1 usuário","Até 5 OS / mês","PDF com marca Orcivo","Suporte por email"], false, false],
        ["POP","R$ 39,90",null,["3 usuários","OS ilimitadas","Seu logo no PDF","Chave Pix"], false, false],
        ["PRO","R$ 89,90","Recomendado",["10 usuários","Tudo do POP","Catálogo avançado","Relatórios","Suporte prioritário"], true, true],
        ["TOP","R$ 199,90","Para escala",["Usuários ilimitados","Tudo do PRO","Multi-empresa","API pública","Gerente dedicado"], false, false],
      ].map(([n,p,tag,feats,current,rec],i)=>(
        <div key={i} className="card card-body" style={{position:"relative", borderColor:current?"var(--purple-600)":"var(--border-1)", borderWidth:current?2:1}}>
          {rec && <div className="badge brand" style={{position:"absolute", top:-10, left:18}}>Recomendado</div>}
          <div style={{fontWeight:700, fontSize:17}}>{n}</div>
          <div style={{fontSize:11, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:".06em", fontWeight:500, marginTop:2}}>{tag||"\u00A0"}</div>
          <div style={{fontSize:28, fontWeight:700, marginTop:14, fontFamily:"var(--font-mono)"}}>{p}<span style={{fontSize:13, color:"var(--fg-3)", fontWeight:500}}>/mês</span></div>
          <ul style={{listStyle:"none", padding:0, margin:"16px 0 0", display:"flex", flexDirection:"column", gap:8}}>
            {feats.map((f,j)=>(
              <li key={j} style={{display:"flex", gap:8, fontSize:13, color:"var(--fg-2)"}}>
                <Icon name="check" size={14} color="#6D28D9" stroke={2.5}/>{f}
              </li>
            ))}
          </ul>
          <button className={"btn "+(current?"btn-outline disabled":"btn-primary")} style={{width:"100%", marginTop:18}}>
            {current?"Plano atual":"Mudar para "+n}
          </button>
        </div>
      ))}
    </div>
  </>);
}

// ----- router -----
const WEB_SCREENS = {
  dashboard:["Dashboard de Operação", WDashboard, "dashboard"],
  os:       ["Ordens de Serviço", WOS, "work-orders"],
  "os-detail":["Detalhe da OS", WOSDetail, "work-orders"],
  catalog:  ["Catálogo", WCatalog, "catalog"],
  finance:  ["Financeiro", WFinance, "finance"],
  docs:     ["Documentos", WDocs, "documents"],
  settings: ["Configurações", WSettings, "settings"],
  users:    ["Usuários e permissões", WUsers, "settings"],
  plan:     ["Plano e assinatura", WPlan, "settings"],
};
window.WEB_SCREENS = WEB_SCREENS;
