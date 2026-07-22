// Lote B — Forms · Mobile screens
// 1. Novo cliente
// 2. Novo item de catálogo
// 3. Coletar assinatura (horizontal/landscape)
// 4. Fotos da OS

const I = (props) => <AuthIcon {...props} />;

// ─────────────  1. Novo cliente ───────────── //
function MobNewCustomer() {
  return (
    <div className="auth-m" style={{background:"#fff"}}>
      <div className="auth-m-top">
        <div className="auth-m-back"><I name="x" size={20}/></div>
        <div style={{flex:1, fontSize:15, fontWeight:600, textAlign:"center"}}>Novo cliente</div>
        <span className="auth-link" style={{fontSize:13}}>Salvar</span>
      </div>

      <div className="auth-m-body" style={{paddingTop:4}}>
        <div className="seg" style={{marginBottom:18}}>
          <button className="active"><I name="user" size={14}/> Pessoa</button>
          <button><I name="building" size={14}/> Empresa</button>
        </div>

        <div style={{display:"flex", gap:14, alignItems:"center", marginBottom:18}}>
          <div style={{width:64, height:64, borderRadius:18, background:"var(--purple-100)", color:"var(--purple-800)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:22}}>MP</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12, color:"var(--fg-3)", textTransform:"uppercase", fontWeight:600, letterSpacing:"0.06em"}}>Avatar</div>
            <div style={{fontSize:14, color:"var(--fg-2)", marginTop:2}}>Gerado a partir do nome</div>
            <button className="auth-btn outline" style={{height:34, marginTop:8, width:"auto", padding:"0 12px", fontSize:13}}><I name="image" size={14}/> Alterar foto</button>
          </div>
        </div>

        <div className="auth-field">
          <label className="lbl">Nome completo</label>
          <input className="auth-input" defaultValue="Marcos Pereira"/>
        </div>

        <div className="auth-field">
          <label className="lbl">Telefone principal</label>
          <div className="auth-input-wrap">
            <span className="leading"><I name="whatsapp" size={18} color="var(--success)"/></span>
            <input className="auth-input has-leading" defaultValue="(11) 98123-4521"/>
            <span className="trailing"><span style={{fontSize:11, fontWeight:600, color:"var(--success)", background:"var(--success-bg)", padding:"3px 7px", borderRadius:6}}>WhatsApp</span></span>
          </div>
        </div>

        <div className="auth-field">
          <label className="lbl">Email <span style={{color:"var(--fg-3)", fontWeight:400}}>(opcional)</span></label>
          <input className="auth-input" defaultValue="marcos.p@gmail.com"/>
        </div>

        <div className="auth-field">
          <label className="lbl">CPF <span style={{color:"var(--fg-3)", fontWeight:400}}>(opcional)</span></label>
          <input className="auth-input" placeholder="000.000.000-00"/>
        </div>

        <div style={{padding:"14px 16px", border:"1px solid var(--border-1)", borderRadius:14, marginBottom:14}}>
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:10}}>
            <I name="map" size={18} color="var(--purple-700)"/>
            <div style={{fontWeight:600, fontSize:14, flex:1}}>Endereço</div>
            <span className="auth-link" style={{fontSize:13}}>Buscar CEP</span>
          </div>
          <div className="auth-field" style={{marginBottom:10}}>
            <label className="lbl">CEP</label>
            <input className="auth-input" defaultValue="04567-010"/>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:10}}>
            <div className="auth-field" style={{marginBottom:0}}>
              <label className="lbl">Rua</label>
              <input className="auth-input" defaultValue="Av. das Nações"/>
            </div>
            <div className="auth-field" style={{marginBottom:0}}>
              <label className="lbl">Número</label>
              <input className="auth-input" defaultValue="412"/>
            </div>
          </div>
        </div>

        <div className="auth-field">
          <label className="lbl">Etiquetas</label>
          <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
            {[["Residência",true],["Recorrente",true],["Indicação",false]].map(([t,on],i)=>(
              <div key={i} style={{
                padding:"6px 12px", borderRadius:9999, fontSize:12, fontWeight:600,
                background: on ? "var(--purple-50)" : "transparent",
                color: on ? "var(--purple-800)" : "var(--fg-2)",
                border: "1px solid " + (on ? "var(--purple-200)" : "var(--border-1)"),
                whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:4,
              }}>{on && <I name="check" size={11}/>}{t}</div>
            ))}
            <div style={{padding:"6px 12px", borderRadius:9999, fontSize:12, fontWeight:600, color:"var(--purple-700)", border:"1px dashed var(--purple-300)", whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:4}}>
              <I name="plus" size={12}/> adicionar
            </div>
          </div>
        </div>

        <div style={{height:8}}/>
        <button className="auth-btn primary">Salvar cliente</button>
      </div>
    </div>
  );
}

// ─────────────  2. Novo item de catálogo ───────────── //
function MobNewCatalogItem() {
  return (
    <div className="auth-m" style={{background:"#fff"}}>
      <div className="auth-m-top">
        <div className="auth-m-back"><I name="x" size={20}/></div>
        <div style={{flex:1, fontSize:15, fontWeight:600, textAlign:"center"}}>Novo item</div>
        <span className="auth-link" style={{fontSize:13}}>Salvar</span>
      </div>
      <div className="auth-m-body" style={{paddingTop:4}}>

        <div className="seg" style={{marginBottom:18}}>
          <button className="active"><I name="bolt" size={14}/> Serviço</button>
          <button><I name="package" size={14}/> Produto</button>
        </div>

        <div className="auth-field">
          <label className="lbl">Nome do serviço</label>
          <input className="auth-input" defaultValue="Instalação de quadro elétrico"/>
        </div>

        <div className="auth-field">
          <label className="lbl">Descrição <span style={{color:"var(--fg-3)", fontWeight:400}}>(aparece no orçamento)</span></label>
          <textarea className="auth-input" rows="3" style={{height:96, padding:"12px 14px", resize:"none"}}
            defaultValue="Inclui montagem do quadro, disjuntores de proteção, identificação dos circuitos e teste final."/>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          <div className="auth-field">
            <label className="lbl">Unidade</label>
            <div className="auth-input-wrap">
              <input className="auth-input has-trailing" defaultValue="hora"/>
              <span className="trailing"><I name="chev-down" size={18}/></span>
            </div>
          </div>
          <div className="auth-field">
            <label className="lbl">Preço unitário</label>
            <div className="auth-input-wrap">
              <span className="leading" style={{color:"var(--fg-2)", fontSize:14, fontWeight:600}}>R$</span>
              <input className="auth-input has-leading" defaultValue="120,00" style={{textAlign:"right", paddingRight:14, fontVariantNumeric:"tabular-nums"}}/>
            </div>
          </div>
        </div>

        <div className="auth-field">
          <label className="lbl">Custo interno <span style={{color:"var(--fg-3)", fontWeight:400}}>(opcional · só você vê)</span></label>
          <div className="auth-input-wrap">
            <span className="leading" style={{color:"var(--fg-2)", fontSize:14, fontWeight:600}}>R$</span>
            <input className="auth-input has-leading" defaultValue="42,00" style={{fontVariantNumeric:"tabular-nums"}}/>
          </div>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18}}>
          <div className="kpi-card">
            <div className="k">Margem</div>
            <div className="v" style={{color:"var(--success)"}}>+ 65%</div>
          </div>
          <div className="kpi-card">
            <div className="k">Lucro / hora</div>
            <div className="v">R$ 78,00</div>
          </div>
        </div>

        <div className="auth-field">
          <label className="lbl">Categoria</label>
          <div className="auth-input-wrap">
            <input className="auth-input has-trailing" defaultValue="Instalações"/>
            <span className="trailing"><I name="chev-down" size={18}/></span>
          </div>
        </div>

        <div style={{padding:"14px", border:"1px solid var(--border-1)", borderRadius:12, marginBottom:14, display:"flex", gap:12, alignItems:"center"}}>
          <div style={{width:36, height:36, borderRadius:10, background:"var(--purple-50)", color:"var(--purple-700)", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <I name="star" size={18}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600, fontSize:14}}>Item favorito</div>
            <div style={{fontSize:12, color:"var(--fg-3)"}}>Aparece no topo do catálogo</div>
          </div>
          <div style={{width:42, height:24, borderRadius:9999, background:"var(--purple-600)", position:"relative"}}>
            <div style={{position:"absolute", top:2, right:2, width:20, height:20, borderRadius:"50%", background:"#fff"}}/>
          </div>
        </div>

        <button className="auth-btn primary">Salvar no catálogo</button>
      </div>
    </div>
  );
}

// ─────────────  3. Coletar assinatura (horizontal / landscape) ───────────── //
function MobSignature() {
  // SVG of a hand-drawn signature line — placeholder ink stroke
  const stroke =
    "M 30 130 C 70 110, 110 150, 150 120 S 230 80, 270 130 S 360 160, 420 100 S 540 50, 600 100";
  return (
    <div className="sig-stage">
      {/* close + meta header */}
      <div style={{position:"absolute", top:18, left:18, display:"flex", alignItems:"center", gap:10}}>
        <div style={{width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center"}}>
          <I name="x" size={20} color="#fff"/>
        </div>
        <div style={{fontSize:13, color:"rgba(255,255,255,0.7)"}}>
          <div style={{fontWeight:600, fontSize:14, color:"#fff"}}>Orçamento #248 · Construtora Vila Nova</div>
          Total <strong style={{color:"#fff"}}>R$ 4.480,00</strong> · validade 30 dias
        </div>
      </div>

      <div className="sig-instr">
        <I name="rotate-phone" size={16}/> Gire o celular para assinar no espaço maior
      </div>

      <div className="sig-pad">
        <div className="canvas">
          <svg viewBox="0 0 700 200" width="100%" height="100%" preserveAspectRatio="none">
            <path d={stroke} fill="none" stroke="#0A0A0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="baseline"/>
        <div className="x-mark">×</div>
        <div className="who-label">
          <span>Assinante</span>
          <span><strong>Marcos Pereira</strong> · sócio</span>
        </div>
      </div>

      <div className="sig-footer">
        <button className="clear"><I name="refresh" size={16}/> Limpar</button>
        <button className="confirm"><I name="check" size={18}/> Confirmar assinatura</button>
      </div>
    </div>
  );
}

// ─────────────  4. Fotos da OS ───────────── //
function MobOSPhotos() {
  return (
    <div className="auth-m" style={{background:"#fff"}}>
      <div className="auth-m-top">
        <div className="auth-m-back"><I name="back" size={20}/></div>
        <div style={{flex:1, fontSize:15, fontWeight:600, textAlign:"center"}}>OS #112 · Fotos</div>
        <I name="more" size={20}/>
      </div>
      <div className="auth-m-body" style={{paddingTop:4}}>

        <div className="cap-tabs">
          <div className="active">Antes <span className="count">3</span></div>
          <div>Durante <span className="count">1</span></div>
          <div>Depois <span className="count">5</span></div>
        </div>

        <div style={{padding:"12px 14px", borderRadius:12, background:"var(--purple-50)", border:"1px solid var(--purple-100)", display:"flex", gap:10, alignItems:"flex-start", marginBottom:14}}>
          <div style={{width:28, height:28, borderRadius:8, background:"var(--purple-100)", color:"var(--purple-700)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
            <I name="info" size={14}/>
          </div>
          <div style={{fontSize:13, color:"var(--purple-900)", lineHeight:"18px"}}>
            Esta empresa exige <strong>fotos antes e depois</strong> para finalizar a OS. Toque numa foto para anotar.
          </div>
        </div>

        <div className="photo-grid" style={{marginBottom:18}}>
          <div className="photo-tile">
            <div className="ph"/>
            <div className="tag">09:14</div>
            <div className="check"><I name="check" size={12}/></div>
          </div>
          <div className="photo-tile">
            <div className="ph" style={{background:"repeating-linear-gradient(45deg, #cbd5e1 0 10px, #94a3b8 10px 20px)"}}/>
            <div className="tag">09:17</div>
          </div>
          <div className="photo-tile">
            <div className="ph" style={{background:"repeating-linear-gradient(90deg, #e2e8f0 0 6px, #cbd5e1 6px 12px)"}}/>
            <div className="tag">09:22</div>
          </div>
          <div className="photo-tile add">
            <I name="cam" size={26}/>
            <div>Câmera</div>
          </div>
          <div className="photo-tile add">
            <I name="upload" size={26}/>
            <div>Galeria</div>
          </div>
          <div className="photo-tile" style={{background:"transparent", border:"1px solid var(--border-2)"}}/>
        </div>

        <div className="section-h">
          <h3 style={{fontSize:13, fontWeight:600, color:"var(--fg-2)", textTransform:"uppercase", letterSpacing:"0.06em"}}>Notas das fotos · 1</h3>
        </div>
        <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:14, display:"flex", gap:10, marginBottom:18}}>
          <div style={{width:48, height:48, borderRadius:10, background:"var(--slate-200)", flexShrink:0, position:"relative", overflow:"hidden"}}>
            <div style={{position:"absolute", inset:0, background:"repeating-linear-gradient(45deg, #cbd5e1 0 6px, #e2e8f0 6px 12px)"}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, color:"var(--ink)", lineHeight:"18px"}}>Quadro original com fiação exposta e disjuntor antigo sem identificação.</div>
            <div style={{fontSize:12, color:"var(--fg-3)", marginTop:4}}>Foto 1 · 09:14 · João Ribeiro</div>
          </div>
        </div>

        <button className="auth-btn primary"><I name="cam" size={18}/> Tirar foto</button>
      </div>

      <div style={{position:"absolute", left:0, right:0, bottom:24, padding:"0 16px"}}>
        <div style={{background:"var(--ink)", color:"#fff", padding:"12px 14px", borderRadius:12, display:"flex", gap:10, alignItems:"center", fontSize:13, boxShadow:"var(--shadow-pop)"}}>
          <div style={{width:8, height:8, borderRadius:"50%", background:"var(--success)"}}/>
          <div style={{flex:1}}>9 fotos · todas sincronizadas</div>
          <span style={{color:"rgba(255,255,255,0.6)", fontSize:12}}>2,4 MB</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MobNewCustomer, MobNewCatalogItem, MobSignature, MobOSPhotos });
