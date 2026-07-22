// Lote A — Auth & Onboarding · Web screens
// 3 screens: Login, Cadastro, Criar empresa (wizard).

const I = (props) => <AuthIcon {...props} />;

// Shared dark "art" panel
function AwArt({ headline, sub, quote, who, role }) {
  return (
    <div className="aw-art">
      <div className="aw-art-grid"/>
      <div className="aw-art-mark"><OrcivoGlyph size={22}/></div>
      <div className="aw-art-words">
        {headline && <h2>{headline}</h2>}
        {sub && <p>{sub}</p>}
        {quote && (
          <div className="aw-art-quote">
            <div className="who">
              <div className="av">{(who||"").split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
              <div>
                <div style={{fontWeight:600, fontSize:13}}>{who}</div>
                <div style={{fontSize:12, color:"rgba(255,255,255,0.6)"}}>{role}</div>
              </div>
            </div>
            <p>{quote}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1 · Login (web)
// ─────────────────────────────────────────────────────────────
function WebLogin() {
  return (
    <div className="aw-shell">
      <AwArt
        headline="Orçamentos profissionais. Em minutos."
        sub="A plataforma feita para técnicos instaladores criarem orçamentos, organizarem serviços e atenderem melhor seus clientes pelo celular e pelo computador."
        quote="Antes eu fazia orçamento no Word às 22h. Agora eu faço no celular dentro do cliente, e ele já assina ali."
        who="Marcos Pereira"
        role="Elétrica · São Paulo"
      />
      <div className="aw-form-col">
        <div className="aw-form-top">
          <div/>
          <div className="mini-link">Novo no Orcivo? <a>Criar conta grátis</a></div>
        </div>
        <div className="aw-form-center">
          <h1>Entrar na sua conta</h1>
          <p className="sub">Bom te ver de novo.</p>

          <div className="auth-field">
            <label className="lbl">Email</label>
            <div className="auth-input-wrap">
              <span className="leading"><I name="mail" size={18}/></span>
              <input className="auth-input has-leading" defaultValue="joao@ribeiroeletrica.com.br"/>
            </div>
          </div>

          <div className="auth-field">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
              <label className="lbl">Senha</label>
              <span className="auth-link" style={{fontSize:12}}>Esqueci minha senha</span>
            </div>
            <div className="auth-input-wrap">
              <span className="leading"><I name="lock" size={18}/></span>
              <span className="trailing"><I name="eye" size={18}/></span>
              <input type="password" className="auth-input has-leading has-trailing" defaultValue="passwordpassword"/>
            </div>
          </div>

          <div className="auth-check checked" style={{padding:"4px 0 16px"}}>
            <div className="box"><I name="check" size={14}/></div>
            <div>Manter conectado neste computador</div>
          </div>

          <button className="auth-btn primary">Entrar</button>
        </div>
        <div className="aw-form-foot">
          © 2026 Orcivo · <span className="auth-link" style={{fontSize:12}}>Termos</span> · <span className="auth-link" style={{fontSize:12}}>Privacidade</span> · <span className="auth-link" style={{fontSize:12}}>Suporte</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2 · Cadastro (web)
// ─────────────────────────────────────────────────────────────
function WebSignup() {
  return (
    <div className="aw-shell">
      <AwArt
        headline="Comece grátis. Cresça quando precisar."
        sub="Comece grátis, sem cartão. Depois, escolha o plano que cabe no seu mês ou continue no plano Livre."
        quote="Migrei do Excel num sábado e na segunda já estava enviando orçamento com a minha marca."
        who="Ana Souza"
        role="Refrigeração · Guarulhos"
      />
      <div className="aw-form-col">
        <div className="aw-form-top">
          <div/>
          <div className="mini-link">Já tem conta? <a>Entrar</a></div>
        </div>
        <div className="aw-form-center" style={{maxWidth:420}}>
          <h1>Criar sua conta</h1>
          <p className="sub">Em 1 minuto você já está fazendo seu primeiro orçamento.</p>

          <div className="auth-field">
            <label className="lbl">Nome completo</label>
            <div className="auth-input-wrap">
              <span className="leading"><I name="user" size={18}/></span>
              <input className="auth-input has-leading" defaultValue="João Ribeiro"/>
            </div>
          </div>

          <div className="auth-field">
            <label className="lbl">Email</label>
            <div className="auth-input-wrap">
              <span className="leading"><I name="mail" size={18}/></span>
              <input className="auth-input has-leading" defaultValue="joao@ribeiroeletrica.com.br"/>
            </div>
          </div>

          <div className="aw-grid-2">
            <div className="auth-field">
              <label className="lbl">Celular</label>
              <div className="auth-input-wrap">
                <span className="leading"><I name="phone" size={18}/></span>
                <input className="auth-input has-leading" defaultValue="(11) 98123-4521"/>
              </div>
            </div>
            <div className="auth-field">
              <label className="lbl">Como você se chama no app?</label>
              <input className="auth-input" defaultValue="João"/>
            </div>
          </div>

          <div className="auth-field">
            <label className="lbl">Senha</label>
            <div className="auth-input-wrap">
              <span className="leading"><I name="lock" size={18}/></span>
              <span className="trailing"><I name="eye-off" size={18}/></span>
              <input type="text" className="auth-input has-leading has-trailing" defaultValue="Eletro@2026!"/>
            </div>
            <div className="pwd-strength">
              <div className="pwd-bar on"/><div className="pwd-bar on"/><div className="pwd-bar on"/><div className="pwd-bar"/>
            </div>
            <div className="auth-helper" style={{color:"var(--success)"}}>Senha forte · 11 caracteres, símbolo e número</div>
          </div>

          <div className="auth-check checked" style={{marginTop:4}}>
            <div className="box"><I name="check" size={14}/></div>
            <div>Concordo com os <span className="auth-link" style={{fontSize:13}}>Termos de uso</span> e a <span className="auth-link" style={{fontSize:13}}>Política de privacidade</span>.</div>
          </div>

          <div style={{height:8}}/>
          <button className="auth-btn primary">Criar minha conta grátis</button>

          <div style={{display:"flex", gap:8, alignItems:"center", justifyContent:"center", marginTop:14, color:"var(--fg-3)", fontSize:12}}>
            <I name="shield" size={14}/> Não pedimos cartão · cancele quando quiser
          </div>
        </div>
        <div className="aw-form-foot">© 2026 Orcivo</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3 · Criar empresa (web wizard, step 2 of 3)
// ─────────────────────────────────────────────────────────────
function WebCreateCompany() {
  return (
    <div style={{background:"var(--slate-50)", height:"100%", width:"100%", display:"flex", flexDirection:"column"}}>
      {/* slim top bar */}
      <div style={{height:60, background:"#fff", borderBottom:"1px solid var(--border-1)", padding:"0 32px", display:"flex", alignItems:"center", gap:12}}>
        <div style={{width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#0A0A0F,#6D28D9)", display:"flex", alignItems:"center", justifyContent:"center"}}>
          <OrcivoGlyph size={18}/>
        </div>
        <div style={{fontWeight:700, fontSize:16, letterSpacing:"-0.01em"}}>Orcivo</div>
        <div style={{flex:1}}/>
        <div style={{display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--fg-3)"}}>
          <div style={{width:28, height:28, borderRadius:"50%", background:"var(--purple-100)", color:"var(--purple-800)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:12}}>JR</div>
          João Ribeiro
        </div>
      </div>

      <div style={{flex:1, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"48px 32px"}}>
        <div style={{width:"100%", maxWidth:680}}>
          {/* steps */}
          <div className="aw-steps">
            <div className="aw-step done"><div className="num"><I name="check" size={14}/></div><div className="label">Conta</div></div>
            <div className="aw-step-sep"/>
            <div className="aw-step active"><div className="num">2</div><div className="label">Empresa</div></div>
            <div className="aw-step-sep"/>
            <div className="aw-step"><div className="num">3</div><div className="label">Identidade</div></div>
          </div>

          <div style={{background:"#fff", border:"1px solid var(--border-1)", borderRadius:16, padding:"32px 36px"}}>
            <h1 style={{fontSize:24, lineHeight:"32px", fontWeight:700, letterSpacing:"-0.015em", margin:"0 0 6px"}}>Cadastre sua empresa</h1>
            <p style={{color:"var(--fg-3)", fontSize:14, margin:"0 0 24px"}}>Esses dados aparecem no PDF do orçamento e no perfil público dos seus clientes.</p>

            <div className="seg" style={{maxWidth:320}}>
              <button className="active">CNPJ</button>
              <button>CPF / autônomo</button>
            </div>

            <div className="aw-grid-2">
              <div className="auth-field">
                <label className="lbl">CNPJ</label>
                <div className="auth-input-wrap">
                  <input className="auth-input has-trailing" defaultValue="12.345.678/0001-90"/>
                  <span className="trailing" style={{color:"var(--success)"}}><I name="check-circle" size={18}/></span>
                </div>
                <div className="auth-helper" style={{color:"var(--success)"}}>Ribeiro Elétrica e Manutenção LTDA</div>
              </div>
              <div className="auth-field">
                <label className="lbl">Inscrição estadual <span style={{color:"var(--fg-3)", fontWeight:400}}>(opcional)</span></label>
                <input className="auth-input" placeholder="000.000.000.000"/>
              </div>
            </div>

            <div className="aw-grid-2">
              <div className="auth-field">
                <label className="lbl">Nome fantasia</label>
                <input className="auth-input" defaultValue="Ribeiro Elétrica"/>
                <div className="auth-helper">Aparece no PDF e nas comunicações.</div>
              </div>
              <div className="auth-field">
                <label className="lbl">Razão social</label>
                <input className="auth-input" defaultValue="Ribeiro Elétrica e Manutenção LTDA"/>
              </div>
            </div>

            <div className="aw-grid-2">
              <div className="auth-field">
                <label className="lbl">Telefone comercial</label>
                <div className="auth-input-wrap">
                  <span className="leading"><I name="phone" size={18}/></span>
                  <input className="auth-input has-leading" defaultValue="(11) 4002-8922"/>
                </div>
              </div>
              <div className="auth-field">
                <label className="lbl">Segmento principal</label>
                <div className="auth-input-wrap">
                  <input className="auth-input has-trailing" defaultValue="Elétrica e automação"/>
                  <span className="trailing"><I name="chev-down" size={18}/></span>
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label className="lbl">Tamanho da equipe</label>
              <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                {["Só eu","2-3 técnicos","4-8 técnicos","9+"].map((t,i)=>(
                  <div key={i} style={{
                    padding:"10px 16px", borderRadius:10, fontSize:14, fontWeight:500, cursor:"pointer",
                    border:"1px solid " + (i===1 ? "var(--purple-600)" : "var(--border-1)"),
                    background: i===1 ? "var(--purple-50)" : "#fff",
                    color: i===1 ? "var(--purple-800)" : "var(--ink)",
                  }}>{t}</div>
                ))}
              </div>
            </div>

            <div style={{display:"flex", gap:12, justifyContent:"space-between", alignItems:"center", marginTop:20, paddingTop:20, borderTop:"1px solid var(--border-2)"}}>
              <button className="auth-btn ghost" style={{width:"auto", padding:"0 16px"}}>← Voltar</button>
              <div style={{flex:1}}/>
              <button className="auth-btn outline" style={{width:"auto", padding:"0 16px"}}>Pular por agora</button>
              <button className="auth-btn primary" style={{width:"auto", padding:"0 20px"}}>Continuar <I name="arrow-right" size={18}/></button>
            </div>
          </div>

          <div style={{textAlign:"center", marginTop:18, color:"var(--fg-3)", fontSize:13}}>
            Precisa de ajuda? <span className="auth-link">Fale com a gente</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WebLogin, WebSignup, WebCreateCompany });
