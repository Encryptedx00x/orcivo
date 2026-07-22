// Lote C — Estados do sistema
// 1. Plano bloqueado (mobile sheet + web modal)
// 2. Sem conexão
// 3. Permission denied
// 4. Edit lock
// 5. Skeletons

const I = (props) => <AuthIcon {...props} />;

// ─────────────  helpers ───────────── //

function FakeAppBehindMobile() {
  return (
    <div className="mock-bg-list" aria-hidden>
      <h1>Orçamentos</h1>
      {[1,2,3,4,5].map(i => (
        <div key={i} className="row">
          <div className="av"/>
          <div style={{flex:1}}>
            <div className="l1"/><div className="l2"/>
          </div>
          <div style={{width:60, height:22, borderRadius:6, background:"var(--slate-100)"}}/>
        </div>
      ))}
    </div>
  );
}

function FakeAppBehindWeb({ heading = "Equipe" } = {}) {
  return (
    <div className="mock-app" aria-hidden>
      <div className="sb">
        <div className="b"/>
        <div className="item"/><div className="item"/><div className="item active"/><div className="item"/><div className="item"/><div className="item"/>
      </div>
      <div className="main">
        <div className="tb"/>
        <div style={{fontSize:22, fontWeight:700, margin:"4px 4px 16px"}}>{heading}</div>
        <div className="card"/><div className="card"/><div className="card"/><div className="card"/>
      </div>
    </div>
  );
}

// ─────────────  1. Plano bloqueado ───────────── //

function MobPlanLocked() {
  return (
    <div className="auth-m" style={{background:"var(--slate-50)"}}>
      <div className="st-stage dim">
        <FakeAppBehindMobile/>
        <div className="sheet">
          <div className="grabber"/>
          <div style={{display:"flex", gap:14, alignItems:"flex-start", marginBottom:6}}>
            <div style={{width:48, height:48, borderRadius:14, background:"linear-gradient(135deg,#A78BFA,#6D28D9)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
              <I name="crown" size={22}/>
            </div>
            <div style={{flex:1}}>
              <div className="m-badge b-brand" style={{marginBottom:8}}><span className="dot"/>Plano Livre</div>
              <h2>Você usou seus 10 clientes</h2>
            </div>
          </div>
          <p className="sub">Faça upgrade para <strong style={{color:"var(--ink)"}}>Orcivo Mais</strong> e tenha mais clientes inclusos, envio por WhatsApp e PDF com a sua marca.</p>

          <div style={{background:"var(--purple-50)", border:"1px solid var(--purple-200)", borderRadius:12, padding:14, marginBottom:14}}>
            {[
              ["Mais clientes inclusos", true],
              ["PDF com sua marca", true],
              ["Envio por WhatsApp", true],
              ["Catálogo com uso ampliado", true],
            ].map(([t,on],i)=>(
              <div key={i} style={{display:"flex", gap:10, alignItems:"center", padding:"6px 0", fontSize:14}}>
                <div style={{width:18, height:18, borderRadius:"50%", background:"var(--purple-600)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center"}}><I name="check" size={12}/></div>
                <div style={{color:"var(--ink)"}}>{t}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex", alignItems:"baseline", gap:6, justifyContent:"center", marginBottom:14}}>
            <span style={{fontSize:13, color:"var(--fg-3)"}}>Valor conforme o plano</span>
          </div>

          <button className="auth-btn primary">Ver planos</button>
          <button className="auth-btn ghost" style={{marginTop:6, height:44}}>Continuar no Livre</button>
        </div>
      </div>
    </div>
  );
}

function WebPlanLocked() {
  return (
    <div className="auth-m" style={{background:"var(--slate-50)"}}>
      <div className="st-stage dim">
        <FakeAppBehindWeb heading="Catálogo"/>
        <div className="web-modal" style={{width:520}}>
          <div className="web-modal-head" style={{paddingTop:32}}>
            <div className="ic" style={{background:"linear-gradient(135deg,#A78BFA,#6D28D9)", color:"#fff", width:48, height:48, borderRadius:14}}>
              <I name="crown" size={24}/>
            </div>
            <div style={{flex:1}}>
              <div className="badge brand" style={{marginBottom:6}}><span className="dot"/>Plano Livre · 47 / 50 itens</div>
              <h2 style={{fontSize:22, lineHeight:"28px", fontWeight:700, letterSpacing:"-0.01em", margin:"0 0 4px"}}>Quase no limite do catálogo</h2>
              <p style={{color:"var(--fg-3)", fontSize:14, margin:0}}>Faça upgrade para <strong style={{color:"var(--ink)"}}>Orcivo Mais</strong> e tenha catálogo com uso ampliado, sem cobrança extra.</p>
            </div>
          </div>
          <div className="web-modal-body">
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              {[
                ["Catálogo", "Até 50 itens", "Uso ampliado"],
                ["Clientes", "Uso básico", "Uso ampliado"],
                ["Usuários", "1 só", "Até 3"],
                ["PDF", "Modelo padrão", "Com sua marca"],
                ["Suporte", "Email", "Chat prioritário"],
                ["NF", "—", "Add-on disponível"],
              ].map(([k,a,b],i)=>(
                <div key={i} style={{padding:"10px 12px", border:"1px solid var(--border-1)", borderRadius:10}}>
                  <div style={{fontSize:11, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.04em", fontWeight:500}}>{k}</div>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:4, gap:8}}>
                    <span style={{fontSize:13, color:"var(--fg-3)", textDecoration:"line-through"}}>{a}</span>
                    <span style={{fontSize:14, color:"var(--purple-700)", fontWeight:600}}>{b}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="web-modal-foot">
            <button className="auth-btn ghost" style={{width:"auto", padding:"0 14px", height:40}}>Continuar no Livre</button>
            <button className="auth-btn outline" style={{width:"auto", padding:"0 14px", height:40}}>Comparar planos</button>
            <button className="auth-btn primary" style={{width:"auto", padding:"0 18px", height:40}}>Ver planos</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────  2. Sem conexão ───────────── //

function MobOffline() {
  return (
    <div className="auth-m" style={{background:"#fff"}}>
      <div className="auth-m-top" style={{minHeight:24}}/>
      <div className="auth-m-body" style={{display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", paddingTop:64}}>
        <div className="status-hero" style={{background:"var(--slate-100)", color:"var(--slate-600)"}}>
          <I name="wifi-off" size={36}/>
        </div>
          <h1 style={{textAlign:"center"}}>Sem conexão</h1>
        <p className="sub" style={{textAlign:"center"}}>O Orcivo continua funcionando. Suas alterações ficam salvas no celular e sincronizam quando a internet voltar.</p>

        <div style={{width:"100%", padding:"14px 16px", background:"var(--slate-50)", border:"1px solid var(--border-1)", borderRadius:14, marginBottom:16, textAlign:"left"}}>
          <div style={{fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8}}>Aguardando sincronizar</div>
          {[
            ["Orçamento #248", "Construtora Vila Nova"],
            ["OS #112 finalizada", "Marcos Pereira"],
            ["3 fotos · OS #109", "Ana Souza"],
          ].map(([t,s],i)=>(
            <div key={i} style={{display:"flex", gap:10, alignItems:"center", padding:"8px 0", borderBottom: i<2?"1px solid var(--border-2)":"none"}}>
              <div style={{width:28, height:28, borderRadius:8, background:"var(--warning-bg)", color:"#92400E", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <I name="clock" size={14}/>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:14, fontWeight:600}}>{t}</div>
                <div style={{fontSize:12, color:"var(--fg-3)"}}>{s}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="auth-btn outline"><I name="refresh" size={18}/> Tentar reconectar</button>
      </div>
      {/* persistent offline strip */}
      <div style={{position:"absolute", left:16, right:16, bottom:32, background:"var(--ink)", color:"#fff", padding:"10px 14px", borderRadius:12, display:"flex", gap:10, alignItems:"center", fontSize:13, boxShadow:"var(--shadow-pop)"}}>
        <div style={{width:8, height:8, borderRadius:"50%", background:"var(--warning)"}}/>
        <div style={{flex:1}}>Offline · 3 alterações pendentes</div>
        <I name="chev-right" size={16} color="rgba(255,255,255,0.6)"/>
      </div>
    </div>
  );
}

function WebOffline() {
  return (
    <div className="auth-m" style={{background:"var(--slate-50)"}}>
      {/* sticky banner */}
      <div style={{height:42, background:"var(--ink)", color:"#fff", display:"flex", alignItems:"center", gap:10, padding:"0 24px", fontSize:13}}>
        <div style={{width:8, height:8, borderRadius:"50%", background:"var(--warning)"}}/>
        Você está offline. Aguarde a conexão voltar antes de salvar novas alterações.
        <div style={{flex:1}}/>
        <span style={{fontFamily:"var(--font-mono)", color:"rgba(255,255,255,0.7)"}}>tentando reconectar… 0:12</span>
        <button style={{height:28, padding:"0 12px", borderRadius:8, background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.18)", color:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600}}>Tentar agora</button>
      </div>

      <div className="web-fs" style={{height:"calc(100% - 42px)"}}>
        <div className="web-fs-card">
          <div className="status-hero" style={{background:"var(--slate-100)", color:"var(--slate-600)"}}>
            <I name="wifi-off" size={36}/>
          </div>
          <h1>Não conseguimos atualizar agora</h1>
          <p>Verifique sua conexão e tente novamente. Suas alterações não foram perdidas.</p>
          <div style={{display:"flex", gap:8, justifyContent:"center"}}>
            <button className="auth-btn outline" style={{width:"auto", padding:"0 16px"}}><I name="refresh" size={18}/> Tentar novamente</button>
            <button className="auth-btn ghost" style={{width:"auto", padding:"0 16px"}}>Voltar para a Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────  3. Permission denied ───────────── //

function MobPermissionDenied() {
  return (
    <div className="auth-m" style={{background:"#fff"}}>
      <div className="auth-m-top">
        <div className="auth-m-back"><I name="back" size={20}/></div>
        <div style={{flex:1, fontSize:13, color:"var(--fg-3)", textAlign:"center", fontWeight:500}}>Financeiro</div>
        <div style={{width:36}}/>
      </div>
      <div className="auth-m-body" style={{display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", paddingTop:48}}>
        <div className="status-hero" style={{background:"var(--purple-50)", color:"var(--purple-700)"}}>
          <I name="lock" size={32}/>
        </div>
        <h1 style={{textAlign:"center"}}>Acesso restrito</h1>
        <p className="sub" style={{textAlign:"center"}}>Apenas o <strong style={{color:"var(--ink)"}}>dono da empresa</strong> consegue ver o Financeiro. Peça acesso para quem administra o Orcivo aqui.</p>

        <div style={{width:"100%", background:"var(--slate-50)", border:"1px solid var(--border-1)", borderRadius:14, padding:14, marginBottom:16, textAlign:"left"}}>
          <div style={{fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10}}>Dono da empresa</div>
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <div style={{width:40, height:40, borderRadius:"50%", background:"var(--purple-100)", color:"var(--purple-800)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600}}>JR</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600, fontSize:14}}>João Ribeiro</div>
              <div style={{fontSize:12, color:"var(--fg-3)"}}>joao@ribeiroeletrica.com.br</div>
            </div>
            <button style={{height:36, padding:"0 12px", borderRadius:9, background:"var(--purple-50)", color:"var(--purple-700)", border:"1px solid var(--purple-200)", fontWeight:600, fontSize:13, fontFamily:"inherit"}}>
              Pedir acesso
            </button>
          </div>
        </div>

        <button className="auth-btn outline"><I name="arrow-left" size={18}/> Voltar para a Home</button>
      </div>
    </div>
  );
}

function WebPermissionDenied() {
  return (
    <div className="auth-m" style={{background:"var(--slate-50)"}}>
      <div className="st-stage">
        <FakeAppBehindWeb heading="Financeiro"/>
        <div className="web-modal" style={{width:460}}>
          <div className="web-modal-head" style={{paddingTop:28}}>
            <div className="ic" style={{background:"var(--purple-100)", color:"var(--purple-700)"}}>
              <I name="lock" size={22}/>
            </div>
            <div style={{flex:1}}>
              <h2 style={{fontSize:20, lineHeight:"26px", fontWeight:700, letterSpacing:"-0.01em", margin:"0 0 4px"}}>Você não tem acesso ao Financeiro</h2>
              <p style={{color:"var(--fg-3)", fontSize:14, margin:0}}>Sua função na empresa é <strong style={{color:"var(--ink)"}}>Técnico</strong>. Apenas o dono pode ver lançamentos, recebimentos e relatórios.</p>
            </div>
          </div>
          <div className="web-modal-body">
            <div style={{padding:"12px 14px", background:"var(--slate-50)", borderRadius:10, display:"flex", gap:12, alignItems:"center"}}>
              <div style={{width:36, height:36, borderRadius:"50%", background:"var(--purple-100)", color:"var(--purple-800)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:13}}>JR</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:600, fontSize:13}}>João Ribeiro</div>
                <div style={{fontSize:12, color:"var(--fg-3)"}}>Dono · joao@ribeiroeletrica.com.br</div>
              </div>
              <button className="auth-btn outline" style={{width:"auto", height:34, padding:"0 12px", fontSize:13}}><I name="msg" size={14}/> Pedir acesso</button>
            </div>
            <div style={{fontSize:12, color:"var(--fg-3)", marginTop:10, display:"flex", gap:6, alignItems:"center"}}>
              <I name="info" size={14}/> Erro 403 · permission.denied · ação registrada no audit log
            </div>
          </div>
          <div className="web-modal-foot">
            <button className="auth-btn primary" style={{width:"auto", padding:"0 18px", height:40}}>Voltar ao Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────  4. Edit lock ───────────── //

function MobEditLock() {
  return (
    <div className="auth-m" style={{background:"var(--slate-50)"}}>
      <div className="auth-m-top">
        <div className="auth-m-back"><I name="back" size={20}/></div>
        <div style={{flex:1, fontSize:13, fontWeight:600, textAlign:"center"}}>Orçamento #248</div>
        <I name="more" size={20}/>
      </div>
      <div className="auth-m-body" style={{padding:"4px 16px 24px"}}>
        <div className="lock-banner" style={{marginBottom:14}}>
          <div className="ic"><I name="lock" size={16}/></div>
          <div className="who">
            <div style={{fontWeight:600}}>Em edição por <strong>Ana Souza</strong></div>
            <div style={{color:"var(--fg-2)", fontSize:12}}>Há 4 min · pelo computador</div>
          </div>
        </div>

        {/* faded preview of editor */}
        <div style={{opacity:0.55, pointerEvents:"none"}}>
          <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:14, padding:16, marginBottom:10}}>
            <div style={{fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.06em"}}>Cliente</div>
            <div style={{fontWeight:600, fontSize:15, marginTop:4}}>Construtora Vila Nova</div>
            <div style={{fontSize:13, color:"var(--fg-3)"}}>CNPJ 12.345.678/0001-90 · (11) 4002-8922</div>
          </div>
          <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:14, padding:16, marginBottom:10}}>
            <div style={{fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.06em"}}>Itens · 4</div>
            {[
              ["Instalação de quadro elétrico","R$ 1.890,00"],
              ["Disjuntor DR 40A · 2un","R$ 320,00"],
              ["Mão de obra · 6h","R$ 720,00"],
              ["Material elétrico diversos","R$ 1.550,00"],
            ].map(([t,v],i)=>(
              <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:i?"1px solid var(--border-2)":"none"}}>
                <div style={{fontSize:14}}>{t}</div>
                <div style={{fontSize:14, fontWeight:600, fontFeatureSettings:'"tnum"'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{position:"absolute", left:16, right:16, bottom:32, display:"flex", gap:8}}>
        <button className="auth-btn outline" style={{height:48}}><I name="eye" size={18}/> Só visualizar</button>
        <button className="auth-btn primary" style={{height:48}}>Pedir edição</button>
      </div>
    </div>
  );
}

function WebEditLock() {
  return (
    <div className="auth-m" style={{background:"var(--slate-50)"}}>
      <div style={{height:60, background:"#fff", borderBottom:"1px solid var(--border-1)", display:"flex", alignItems:"center", padding:"0 24px", gap:12}}>
        <div className="auth-m-back" style={{margin:0}}><I name="arrow-left" size={18}/></div>
        <div style={{fontWeight:600, fontSize:15}}>Orçamento #248 · Construtora Vila Nova</div>
        <div className="m-badge b-warn" style={{padding:"4px 9px"}}><span className="dot"/>Em edição por outro usuário</div>
        <div style={{flex:1}}/>
        <button className="auth-btn outline" style={{width:"auto", padding:"0 14px", height:36}}>Só visualizar</button>
        <button className="auth-btn primary" style={{width:"auto", padding:"0 16px", height:36}}>Pedir edição</button>
      </div>

      <div style={{padding:"20px 24px"}}>
        <div className="lock-banner" style={{marginBottom:20}}>
          <div className="ic" style={{width:40, height:40, borderRadius:10}}><I name="lock" size={18}/></div>
          <div style={{flex:1}}>
            <div style={{fontSize:14, color:"var(--ink)", fontWeight:600}}>Este orçamento está sendo editado por <strong>Ana Souza</strong> agora</div>
            <div style={{fontSize:13, color:"var(--slate-700)"}}>Edição iniciada há 4 min · liberação automática após 15 min de inatividade</div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:10, paddingRight:6}}>
            <div style={{width:36, height:36, borderRadius:"50%", background:"var(--purple-100)", color:"var(--purple-800)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:13, border:"2px solid #fff", boxShadow:"0 0 0 2px var(--warning)"}}>AS</div>
            <button style={{height:36, padding:"0 12px", borderRadius:9, background:"#fff", border:"1px solid var(--border-1)", fontWeight:600, fontSize:13, color:"var(--ink)", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6}}>
              <I name="msg" size={14}/> Avisar Ana
            </button>
          </div>
        </div>

        {/* faded editor body */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 360px", gap:20, opacity:0.5, pointerEvents:"none"}}>
          <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:20, height:420}}>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:14}}>
              <div>
                <div style={{fontSize:12, color:"var(--fg-3)", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.04em"}}>Cliente</div>
                <div style={{fontWeight:600, fontSize:18, marginTop:4}}>Construtora Vila Nova</div>
              </div>
              <div className="m-badge b-warn"><span className="dot"/>Pendente</div>
            </div>
            <div style={{height:1, background:"var(--border-2)", margin:"12px 0 16px"}}/>
            <div style={{fontSize:12, color:"var(--fg-3)", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:8}}>Itens · 4</div>
            {[
              ["Instalação de quadro elétrico","R$ 1.890,00"],
              ["Disjuntor DR 40A · 2un","R$ 320,00"],
              ["Mão de obra · 6h","R$ 720,00"],
              ["Material elétrico diversos","R$ 1.550,00"],
            ].map(([t,v],i)=>(
              <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:i?"1px solid var(--border-2)":"none"}}>
                <div style={{fontSize:14}}>{t}</div>
                <div style={{fontSize:14, fontWeight:600, fontFeatureSettings:'"tnum"'}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:20, height:200}}>
            <div style={{fontSize:12, color:"var(--fg-3)", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.04em"}}>Resumo</div>
            <div style={{marginTop:14, display:"flex", justifyContent:"space-between"}}><div>Subtotal</div><div>R$ 4.480,00</div></div>
            <div style={{marginTop:8, display:"flex", justifyContent:"space-between"}}><div>Desconto</div><div>—</div></div>
            <div style={{marginTop:14, paddingTop:14, borderTop:"1px solid var(--border-2)", display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:18}}><div>Total</div><div>R$ 4.480,00</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────  5. Skeletons ───────────── //

function MobSkeleton() {
  return (
    <div className="auth-m" style={{background:"#fff"}}>
      <div className="auth-m-top">
        <div style={{flex:1}}>
          <div className="sk" style={{height:14, width:120}}/>
          <div className="sk" style={{height:24, width:180, marginTop:8}}/>
        </div>
        <div className="sk sk-circle" style={{width:36, height:36}}/>
      </div>
      <div className="auth-m-body" style={{paddingTop:8}}>
        <div className="sk" style={{height:42, width:"100%", borderRadius:12, marginBottom:14}}/>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14}}>
          {[1,2,3,4].map(i=>(
            <div key={i} style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:14, padding:14}}>
              <div className="sk" style={{height:10, width:"60%"}}/>
              <div className="sk" style={{height:22, width:"50%", marginTop:10}}/>
              <div className="sk" style={{height:10, width:"80%", marginTop:8}}/>
            </div>
          ))}
        </div>

        <div className="sk" style={{height:14, width:120, marginBottom:10}}/>
        <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:14, padding:"4px 14px"}}>
          {[1,2,3,4].map(i=>(
            <div key={i} className="sk-card" style={{border:"none", padding:"12px 0", borderBottom: i<4 ? "1px solid var(--border-2)" : "none"}}>
              <div className="sk sk-circle" style={{width:40, height:40, flexShrink:0}}/>
              <div style={{flex:1}}>
                <div className="sk" style={{height:12, width:"50%"}}/>
                <div className="sk" style={{height:10, width:"75%", marginTop:8}}/>
              </div>
              <div className="sk sk-pill" style={{width:54, height:18}}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WebSkeleton() {
  return (
    <div className="auth-m" style={{background:"var(--slate-50)"}}>
      <div style={{display:"grid", gridTemplateColumns:"220px 1fr", height:"100%"}}>
        <div style={{background:"#fff", borderRight:"1px solid var(--border-1)", padding:16}}>
          <div className="sk" style={{width:32, height:32, borderRadius:9, marginBottom:18}}/>
          {[1,2,3,4,5,6,7].map(i=>(
            <div key={i} style={{display:"flex", gap:10, padding:"8px 6px"}}>
              <div className="sk sk-circle" style={{width:18, height:18}}/>
              <div className="sk" style={{height:14, width: 70 + (i*7)%50}}/>
            </div>
          ))}
        </div>
        <div style={{padding:24}}>
          <div style={{display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:24}}>
            <div>
              <div className="sk" style={{height:30, width:200}}/>
              <div className="sk" style={{height:14, width:320, marginTop:10}}/>
            </div>
            <div className="sk" style={{height:38, width:160, borderRadius:10}}/>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:16, marginBottom:20}}>
            {[1,2,3,4].map(i=>(
              <div key={i} style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:16}}>
                <div className="sk" style={{height:10, width:"50%"}}/>
                <div className="sk" style={{height:28, width:"60%", marginTop:12}}/>
                <div className="sk" style={{height:10, width:"80%", marginTop:8}}/>
              </div>
            ))}
          </div>

          <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:12, padding:20}}>
            <div className="sk" style={{height:16, width:140, marginBottom:14}}/>
            <div style={{display:"flex", gap:24, paddingBottom:14, borderBottom:"1px solid var(--border-2)"}}>
              {["20%","16%","18%","16%","14%","16%"].map((w,i)=>(
                <div key={i} className="sk" style={{height:10, width:w, flex:1}}/>
              ))}
            </div>
            {[1,2,3,4,5].map(i=>(
              <div key={i} style={{display:"flex", gap:24, padding:"14px 0", borderBottom: i<5?"1px solid var(--border-2)":"none"}}>
                {["20%","16%","18%","16%","14%","16%"].map((w,j)=>(
                  <div key={j} className="sk" style={{height:12, width:w, flex:1}}/>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  MobPlanLocked, WebPlanLocked,
  MobOffline, WebOffline,
  MobPermissionDenied, WebPermissionDenied,
  MobEditLock, WebEditLock,
  MobSkeleton, WebSkeleton,
});
