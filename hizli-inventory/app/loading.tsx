export default function Loading(){
  return <div className="page">
    <div className="top"><div><div className="skeleton line" style={{width:220,height:28}}/></div></div>
    <div className="grid">{[0,1,2,3].map(i=><div className="skeleton tile" key={i}/>)}</div>
  </div>;
}
