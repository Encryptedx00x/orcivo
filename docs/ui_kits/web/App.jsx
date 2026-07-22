function App() {
  const [route, setRoute] = React.useState("dashboard");
  const onNav = id => setRoute(id);
  return (
    <div className="app">
      <Sidebar route={route==="quote-new"?"quotes":route} onNav={onNav}/>
      <div className="main">
        <TopBar/>
        {route==="dashboard"  && <Dashboard onNav={onNav}/>}
        {route==="customers"  && <Customers/>}
        {route==="catalog"    && <Catalog/>}
        {route==="quotes"     && <Quotes onNav={onNav}/>}
        {route==="quote-new"  && <QuoteEditor onNav={onNav}/>}
        {route==="work-orders"&& <WorkOrders/>}
        {route==="agenda"     && <Agenda/>}
        {route==="finance"    && <Finance/>}
        {route==="settings"   && <Settings/>}
      </div>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
