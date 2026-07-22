// Quote Editor — multi-step. Right rail keeps a running total summary.
function QuoteEditor({ onNav }) {
  const [step, setStep] = React.useState(0);
  const [items, setItems] = React.useState([
    { name: "Visita técnica", qty: 1, unit: "un", price: "180.00" },
    { name: "Instalação câmera CFTV 4MP", qty: 4, unit: "un", price: "320.00" },
  ]);
  const [discount, setDiscount] = React.useState("0");
  const subtotal = items.reduce((s,i)=>s + i.qty*parseFloat(i.price), 0);
  const total = subtotal - parseFloat(discount || "0");
  const steps = ["Cliente","Itens","Desconto e validade","Termos","Revisão"];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <a onClick={()=>onNav("quotes")} style={{fontSize:13, color:"var(--purple-700)", cursor:"pointer"}}>← Orçamentos</a>
          <h1 style={{marginTop:6}}>Novo orçamento</h1>
          <div className="desc">Rascunho · não enviado</div>
        </div>
        <div className="row-flex">
          <button className="btn btn-outline">Salvar rascunho</button>
          <button className="btn btn-primary"><Icon name="pdf" size={16}/>Gerar PDF</button>
        </div>
      </div>

      <div className="stepper">
        {steps.map((s,i)=>(
          <React.Fragment key={i}>
            <div className={"step"+(i===step?" active":i<step?" done":"")} onClick={()=>setStep(i)}>
              <div className="num">{i<step ? <Icon name="check" size={12} color="#fff" stroke={3}/> : i+1}</div>
              <span>{s}</span>
            </div>
            {i<steps.length-1 && <div className="sep"/>}
          </React.Fragment>
        ))}
      </div>

      <div className="editor">
        <div>
          {step===0 && (
            <div className="card"><div className="card-body">
              <h3 style={{margin:0, marginBottom:14}}>Cliente</h3>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                <div><label style={{fontSize:12, color:"var(--fg-2)"}}>Cliente</label><input className="input" defaultValue="Construtora Vila Nova"/></div>
                <div><label style={{fontSize:12, color:"var(--fg-2)"}}>Contato</label><input className="input" defaultValue="Carlos · (11) 4002-8922"/></div>
                <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12, color:"var(--fg-2)"}}>Endereço da obra</label><input className="input" defaultValue="Rua das Acácias, 248 · Vila Nova · Guarulhos / SP"/></div>
              </div>
            </div></div>
          )}
          {step===1 && (
            <div className="card"><div className="card-body">
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                <h3 style={{margin:0}}>Itens</h3>
                <button className="btn btn-secondary"><Icon name="plus" size={14}/>Adicionar item</button>
              </div>
              <table className="table" style={{border:0}}>
                <thead><tr><th>Item</th><th className="num">Qtd</th><th>Unidade</th><th className="num">Preço un.</th><th className="num">Subtotal</th><th></th></tr></thead>
                <tbody>{items.map((it,i)=>(
                  <tr key={i}>
                    <td><b style={{fontWeight:600}}>{it.name}</b></td>
                    <td className="num">{it.qty}</td>
                    <td className="muted">{it.unit}</td>
                    <td className="num money">{fmtMoney(it.price)}</td>
                    <td className="num money">{fmtMoney(it.qty*parseFloat(it.price))}</td>
                    <td><Icon name="x" size={14} color="#94A3B8"/></td>
                  </tr>
                ))}</tbody>
              </table>
            </div></div>
          )}
          {step===2 && (
            <div className="card"><div className="card-body">
              <h3 style={{margin:0, marginBottom:14}}>Desconto e validade</h3>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                <div><label style={{fontSize:12, color:"var(--fg-2)"}}>Desconto (R$)</label><input className="input" value={discount} onChange={e=>setDiscount(e.target.value)}/></div>
                <div><label style={{fontSize:12, color:"var(--fg-2)"}}>Validade</label><input className="input" defaultValue="15 dias"/></div>
              </div>
            </div></div>
          )}
          {step===3 && (
            <div className="card"><div className="card-body">
              <h3 style={{margin:0, marginBottom:14}}>Termos e observações</h3>
              <label style={{fontSize:12, color:"var(--fg-2)"}}>Termos</label>
              <textarea className="input" style={{height:120, padding:12, resize:"vertical"}} defaultValue="Pagamento: 50% no início, 50% na entrega. Garantia de 90 dias sobre a mão de obra."/>
              <label style={{fontSize:12, color:"var(--fg-2)", marginTop:12, display:"block"}}>Observações internas</label>
              <textarea className="input" style={{height:80, padding:12, resize:"vertical"}}/>
            </div></div>
          )}
          {step===4 && (
            <div className="card"><div className="card-body">
              <h3 style={{margin:0, marginBottom:14}}>Revisão</h3>
              <div className="muted" style={{fontSize:13, marginBottom:10}}>Cliente</div>
              <div style={{fontWeight:600, marginBottom:14}}>Construtora Vila Nova · (11) 4002-8922</div>
              <div className="muted" style={{fontSize:13, marginBottom:6}}>Itens</div>
              {items.map((it,i)=>(
                <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--border-2)"}}>
                  <div>{it.qty}× {it.name}</div>
                  <div className="money num">{fmtMoney(it.qty*parseFloat(it.price))}</div>
                </div>
              ))}
            </div></div>
          )}
          <div style={{display:"flex", justifyContent:"space-between", marginTop:14}}>
            <button className="btn btn-outline" disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>Voltar</button>
            {step<4
              ? <button className="btn btn-primary" onClick={()=>setStep(s=>Math.min(4,s+1))}>Avançar</button>
              : <button className="btn btn-primary"><Icon name="check" size={16}/>Enviar orçamento</button>}
          </div>
        </div>

        <div className="right">
          <div className="card"><div className="card-body">
            <div className="metric" style={{marginBottom:10}}>
              <div className="label">Total do orçamento</div>
              <div className="value">{fmtMoney(total)}</div>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:13, padding:"8px 0", borderTop:"1px solid var(--border-2)"}}>
              <span className="muted">Subtotal</span><span className="money">{fmtMoney(subtotal)}</span>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:13, padding:"8px 0", borderTop:"1px solid var(--border-2)"}}>
              <span className="muted">Desconto</span><span className="money">− {fmtMoney(discount || "0")}</span>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", padding:"10px 0 0", borderTop:"1px solid var(--border-1)", fontWeight:700}}>
              <span>Total</span><span className="money">{fmtMoney(total)}</span>
            </div>
          </div></div>
          <div className="card" style={{marginTop:12}}><div className="card-body">
            <div className="t-label" style={{marginBottom:8}}>Ações rápidas</div>
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              <button className="btn btn-outline" style={{justifyContent:"flex-start"}}><Icon name="share" size={14}/>Compartilhar no WhatsApp</button>
              <button className="btn btn-outline" style={{justifyContent:"flex-start"}}><Icon name="pdf" size={14}/>Baixar PDF</button>
            </div>
          </div></div>
        </div>
      </div>
    </div>
  );
}
window.QuoteEditor = QuoteEditor;
