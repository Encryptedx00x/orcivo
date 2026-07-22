// Customers page — list with search/filter and a detail drawer
function Customers() {
  const [q, setQ] = React.useState("");
  const rows = [
    { name: "Marcos Pereira", phone: "(11) 98123-4521", doc: "123.***.***-09", city: "São Paulo / SP", owner: "João R.", last: "há 2 dias" },
    { name: "Construtora Vila Nova", phone: "(11) 4002-8922", doc: "12.345.678/0001-90", city: "Guarulhos / SP", owner: "João R.", last: "há 1 dia" },
    { name: "Ana Souza", phone: "(11) 97744-1188", doc: "456.***.***-22", city: "São Paulo / SP", owner: "Téc. Carlos", last: "há 5 dias" },
    { name: "Luiz Henrique", phone: "(21) 99887-3300", doc: "111.***.***-44", city: "Rio de Janeiro / RJ", owner: "João R.", last: "há 8 dias" },
    { name: "Padaria Quatro Cantos", phone: "(11) 3221-7788", doc: "98.111.222/0001-33", city: "São Paulo / SP", owner: "Téc. Marcos", last: "há 12 dias" },
    { name: "Roberta Lima", phone: "(11) 96655-2244", doc: "789.***.***-55", city: "Santo André / SP", owner: "João R.", last: "há 1 mês" },
  ].filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Clientes</h1><div className="desc">{rows.length} clientes cadastrados</div></div>
        <div className="row-flex">
          <button className="btn btn-outline"><Icon name="filter" size={16}/>Filtros</button>
          <button className="btn btn-primary"><Icon name="plus" size={16}/>Novo cliente</button>
        </div>
      </div>
      <div style={{display:"flex", gap:10, marginBottom:14}}>
        <div className="search" style={{flex:1, maxWidth:360, background:"#fff", border:"1px solid var(--border-1)", height:40, borderRadius:10, padding:"0 12px", display:"flex", alignItems:"center", gap:8}}>
          <Icon name="search" size={16} color="#64748B"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nome, telefone…" style={{border:0, outline:0, flex:1, fontSize:14}}/>
        </div>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <table className="table">
          <thead><tr>
            <th>Nome</th><th>Telefone</th><th>Documento</th><th>Cidade</th><th>Responsável</th><th>Última atividade</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i}>
                <td><b style={{fontWeight:600}}>{r.name}</b></td>
                <td>{r.phone}</td>
                <td style={{fontFamily:"var(--font-mono)", fontSize:13}}>{r.doc}</td>
                <td>{r.city}</td>
                <td>{r.owner}</td>
                <td className="muted">{r.last}</td>
                <td><Icon name="chev" size={16} color="#94A3B8"/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.Customers = Customers;

// Quotes list page
function Quotes({ onNav }) {
  const [tab, setTab] = React.useState("todos");
  const rows = [
    { n:"#248", cust:"Construtora Vila Nova", status:"pending", total:"4480",  validUntil:"15/05", created:"08/05" },
    { n:"#247", cust:"Marcos Pereira",         status:"approved",total:"1480",  validUntil:"22/05", created:"07/05" },
    { n:"#246", cust:"Ana Souza",              status:"rejected",total:"2300",  validUntil:"30/04", created:"01/05" },
    { n:"#245", cust:"Padaria Quatro Cantos",  status:"draft",   total:"890",   validUntil:"—",     created:"30/04" },
    { n:"#244", cust:"Luiz Henrique",          status:"approved",total:"3210",  validUntil:"18/05", created:"28/04" },
    { n:"#243", cust:"Roberta Lima",           status:"expired", total:"760",   validUntil:"25/04", created:"15/04" },
  ];
  const statusMap = {
    draft:    { cls:"slate",   label:"Rascunho" },
    pending:  { cls:"warning", label:"Pendente" },
    approved: { cls:"success", label:"Aprovado" },
    rejected: { cls:"danger",  label:"Rejeitado" },
    expired:  { cls:"slate",   label:"Expirado" },
  };
  const filtered = tab==="todos" ? rows : rows.filter(r=>r.status===tab);
  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Orçamentos</h1><div className="desc">{rows.length} no total</div></div>
        <div className="row-flex">
          <button className="btn btn-outline"><Icon name="filter" size={16}/>Filtros</button>
          <button className="btn btn-primary" onClick={()=>onNav("quote-new")}><Icon name="plus" size={16}/>Novo orçamento</button>
        </div>
      </div>
      <div className="tabs">
        {[["todos","Todos"],["draft","Rascunho"],["pending","Pendentes"],["approved","Aprovados"],["rejected","Rejeitados"],["expired","Expirados"]].map(([id,l])=>(
          <div key={id} className={"tab"+(tab===id?" active":"")} onClick={()=>setTab(id)}>{l}</div>
        ))}
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <table className="table">
          <thead><tr><th>Número</th><th>Cliente</th><th>Status</th><th className="num">Valor</th><th>Validade</th><th>Criado</th><th></th></tr></thead>
          <tbody>{filtered.map((r,i)=>(
            <tr key={i}>
              <td style={{fontFamily:"var(--font-mono)", fontWeight:600}}>{r.n}</td>
              <td><b style={{fontWeight:600}}>{r.cust}</b></td>
              <td><span className={"badge "+statusMap[r.status].cls}><span className="dot"></span>{statusMap[r.status].label}</span></td>
              <td className="num money">{fmtMoney(r.total)}</td>
              <td className="muted">{r.validUntil}</td>
              <td className="muted">{r.created}</td>
              <td><Icon name="chev" size={16} color="#94A3B8"/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
window.Quotes = Quotes;
