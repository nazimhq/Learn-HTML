export default function Settings(){
  return <div className="page">
    <div className="top"><div><div className="title">Settings</div><div className="muted">Company &amp; integration configuration</div></div></div>
    <div className="split stagger">
      <div className="card stack"><h3>Company</h3>
        <label htmlFor="company">Company name<input id="company" className="input" defaultValue="Hizli"/></label>
        <label htmlFor="prefix">SKU prefix<input id="prefix" className="input" defaultValue="HZ"/></label>
        <label htmlFor="currency">Currency<input id="currency" className="input" defaultValue="GBP"/></label>
        <label htmlFor="timezone">Timezone<input id="timezone" className="input" defaultValue="Europe/London"/></label>
        <div><button className="btn" type="button">Save</button></div>
      </div>
      <div className="card"><h3>Integrations</h3>
        <p>AI product analysis: configure OPENAI_API_KEY.</p>
        <p>eBay: integration-ready; OAuth credentials required.</p>
        <p>Vinted: manual workflow by default; API can be added when access is available.</p>
      </div>
    </div>
  </div>;
}
