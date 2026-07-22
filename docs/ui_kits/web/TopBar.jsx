function TopBar() {
  return (
    <header className="topbar">
      <div className="search">
        <Icon name="search" size={16} color="#64748B" />
        <input placeholder="Buscar clientes, orçamentos, OS…" />
      </div>
      <div className="grow" />
      <div className="iconbtn"><Icon name="bell" size={18} /></div>
      <div className="iconbtn"><Icon name="cog" size={18} /></div>
    </header>
  );
}
window.TopBar = TopBar;
