export type Product={id:string;sku:string;title:string;category:string;condition:string;location:string;physical:number;reserved:number;cost:number;price:number;image:string;ebay:boolean;vinted:boolean};
export const products:Product[]=[
{id:'1',sku:'HZ-AF-000124',title:'Black Dual Basket Air Fryer',category:'Kitchen Appliances',condition:'Customer Return',location:'A-03-01',physical:10,reserved:2,cost:18,price:39.99,image:'/demo/airfryer.svg',ebay:true,vinted:true},
{id:'2',sku:'HZ-VC-000125',title:'Cordless Vacuum Cleaner',category:'Home Appliances',condition:'Open Box',location:'B-02-02',physical:5,reserved:1,cost:24,price:54.99,image:'/demo/vacuum.svg',ebay:true,vinted:false},
{id:'3',sku:'HZ-KT-000126',title:'3 Tier Black Utility Trolley',category:'Home Storage',condition:'New Other',location:'C-01-01',physical:14,reserved:0,cost:9.5,price:24.99,image:'/demo/trolley.svg',ebay:false,vinted:true}
];
export const available=(p:Product)=>p.physical-p.reserved;
