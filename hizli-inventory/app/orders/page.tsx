export default function Orders(){
  return <div className="page">
    <div className="top">
      <div><div className="title">Orders</div><div className="muted">Manual eBay/Vinted orders now; API sync later</div></div>
      <button className="btn" type="button">+ Quick Sale</button>
    </div>
    <div style={{overflowX:'auto'}}>
      <table className="table">
        <thead><tr><th>Order</th><th>Channel</th><th>SKU</th><th>Qty</th><th>Status</th><th>Total</th></tr></thead>
        <tbody>
          <tr><td>HZ-ORD-1001</td><td>eBay</td><td>HZ-AF-000124</td><td>1</td><td><span className="badge">Picking</span></td><td>£39.99</td></tr>
          <tr><td>HZ-ORD-1002</td><td>Vinted</td><td>HZ-KT-000126</td><td>2</td><td><span className="badge good">Paid</span></td><td>£49.98</td></tr>
        </tbody>
      </table>
    </div>
  </div>;
}
