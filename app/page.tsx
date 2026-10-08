"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Beef, Bell, ChevronDown, CircleDollarSign, ClipboardCheck, CloudSun, FileText, Gauge, Inbox, Leaf, LogOut, Map, Menu, Mic, Package, Plus, ScanLine, Search, Settings, ShoppingCart, Sprout, Tractor, TrendingUp, Trash2, Video, Wheat, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster, toast } from "sonner";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type View="dashboard"|"parcels"|"animals"|"passport"|"diagnosis"|"stocks"|"cameras"|"pac"|"suppliers"|"invoices"|"finance"|"markets"|"weather"|"journal";
type Company={id:string;name:string;color:string;siret?:string|null};
type Parcel={id:string;company_id:string;name:string;surface_ha:number;culture:string;status:string;cost_per_ha:number};
type Animal={id:string;company_id:string;work_number:string;national_number?:string;sex?:string;breed?:string;birth_date?:string;mother_number?:string;status:string};
type Supplier={id:string;company_id:string;name:string;category:string;subcategory?:string;email?:string;annual_volume:number;status:string};
type Invoice={id:string;company_id:string;supplier_name:string;invoice_number:string;amount:number;due_date?:string;status:string;duplicate:boolean};
type Journal={id:string|number;company_id?:string;event_type:string;title:string;details:any;created_at:string};
type Data={companies:Company[];parcels:Parcel[];animals:Animal[];suppliers:Supplier[];invoices:Invoice[];journal:Journal[]};

const nav=[
 ["dashboard","Centre de contrôle",Gauge],["parcels","Parcelles & intrants",Tractor],["animals","Troupeau",Beef],["passport","Scan passeport",ScanLine],["diagnosis","Diagnostic blé",Sprout],["stocks","Foin & stocks",Package],["cameras","Caméras DMSS",Video],["pac","PAC & Géoportail",Map],["suppliers","Fournisseurs & achats",ShoppingCart],["invoices","Mails & factures",Inbox],["finance","Finances",CircleDollarSign],["markets","Cotations",TrendingUp],["weather","Météo",CloudSun],["journal","Journal",ClipboardCheck]
] as const;

const ids={a:"11111111-1111-4111-8111-111111111111",v:"22222222-2222-4222-8222-222222222222",b:"33333333-3333-4333-8333-333333333333"};
const seed:Data={
 companies:[{id:ids.a,name:"EARL Artemis",color:"#c67c4e"},{id:ids.v,name:"SCEA Vatan et fils",color:"#e3aa00"},{id:ids.b,name:"SCEA des Bonnédanes",color:"#4d7c66"}],
 parcels:[{id:crypto.randomUUID(),company_id:ids.a,name:"Les Bordos",surface_ha:13.1,culture:"Blé tendre",status:"Bon",cost_per_ha:38},{id:crypto.randomUUID(),company_id:ids.v,name:"Les Grandes",surface_ha:24.5,culture:"Maïs",status:"Bon",cost_per_ha:52},{id:crypto.randomUUID(),company_id:ids.b,name:"Pré du Moulin",surface_ha:18.2,culture:"Prairie",status:"À surveiller",cost_per_ha:21}],
 animals:[{id:crypto.randomUUID(),company_id:ids.a,work_number:"62-30",national_number:"FR 18 4125 6230",sex:"F",breed:"Charolaise",birth_date:"2027-02-12",mother_number:"4125",status:"Présent"},{id:crypto.randomUUID(),company_id:ids.v,work_number:"61-94",national_number:"FR 18 5531 6194",sex:"F",breed:"Charolaise",birth_date:"2026-12-08",mother_number:"3981",status:"Présent"}],
 suppliers:[{id:crypto.randomUUID(),company_id:ids.a,name:"AGRIAL",category:"Alimentation animale",annual_volume:64800,status:"active"},{id:crypto.randomUUID(),company_id:ids.a,name:"Distri Agri",category:"Énergie & carburant",annual_volume:43200,status:"active"}],
 invoices:[{id:crypto.randomUUID(),company_id:ids.a,supplier_name:"AGRIAL",invoice_number:"FAC-2027-184",amount:4280,due_date:"2027-03-03",status:"pending",duplicate:false}],
 journal:[{id:1,company_id:ids.a,event_type:"seed",title:"Espace de démonstration initialisé",details:{},created_at:new Date().toISOString()}]
};

function titleForCompany(data:Data,id:string){return data.companies.find(c=>c.id===id)?.name||"Entreprise"}
function money(n:number){return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n)}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
function Title({kicker,title,action}:{kicker:string;title:string;action?:React.ReactNode}){return <div className="title"><div><span>{kicker}</span><h1>{title}</h1></div>{action}</div>}
function Status({children,warn=false}:{children:React.ReactNode;warn?:boolean}){return <span className={`status ${warn?"warn":""}`}><i/>{children}</span>}

function Auth({onSession}:{onSession:(s:Session)=>void}){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[signup,setSignup]=useState(false),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);const sb=getSupabase();const result=signup?await sb.auth.signUp({email,password,options:{data:{full_name:email.split("@")[0]}}}):await sb.auth.signInWithPassword({email,password});setBusy(false);if(result.error)return toast.error(result.error.message);if(result.data.session)onSession(result.data.session);else toast.success("Consultez votre e-mail pour confirmer le compte.")}
 return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><i><Leaf/></i><div><b>AgriPilot</b><span>OS Agricole</span></div></div><h1>{signup?"Créer le premier compte":"Connexion"}</h1><p>Accédez aux données autorisées de vos exploitations.</p><form onSubmit={submit}><Field label="Adresse e-mail"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></Field><Field label="Mot de passe"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/></Field><button className="primary full" disabled={busy}>{busy?"Connexion…":signup?"Créer le compte":"Se connecter"}</button></form><button className="auth-link" onClick={()=>setSignup(!signup)}>{signup?"J’ai déjà un compte":"Créer un compte"}</button></section></main>
}

function useCrmData(session:Session|null){
 const cloud=isSupabaseConfigured();const [data,setData]=useState<Data>(seed),[loading,setLoading]=useState(cloud),[error,setError]=useState<string|null>(null);
 const persist=(next:Data)=>{setData(next);if(!cloud)localStorage.setItem("agripilot-demo",JSON.stringify(next))};
 const load=useCallback(async()=>{
  if(!cloud){const saved=localStorage.getItem("agripilot-demo");if(saved)try{setData(JSON.parse(saved))}catch{}setLoading(false);return}
  if(!session)return;setLoading(true);const sb=getSupabase();
  const access=await sb.from("user_company_access").select("company_id, companies(id,name,color,siret)");
  if(access.error){setError(access.error.message);setLoading(false);return}
  const companies=(access.data||[]).map((x:any)=>x.companies).filter(Boolean) as Company[];
  const [p,a,s,i,j]=await Promise.all([sb.from("parcels").select("*").order("name"),sb.from("animals").select("*").order("created_at",{ascending:false}),sb.from("suppliers").select("*").order("name"),sb.from("invoices").select("*").order("due_date"),sb.from("journal_entries").select("*").order("created_at",{ascending:false}).limit(100)]);
  const failed=[p,a,s,i,j].find(x=>x.error);if(failed?.error)setError(failed.error.message);else setData({companies,parcels:(p.data||[]) as Parcel[],animals:(a.data||[]) as Animal[],suppliers:(s.data||[]) as Supplier[],invoices:(i.data||[]) as Invoice[],journal:(j.data||[]) as Journal[]});setLoading(false);
 },[cloud,session]);
 useEffect(()=>{load()},[load]);
 async function create(table:keyof Pick<Data,"parcels"|"animals"|"suppliers"|"invoices">,record:any){
  if(cloud){const {error}=await getSupabase().from(table).insert(record);if(error)throw error;await load();return}
  const created={...record,id:crypto.randomUUID()};const entry:Journal={id:crypto.randomUUID(),company_id:record.company_id,event_type:`insert_${table}`,title:`Création ${table}`,details:{record_id:created.id},created_at:new Date().toISOString()};persist({...data,[table]:[created,...data[table] as any[]],journal:[entry,...data.journal]});
 }
 async function update(table:keyof Pick<Data,"parcels"|"animals"|"suppliers"|"invoices">,id:string,changes:any){
  if(cloud){const {error}=await getSupabase().from(table).update(changes).eq("id",id);if(error)throw error;await load();return}
  const list=(data[table] as any[]).map(x=>x.id===id?{...x,...changes}:x);const entry:Journal={id:crypto.randomUUID(),company_id:changes.company_id,event_type:`update_${table}`,title:`Modification ${table}`,details:{record_id:id,changes},created_at:new Date().toISOString()};persist({...data,[table]:list,journal:[entry,...data.journal]});
 }
 async function remove(table:keyof Pick<Data,"parcels"|"animals"|"suppliers"|"invoices">,id:string){
  if(cloud){const {error}=await getSupabase().from(table).delete().eq("id",id);if(error)throw error;await load();return}
  const old=(data[table] as any[]).find(x=>x.id===id);const entry:Journal={id:crypto.randomUUID(),company_id:old?.company_id,event_type:`delete_${table}`,title:`Suppression ${table}`,details:{record_id:id},created_at:new Date().toISOString()};persist({...data,[table]:(data[table] as any[]).filter(x=>x.id!==id),journal:[entry,...data.journal]});
 }
 return {data,loading,error,cloud,create,update,remove,reload:load};
}

function Dashboard({data,go}:{data:Data;go:(v:View)=>void}){
 const due=data.invoices.filter(i=>i.status==="pending");const hectares=data.parcels.reduce((s,p)=>s+Number(p.surface_ha),0);
 return <div className="view"><div className="welcome"><div><span>{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase()}</span><h1>Centre de contrôle</h1><p>Données calculées depuis les enregistrements actifs.</p></div><div className="weather"><CloudSun/><b>12°C</b><small>Connexion météo à configurer</small></div></div><div className="metrics"><div className="metric"><CircleDollarSign/><div><span>Factures en attente</span><b>{money(due.reduce((s,x)=>s+Number(x.amount),0))}</b><small>{due.length} facture(s)</small></div></div><div className="metric"><Tractor/><div><span>Surface suivie</span><b>{hectares.toLocaleString("fr-FR")} ha</b><small>{data.parcels.length} parcelle(s)</small></div></div><div className="metric"><Beef/><div><span>Animaux présents</span><b>{data.animals.filter(a=>a.status==="Présent").length}</b><small>{data.animals.length} enregistré(s)</small></div></div><div className="metric"><ShoppingCart/><div><span>Fournisseurs actifs</span><b>{data.suppliers.filter(s=>s.status==="active").length}</b><small>{money(data.suppliers.reduce((s,x)=>s+Number(x.annual_volume||0),0))} / an</small></div></div></div><div className="dash-grid"><section className="card dashboard-list"><Title kicker="À TRAITER" title="Échéances fournisseurs" action={<button className="link" onClick={()=>go("invoices")}>Ouvrir les factures</button>}/>{due.length?due.slice(0,5).map(i=><div className="record-line" key={i.id}><FileText/><div><b>{i.supplier_name}</b><span>{i.invoice_number} · échéance {i.due_date||"non définie"}</span></div><strong>{money(i.amount)}</strong></div>):<div className="empty-small">Aucune facture en attente</div>}</section><section className="card dashboard-list"><Title kicker="JOURNAL" title="Activité récente" action={<button className="link" onClick={()=>go("journal")}>Voir tout</button>}/>{data.journal.slice(0,5).map(j=><div className="record-line" key={j.id}><Activity/><div><b>{j.title}</b><span>{new Date(j.created_at).toLocaleString("fr-FR")}</span></div></div>)}</section></div></div>
}

function CrudDialog({kind,open,onOpen,data,companyId,onCreate}:{kind:"parcel"|"animal"|"supplier"|"invoice";open:boolean;onOpen:(x:boolean)=>void;data:Data;companyId:string;onCreate:(table:any,record:any)=>Promise<void>}){
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);let table="";let record:any={company_id:companyId};
  if(kind==="parcel"){table="parcels";record={...record,name:f.get("name"),surface_ha:Number(f.get("surface")),culture:f.get("culture"),status:"Bon",cost_per_ha:Number(f.get("cost")||0)}}
  if(kind==="animal"){table="animals";record={...record,work_number:f.get("work"),national_number:f.get("national"),sex:f.get("sex"),breed:f.get("breed"),birth_date:f.get("birth")||null,mother_number:f.get("mother"),status:"Présent"}}
  if(kind==="supplier"){table="suppliers";record={...record,name:f.get("name"),category:f.get("category"),subcategory:f.get("subcategory"),email:f.get("email"),annual_volume:Number(f.get("volume")||0),status:"active"}}
  if(kind==="invoice"){table="invoices";record={...record,supplier_name:f.get("supplier"),invoice_number:f.get("number"),amount:Number(f.get("amount")),due_date:f.get("due")||null,status:"pending",duplicate:false}}
  try{await onCreate(table,record);toast.success("Enregistrement sauvegardé");onOpen(false)}catch(err:any){toast.error(err.message)}
 }
 const labels={parcel:"Nouvelle parcelle",animal:"Nouvel animal",supplier:"Nouveau fournisseur",invoice:"Nouvelle facture"};
 return <Dialog open={open} onOpenChange={onOpen}><DialogContent><DialogHeader><DialogTitle>{labels[kind]}</DialogTitle><DialogDescription>Les données seront enregistrées et ajoutées au Journal.</DialogDescription></DialogHeader><form onSubmit={submit} className="crud-form">
  <Field label="Entreprise"><select name="company" value={companyId} disabled>{data.companies.map(c=><option key={c.id}>{c.name}</option>)}</select></Field>
  {kind==="parcel"&&<><Field label="Nom"><input name="name" required/></Field><Field label="Surface ha"><input name="surface" type="number" step="0.01" required/></Field><Field label="Culture"><input name="culture" required/></Field><Field label="Coût par ha"><input name="cost" type="number" step="0.01"/></Field></>}
  {kind==="animal"&&<><Field label="Numéro travail"><input name="work" required/></Field><Field label="Numéro national"><input name="national"/></Field><Field label="Sexe"><select name="sex"><option>F</option><option>M</option></select></Field><Field label="Race"><input name="breed" defaultValue="Charolaise"/></Field><Field label="Naissance"><input name="birth" type="date"/></Field><Field label="Mère"><input name="mother"/></Field></>}
  {kind==="supplier"&&<><Field label="Nom"><input name="name" required/></Field><Field label="Catégorie"><input name="category" required/></Field><Field label="Sous-catégorie"><input name="subcategory"/></Field><Field label="E-mail"><input name="email" type="email"/></Field><Field label="Volume annuel €"><input name="volume" type="number"/></Field></>}
  {kind==="invoice"&&<><Field label="Fournisseur"><input name="supplier" required/></Field><Field label="Numéro"><input name="number" required/></Field><Field label="Montant €"><input name="amount" type="number" step="0.01" required/></Field><Field label="Échéance"><input name="due" type="date"/></Field></>}
  <button className="primary full" type="submit">Enregistrer</button></form></DialogContent></Dialog>
}

function Records({kind,data,companyId,create,update,remove}:{kind:"parcel"|"animal"|"supplier"|"invoice";data:Data;companyId:string;create:any;update:any;remove:any}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState("");const config={parcel:{title:"Parcelles & intrants",kicker:"GESTION CULTURES",table:"parcels",icon:Tractor},animal:{title:"Troupeau",kicker:"GESTION CHEPTEL",table:"animals",icon:Beef},supplier:{title:"Fournisseurs & achats",kicker:"RÉPERTOIRE FOURNISSEURS",table:"suppliers",icon:ShoppingCart},invoice:{title:"Mails & factures",kicker:"SUIVI ADMINISTRATIF",table:"invoices",icon:Inbox}}[kind];
 const rows=(data[config.table as keyof Data] as any[]).filter(x=>(companyId==="all"||x.company_id===companyId)&&JSON.stringify(x).toLowerCase().includes(query.toLowerCase()));const activeCompany=companyId==="all"?data.companies[0]?.id:companyId;
 async function del(id:string){if(!confirm("Supprimer cet enregistrement ?"))return;try{await remove(config.table,id);toast.success("Enregistrement supprimé")}catch(e:any){toast.error(e.message)}}
 async function toggle(row:any){if(kind==="invoice")await update("invoices",row.id,{status:row.status==="paid"?"pending":"paid",company_id:row.company_id});else if(kind==="animal")await update("animals",row.id,{status:row.status==="Présent"?"Vendu":"Présent",company_id:row.company_id});else return;toast.success("Statut mis à jour")}
 return <div className="view"><Title kicker={`${config.kicker} · ${rows.length} ENREGISTREMENT(S)`} title={config.title} action={<button className="primary" onClick={()=>setOpen(true)} disabled={!activeCompany}><Plus/>Ajouter</button>}/><section className="card records-card"><div className="tools"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher…"/></label><Status>Données persistantes</Status></div><div className="record-table"><div className="record-row record-head"><span>Référence</span><span>Détails</span><span>Entreprise</span><span>Statut</span><span/></div>{rows.map(row=><div className="record-row" key={row.id}><span><b>{row.name||row.work_number||row.supplier_name}</b><small>{row.invoice_number||row.national_number||row.category||`${row.surface_ha} ha`}</small></span><span>{kind==="parcel"?`${row.culture} · ${money(row.cost_per_ha)}/ha`:kind==="animal"?`${row.sex||"-"} · ${row.breed||"-"}`:kind==="supplier"?money(row.annual_volume||0):`${money(row.amount)} · ${row.due_date||"sans échéance"}`}</span><span>{titleForCompany(data,row.company_id)}</span><button className="bare" onClick={()=>toggle(row)}><Status warn={row.status==="pending"||row.status==="À surveiller"}>{row.status}</Status></button><button className="delete" onClick={()=>del(row.id)} title="Supprimer"><Trash2/></button></div>)}</div>{!rows.length&&<div className="records-empty"><config.icon/><h3>Aucun enregistrement</h3><p>Ajoutez votre premier élément ou modifiez le filtre.</p></div>}</section><CrudDialog kind={kind} open={open} onOpen={setOpen} data={data} companyId={activeCompany} onCreate={create}/></div>
}

function JournalView({data,companyId}:{data:Data;companyId:string}){const rows=data.journal.filter(j=>companyId==="all"||j.company_id===companyId);return <div className="view"><Title kicker="AUDIT DES MODIFICATIONS" title="Journal & traçabilité"/><section className="card journal">{rows.map(j=><div key={j.id}><i><Activity/></i><main><time>{new Date(j.created_at).toLocaleString("fr-FR")}</time><h3>{j.title}</h3><p>{j.event_type}</p><span>{j.company_id?titleForCompany(data,j.company_id):"Système"}</span><span>Identifiant {String(j.details?.record_id||j.id).slice(0,8)}</span></main></div>)}</section></div>}

function Pending({view}:{view:View}){const name=nav.find(n=>n[0]===view)?.[1]||view;return <div className="view"><Title kicker="INTÉGRATION À CONFIGURER" title={name}/><section className="card pending-module"><Settings/><h2>Module préparé pour la prochaine intégration</h2><p>Le socle Supabase, l’authentification et le Journal sont prioritaires. Ce module sera connecté à son service externe après validation des accès.</p></section></div>}

export default function Page(){
 const cloud=isSupabaseConfigured(),[session,setSession]=useState<Session|null>(null),[authReady,setAuthReady]=useState(!cloud),[view,setView]=useState<View>("dashboard"),[company,setCompany]=useState("all"),[menu,setMenu]=useState(false),[terrain,setTerrain]=useState(false);const crm=useCrmData(session);
 useEffect(()=>{if(!cloud)return;const sb=getSupabase();sb.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)});const {data}=sb.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe()},[cloud]);
 async function logout(){if(cloud)await getSupabase().auth.signOut();setSession(null)}
 if(!authReady)return <main className="loading-page">Chargement sécurisé…</main>;if(cloud&&!session)return <Auth onSession={setSession}/>;
 const currentCompany=company==="all"?null:company;let content:React.ReactNode;
 if(view==="dashboard")content=<Dashboard data={crm.data} go={setView}/>;else if(view==="parcels")content=<Records kind="parcel" companyId={company} {...crm}/>;else if(view==="animals")content=<Records kind="animal" companyId={company} {...crm}/>;else if(view==="suppliers")content=<Records kind="supplier" companyId={company} {...crm}/>;else if(view==="invoices")content=<Records kind="invoice" companyId={company} {...crm}/>;else if(view==="journal")content=<JournalView data={crm.data} companyId={company}/>;else content=<Pending view={view}/>;
 return <div className={terrain?"app terrain":"app"}><aside className={menu?"sidebar open":"sidebar"}><div className="brand"><i><Leaf/></i><div><b>AgriPilot</b><span>OS Agricole</span></div><button onClick={()=>setMenu(false)}><X/></button></div><button className="company" onClick={()=>{const opts=["all",...crm.data.companies.map(c=>c.id)];setCompany(opts[(opts.indexOf(company)+1)%opts.length])}}><i>{currentCompany?titleForCompany(crm.data,currentCompany)[0]:"G"}</i><div><span>Vue active</span><b>{currentCompany?titleForCompany(crm.data,currentCompany):"Toutes les entreprises"}</b></div><ChevronDown/></button><nav>{nav.map(([id,label,I])=><button key={id} className={view===id?"active":""} onClick={()=>{setView(id as View);setMenu(false)}}><I/><span>{label}</span>{id==="invoices"&&crm.data.invoices.filter(i=>i.status==="pending").length>0&&<b>{crm.data.invoices.filter(i=>i.status==="pending").length}</b>}</button>)}</nav><footer><button><Settings/>Réglages</button>{cloud&&<button onClick={logout}><LogOut/>Déconnexion</button>}<div><i>{session?.user.email?.[0]?.toUpperCase()||"AC"}</i><span><b>{session?.user.email||"Mode démonstration"}</b><small>{cloud?"Compte Supabase":"Stockage local temporaire"}</small></span></div></footer></aside><main className="content"><header><button className="menu" onClick={()=>setMenu(true)}><Menu/></button><b>{nav.find(x=>x[0]===view)?.[1]}</b><div>{!cloud&&<span className="demo-badge">MODE LOCAL · CONNECTER SUPABASE</span>}<button className="mode" onClick={()=>setTerrain(!terrain)}><Tractor/>{terrain?"Mode cockpit":"Mode terrain"}</button><button><Bell/></button></div></header>{crm.error&&<div className="error-banner">Erreur Supabase : {crm.error}</div>}{crm.loading?<main className="loading-page">Chargement des données…</main>:content}</main>{terrain&&<div className="bottom"><button onClick={()=>setView("dashboard")}><Gauge/>Accueil</button><button onClick={()=>setView("parcels")}><Tractor/>Parcelle</button><button className="mic"><Mic/></button><button onClick={()=>setView("animals")}><Beef/>Troupeau</button><button onClick={()=>setView("journal")}><ClipboardCheck/>Journal</button></div>}<Toaster position="top-right" richColors/></div>
}
