// Lote A — Auth & Onboarding · Mobile screens
// 5 screens: Login, Cadastro, Esqueci senha, Selecionar empresa, Criar empresa.
// Each is rendered inside an <AndroidDevice> via a wrapper in the canvas.

const { useState } = React;
const I = (props) => <AuthIcon {...props} />;

// ─────────────────────────────────────────────────────────────
// 1 · Login
// ─────────────────────────────────────────────────────────────
function MobLogin() {
  return (
    <div className="auth-m">
      <div className="auth-m-top" style={{minHeight: 24}}/>
      <div className="auth-m-body">
        <div className="auth-m-logo"><OrcivoGlyph size={28}/></div>
        <h1>Entrar no Orcivo</h1>
        <p className="sub">Acesse sua conta para continuar.</p>

        <div className="auth-field">
          <label className="lbl">Email</label>
          <div className="auth-input-wrap">
            <span className="leading"><I name="mail" size={18}/></span>
            <input className="auth-input has-leading" placeholder="voce@exemplo.com.br" defaultValue="joao@ribeiroeletrica.com.br"/>
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
            <input type="password" className="auth-input has-leading has-trailing" placeholder="••••••••" defaultValue="passwordpassword"/>
          </div>
        </div>

        <div style={{height:8}}/>
        <button className="auth-btn primary">Entrar</button>

        <div className="auth-divider">ou</div>

        <button className="auth-btn outline">
          <I name="fingerprint" size={20} color="var(--purple-700)"/> Entrar com biometria
        </button>

        <div className="auth-footer-link">
          Ainda não tem conta? <span className="auth-link">Criar conta</span>
        </div>
      </div>
      <div className="auth-tos">
        Ao continuar você aceita os <span className="auth-link" style={{fontSize:12}}>Termos</span> e a <span className="auth-link" style={{fontSize:12}}>Política de privacidade</span>.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2 · Cadastro
// ─────────────────────────────────────────────────────────────
function MobSignup() {
  return (
    <div className="auth-m">
      <div className="auth-m-top">
        <div className="auth-m-back"><I name="back" size={20}/></div>
      </div>
      <div className="auth-m-body">
        <h1>Crie sua conta</h1>
        <p className="sub">Comece grátis. Sem cartão de crédito.</p>

        <div className="auth-field">
          <label className="lbl">Nome completo</label>
          <div className="auth-input-wrap">
            <span className="leading"><I name="user" size={18}/></span>
            <input className="auth-input has-leading" placeholder="João da Silva" defaultValue="João Ribeiro"/>
          </div>
        </div>

        <div className="auth-field">
          <label className="lbl">Email</label>
          <div className="auth-input-wrap">
            <span className="leading"><I name="mail" size={18}/></span>
            <input className="auth-input has-leading" placeholder="voce@exemplo.com.br" defaultValue="joao@ribeiroeletrica.com.br"/>
          </div>
        </div>

        <div className="auth-field">
          <label className="lbl">Celular</label>
          <div className="auth-input-wrap">
            <span className="leading"><I name="phone" size={18}/></span>
            <input className="auth-input has-leading" placeholder="(11) 90000-0000" defaultValue="(11) 98123-4521"/>
          </div>
          <div className="auth-helper">Usado para recuperar sua conta e notificações.</div>
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

        <div className="auth-check checked" style={{marginTop:8}}>
          <div className="box"><I name="check" size={14}/></div>
          <div>Concordo com os <span className="auth-link" style={{fontSize:13}}>Termos de uso</span> e a <span className="auth-link" style={{fontSize:13}}>Política de privacidade</span> do Orcivo.</div>
        </div>

        <div style={{height:8}}/>
        <button className="auth-btn primary">Criar minha conta</button>

        <div className="auth-footer-link">
          Já tem conta? <span className="auth-link">Entrar</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3 · Esqueci senha (variant: sent state on right of canvas)
// ─────────────────────────────────────────────────────────────
function MobForgot() {
  return (
    <div className="auth-m">
      <div className="auth-m-top">
        <div className="auth-m-back"><I name="back" size={20}/></div>
      </div>
      <div className="auth-m-body">
        <h1>Recuperar acesso</h1>
        <p className="sub">Informe o email cadastrado. Enviaremos um link para criar uma nova senha.</p>

        <div className="auth-field">
          <label className="lbl">Email</label>
          <div className="auth-input-wrap">
            <span className="leading"><I name="mail" size={18}/></span>
            <input className="auth-input has-leading" placeholder="voce@exemplo.com.br" defaultValue="joao@ribeiroeletrica.com.br"/>
          </div>
        </div>

        <div style={{height:8}}/>
        <button className="auth-btn primary">Enviar link de recuperação</button>
        <button className="auth-btn ghost" style={{marginTop:8}}>Voltar para entrar</button>

        <div style={{marginTop:32, padding:"16px", background:"var(--slate-50)", border:"1px solid var(--border-1)", borderRadius:14}}>
          <div style={{display:"flex", gap:10, alignItems:"flex-start"}}>
            <div style={{width:32, height:32, borderRadius:8, background:"var(--purple-100)", color:"var(--purple-700)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
              <I name="shield" size={16}/>
            </div>
            <div style={{fontSize:13, color:"var(--fg-2)", lineHeight:"18px"}}>
              Por segurança, sempre retornamos a mesma mensagem, mesmo que o email não esteja cadastrado.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3b · Esqueci senha — estado pós-envio
function MobForgotSent() {
  return (
    <div className="auth-m">
      <div className="auth-m-top">
        <div className="auth-m-back"><I name="back" size={20}/></div>
      </div>
      <div className="auth-m-body" style={{display:"flex", flexDirection:"column"}}>
        <div style={{width:72, height:72, borderRadius:18, background:"var(--success-bg)", color:"var(--success)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24}}>
          <I name="mail" size={32} stroke={1.8}/>
        </div>
        <h1>Verifique seu email</h1>
        <p className="sub">Enviamos um link de recuperação para <strong style={{color:"var(--ink)"}}>j***@ribeiroeletrica.com.br</strong>. Abra o email e clique no botão para criar uma nova senha.</p>

        <div className="code-card" style={{marginBottom:16}}>
          <div className="ic"><I name="info" size={18}/></div>
          <div style={{fontSize:13, color:"var(--fg-2)", lineHeight:"18px"}}>
            <div style={{fontWeight:600, color:"var(--ink)", marginBottom:2}}>O link expira em 30 minutos</div>
            Caso não receba, verifique a caixa de spam.
          </div>
        </div>

        <button className="auth-btn outline">Reenviar em <strong style={{marginLeft:4}}>0:47</strong></button>
        <button className="auth-btn ghost" style={{marginTop:8}}>Tentar outro email</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4 · Selecionar empresa
// ─────────────────────────────────────────────────────────────
function MobSelectCompany() {
  return (
    <div className="auth-m">
      <div className="auth-m-top">
        <div style={{flex:1}}/>
        <span className="auth-link" style={{fontSize:13}}>Sair</span>
      </div>
      <div className="auth-m-body">
        <h1>Qual empresa hoje?</h1>
        <p className="sub">Você pertence a 3 empresas. Escolha uma para continuar; você pode trocar depois.</p>

        <div className="company-row selected">
          <div className="company-logo dark">RE</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              <div style={{fontWeight:600, fontSize:15}}>Ribeiro Elétrica</div>
              <span className="m-badge b-brand" style={{padding:"2px 7px", fontSize:10}}>ORCIVO MAIS</span>
            </div>
            <div style={{fontSize:13, color:"var(--fg-3)", marginTop:2}}>CNPJ · Você é dono · 3 técnicos</div>
          </div>
          <div style={{width:24, height:24, borderRadius:"50%", background:"var(--purple-600)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <I name="check" size={14}/>
          </div>
        </div>

        <div className="company-row">
          <div className="company-logo">MS</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              <div style={{fontWeight:600, fontSize:15}}>Marcos Solar</div>
              <span className="m-badge b-slate" style={{padding:"2px 7px", fontSize:10}}>LIVRE</span>
            </div>
            <div style={{fontSize:13, color:"var(--fg-3)", marginTop:2}}>CNPJ · Você é técnico</div>
          </div>
        </div>

        <div className="company-row">
          <div className="company-logo soft">JR</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              <div style={{fontWeight:600, fontSize:15}}>João Ribeiro · MEI</div>
            </div>
            <div style={{fontSize:13, color:"var(--fg-3)", marginTop:2}}>CPF · Conta pessoal · Sem assinatura</div>
          </div>
        </div>

        <div style={{height:8}}/>
        <div className="add-company-row">
          <div className="company-logo" style={{background:"transparent", border:"1.5px dashed var(--purple-300)", color:"var(--purple-700)"}}>
            <I name="plus" size={20}/>
          </div>
          <div style={{flex:1, fontWeight:600, fontSize:14}}>Criar nova empresa</div>
          <I name="chev-right" size={18}/>
        </div>

        <div style={{height:24}}/>
        <button className="auth-btn primary">Continuar como Ribeiro Elétrica</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5 · Criar empresa (wizard step 1 of 3)
// ─────────────────────────────────────────────────────────────
function MobCreateCompany() {
  return (
    <div className="auth-m">
      <div className="auth-m-top">
        <div className="auth-m-back"><I name="back" size={20}/></div>
        <div style={{flex:1, fontSize:13, color:"var(--fg-3)", textAlign:"center", fontWeight:500}}>Passo 1 de 3</div>
        <div style={{width:36}}/>
      </div>
      <div className="auth-m-body">
        <h1>Sobre sua empresa</h1>
        <p className="sub">Esses dados aparecem nos seus orçamentos. Você pode editar depois.</p>

        <div className="seg">
          <button className="active">CNPJ</button>
          <button>CPF / autônomo</button>
        </div>

        <div className="auth-field">
          <label className="lbl">CNPJ</label>
          <div className="auth-input-wrap">
            <input className="auth-input" placeholder="00.000.000/0000-00" defaultValue="12.345.678/0001-90"/>
            <span className="trailing" style={{color:"var(--success)"}}><I name="check-circle" size={18}/></span>
          </div>
          <div className="auth-helper" style={{color:"var(--success)"}}>Encontramos: Ribeiro Elétrica e Manutenção LTDA</div>
        </div>

        <div className="auth-field">
          <label className="lbl">Nome fantasia</label>
          <input className="auth-input" defaultValue="Ribeiro Elétrica"/>
          <div className="auth-helper">Aparece no orçamento e no PDF.</div>
        </div>

        <div className="auth-field">
          <label className="lbl">Telefone comercial</label>
          <div className="auth-input-wrap">
            <span className="leading"><I name="phone" size={18}/></span>
            <input className="auth-input has-leading" defaultValue="(11) 4002-8922"/>
          </div>
        </div>

        <div className="auth-field">
          <label className="lbl">Segmento</label>
          <div className="auth-input-wrap">
            <input className="auth-input has-trailing" defaultValue="Elétrica e automação"/>
            <span className="trailing"><I name="chev-down" size={18}/></span>
          </div>
        </div>

        <div style={{height:8}}/>
        <button className="auth-btn primary">Continuar <I name="arrow-right" size={18}/></button>

        <div className="wiz-dots">
          <div className="wiz-dot active"/><div className="wiz-dot"/><div className="wiz-dot"/>
        </div>
      </div>
    </div>
  );
}

// Export all
Object.assign(window, {
  MobLogin, MobSignup, MobForgot, MobForgotSent, MobSelectCompany, MobCreateCompany,
});
