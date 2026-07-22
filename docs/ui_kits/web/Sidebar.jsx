// Sidebar — Orcivo web app
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "customers", label: "Clientes", icon: "users" },
  { id: "catalog", label: "Catálogo", icon: "pkg" },
  { id: "quotes", label: "Orçamentos", icon: "file" },
  { id: "work-orders", label: "Ordens de Serviço", icon: "clip" },
  { id: "agenda", label: "Agenda", icon: "cal" },
  { id: "finance", label: "Financeiro", icon: "money" },
  { id: "documents", label: "Documentos", icon: "file" },
  { id: "settings", label: "Configurações", icon: "cog" },
];

function Sidebar({ route, onNav }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12 10 17 19 7" />
          </svg>
        </div>
        <div className="brand-name">Orcivo</div>
      </div>
      <div className="nav-section">Principal</div>
      {navItems.slice(0, 8).map(it => (
        <div key={it.id}
             className={"nav-item" + (route === it.id ? " active" : "")}
             onClick={() => onNav(it.id)}>
          <Icon name={it.icon} size={18} />
          <span>{it.label}</span>
        </div>
      ))}
      <div className="nav-section">Conta</div>
      <div className={"nav-item" + (route === "settings" ? " active" : "")} onClick={() => onNav("settings")}>
        <Icon name="cog" size={18} /><span>Configurações</span>
      </div>
      <div className="footer">
        <div className="avatar">JR</div>
        <div>
          <div className="who">João Ribeiro</div>
          <div className="biz">Ribeiro Elétrica · Orcivo Mais</div>
        </div>
      </div>
    </aside>
  );
}
window.Sidebar = Sidebar;
