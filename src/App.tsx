import { useEffect, useMemo, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import {
  AMBIENTES, ANTOJOS, COCINAS, CON_QUIEN, PERSONAS, PRESUPUESTOS,
  anonId, calcularMatch, contextoVacio, guardarContexto, leerContexto, rangoPrecio,
  type Contexto, type Restaurante,
} from "./lib/guiame";

type Pais = { id:string; nombre:string; codigo_iso2:string|null };
type Ciudad = { id:string; nombre:string; pais_id:string };
type Zona = { id:string; nombre:string; ciudad_id:string };

const clean = (v:any): Restaurante => ({
  id:v.id, nombre:v.nombre, pais_id:v.pais_id, ciudad_id:v.ciudad_id, zona_id:v.zona_id,
  direccion:v.direccion ?? null, cocina:Array.isArray(v.cocina)?v.cocina:[], especialidades:Array.isArray(v.especialidades)?v.especialidades:[],
  precio_min:v.precio_min ?? null, precio_max:v.precio_max ?? null,
  ambiente:Array.isArray(v.ambiente)?v.ambiente:[], contextos:Array.isArray(v.contextos)?v.contextos:[],
  lat:v.lat ?? null, lng:v.lng ?? null, telefono:v.telefono ?? null, web:v.web ?? null,
  horarios:v.horarios ?? null, capacidad_max:v.capacidad_max ?? null,
  imagen_url:v.imagen_url ?? null, fuente:v.fuente ?? null, estado:v.estado ?? "pendiente",
  food_avg:v.food_avg ?? null, decor_avg:v.decor_avg ?? null, service_avg:v.service_avg ?? null,
  num_evaluaciones:v.num_evaluaciones ?? 0, contexto_scores:v.contexto_scores ?? null,
  pct_volveria:v.pct_volveria ?? null, pct_recomendaria:v.pct_recomendaria ?? null,
  cost_avg:v.cost_avg ?? null, descripcion:v.descripcion ?? v.caracteristicas ?? null, platos_recomendados:v.platos_recomendados ?? null,
});

export default function App() {
  const [screen,setScreen]=useState<"home"|"results"|"detail"|"inscribe">("home");
  const [selected,setSelected]=useState<Restaurante|null>(null);
  const [ctx,setCtx]=useState<Contexto>(()=>leerContexto() ?? contextoVacio);
  const [paises,setPaises]=useState<Pais[]>([]);
  const [ciudades,setCiudades]=useState<Ciudad[]>([]);
  const [zonas,setZonas]=useState<Zona[]>([]);
  const [results,setResults]=useState<Restaurante[]>([]);
  const [loading,setLoading]=useState(true);
  const [searching,setSearching]=useState(false);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    let alive=true;
    (async()=>{
      const [p,c,z]=await Promise.all([
        supabase.from("paises").select("id,nombre,codigo_iso2").order("nombre"),
        supabase.from("ciudades").select("id,nombre,pais_id").order("nombre"),
        supabase.from("zonas").select("id,nombre,ciudad_id").order("nombre"),
      ]);
      if(!alive)return;
      const e=p.error||c.error||z.error;
      if(e){setError(e.message);setLoading(false);return;}
      setPaises((p.data??[]) as Pais[]); setCiudades((c.data??[]) as Ciudad[]); setZonas((z.data??[]) as Zona[]);
      setLoading(false);
    })().catch(e=>{if(alive){setError(e instanceof Error?e.message:String(e));setLoading(false)}})
    return ()=>{alive=false};
  },[]);

  const cities=useMemo(()=>ciudades.filter(x=>x.pais_id===ctx.paisId),[ciudades,ctx.paisId]);
  const zones=useMemo(()=>zonas.filter(x=>x.ciudad_id===ctx.ciudadId),[zonas,ctx.ciudadId]);
  const set=(patch:Partial<Contexto>)=>setCtx(x=>({...x,...patch}));

  async function buscar(){
    if(!ctx.paisId||!ctx.ciudadId||!ctx.zonaId)return;
    setSearching(true);setError(null);
    try{
      const {data,error:e}=await supabase.from("restaurantes").select("*")
        .eq("pais_id",ctx.paisId).eq("ciudad_id",ctx.ciudadId).eq("zona_id",ctx.zonaId).limit(100);
      if(e)throw e;
      const rs=(data??[]).map(clean);
      const ranked=rs.map(r=>({r,m:calcularMatch(r,ctx).match})).sort((a,b)=>b.m-a.m).map(x=>x.r);
      guardarContexto(ctx);setResults(ranked);setScreen("results");
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setSearching(false)}
  }

  if(screen==="inscribe") return <Inscription paises={paises} ciudades={ciudades} zonas={zonas} onBack={()=>setScreen("home")}/>;
  if(screen==="results") return <Results results={results} ctx={ctx} onBack={()=>setScreen("home")} onSelect={(r)=>{setSelected(r);setScreen("detail")}}/>;
  if(screen==="detail" && selected) return <Detail r={selected} ctx={ctx} onBack={()=>setScreen("results")}/>;

  return <div className="app">
    <header className="top"><div className="brand">GUÍA<span>·</span>ME</div><div className="tag">COME MEJOR. DECIDE MEJOR.</div></header>
    <main className="hero">
      <section className="intro">
        <p className="eyebrow">TU GUÍA GASTRONÓMICA PERSONAL</p>
        <h1>¿Dónde comemos<br/><em>hoy?</em></h1>
        <p className="lead">No te mostramos cien restaurantes. Encontramos los que mejor encajan contigo.</p>
      </section>
      <section className="card">
        <h2>Primero, dime dónde</h2>
        <div className="search-mode"><button className={ctx.modoBusqueda==="restaurante"?"chip active":"chip"} onClick={()=>set({modoBusqueda:"restaurante"})}>BUSCO UN RESTAURANTE</button><button className={ctx.modoBusqueda==="antojo"?"chip active":"chip"} onClick={()=>set({modoBusqueda:"antojo"})}>TENGO UN ANTOJO</button></div>
        {error&&<div className="error">{error}</div>}
        {loading?<div className="loading">Cargando lugares…</div>:<>
          <label>País</label>
          <div className="chips">{paises.map(p=><button key={p.id} className={ctx.paisId===p.id?"chip active":"chip"} onClick={()=>set({paisId:p.id,paisNombre:p.nombre,ciudadId:null,ciudadNombre:undefined,zonaId:null,zonaNombre:undefined})}>{p.nombre}</button>)}</div>
          {ctx.paisId&&<><label>Ciudad</label><select value={ctx.ciudadId??""} onChange={e=>{const x=cities.find(v=>v.id===e.target.value);set({ciudadId:e.target.value||null,ciudadNombre:x?.nombre,zonaId:null,zonaNombre:undefined})}}><option value="">Selecciona una ciudad</option>{cities.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></>}
          {ctx.ciudadId&&<><label>Zona</label><select value={ctx.zonaId??""} onChange={e=>{const x=zones.find(v=>v.id===e.target.value);set({zonaId:e.target.value||null,zonaNombre:x?.nombre})}}><option value="">Selecciona una zona</option>{zones.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></>}
          {ctx.zonaId&&<Filters ctx={ctx} set={set}/>}
          <button className="primary" disabled={!ctx.paisId||!ctx.ciudadId||!ctx.zonaId||searching} onClick={buscar}>{searching?"CALCULANDO MATCH…":"ENCONTRAR MI MATCH →"}</button>
          <button className="secondary" onClick={()=>setScreen("inscribe")}>＋ INSCRIBIR RESTAURANTE</button>
        </>}
      </section>
    </main>
    <footer>GUÍA·ME · recomendaciones construidas con datos + comunidad</footer>
  </div>
}

function Filters({ctx,set}:{ctx:Contexto;set:(x:Partial<Contexto>)=>void}){
 return <div className="filters">
  <label>{ctx.modoBusqueda==="antojo"?"¿Qué se te antoja?":"¿Qué tipo de cocina?"}</label><div className="chips">{(ctx.modoBusqueda==="antojo"?ANTOJOS:COCINAS).map(x=><button key={x} className={(ctx.modoBusqueda==="antojo"?ctx.antojos:ctx.cocinas).includes(x)?"chip active":"chip"} onClick={()=>{const key=ctx.modoBusqueda==="antojo"?"antojos":"cocinas";const values=ctx[key];set({[key]:values.includes(x)?values.filter(v=>v!==x):[...values,x]} as Partial<Contexto>)}}>{x}</button>)}</div>
  <label>¿Con quién?</label><div className="chips">{CON_QUIEN.map(x=><button key={x} className={ctx.conQuien===x?"chip active":"chip"} onClick={()=>set({conQuien:ctx.conQuien===x?null:x})}>{x}</button>)}</div>
  <label>¿Cuántos?</label><div className="chips">{PERSONAS.map(x=><button key={x} className={ctx.personas===x?"chip active":"chip"} onClick={()=>set({personas:ctx.personas===x?null:x})}>{x}</button>)}</div>
  <label>Presupuesto por persona</label><div className="chips">{PRESUPUESTOS.map(x=><button key={x.label} className={ctx.presupuesto===x.label?"chip active":"chip"} onClick={()=>set({presupuesto:x.label})}>{x.label}</button>)}</div>
  <label>Cocina</label><div className="chips">{COCINAS.slice(0,8).map(x=><button key={x} className={ctx.cocinas.includes(x)?"chip active":"chip"} onClick={()=>set({cocinas:ctx.cocinas.includes(x)?ctx.cocinas.filter(v=>v!==x):[...ctx.cocinas,x]})}>{x}</button>)}</div>
  <label>Ambiente</label><div className="chips">{AMBIENTES.map(x=><button key={x} className={ctx.ambientes.includes(x)?"chip active":"chip"} onClick={()=>set({ambientes:ctx.ambientes.includes(x)?ctx.ambientes.filter(v=>v!==x):[...ctx.ambientes,x]})}>{x}</button>)}</div>
 </div>
}

function Results({results,ctx,onBack,onSelect}:{results:Restaurante[];ctx:Contexto;onBack:()=>void;onSelect:(r:Restaurante)=>void}){
 return <div className="app"><header className="top"><button className="back" onClick={onBack}>← Cambiar búsqueda</button><div className="brand">GUÍA<span>·</span>ME</div></header>
 <main className="results"><p className="eyebrow">TU SELECCIÓN</p><h1>Estos son tus<br/><em>mejores matches.</em></h1><p className="lead">{ctx.zonaNombre} · {ctx.ciudadNombre} · {results.length} restaurantes encontrados</p>
 {results.length===0?<div className="empty"><h2>Aún no tenemos restaurantes aquí.</h2><p>La comunidad puede ayudarnos a construir esta zona.</p></div>:<div className="cards">{results.slice(0,3).map((r,i)=>{const m=calcularMatch(r,ctx);return <article className="restaurant" key={r.id} role="button" tabIndex={0} onClick={()=>onSelect(r)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onSelect(r)}}><div className="rank">0{i+1}</div><div className="rbody"><div className="match">{m.match}% MATCH</div><h2>{r.nombre}</h2><p className="meta">{r.cocina.join(" · ")||"Gastronomía"} · {rangoPrecio(r)}</p><div className="scores"><span>COCINA <b>{r.food_avg??"—"}/30</b></span><span>DECOR <b>{r.decor_avg??"—"}/30</b></span><span>SERVICIO <b>{r.service_avg??"—"}/30</b></span><span>PRECIO <b>{r.cost_avg??"—"}/30</b></span></div><p className="why">{m.razones.slice(0,3).map(x=>x.etiqueta+": "+x.detalle).join(" · ")}</p></div></article>})}</div>}
 </main></div>
}
function Detail({r,ctx,onBack}:{r:Restaurante;ctx:Contexto;onBack:()=>void}){
 const [showEval,setShowEval]=useState(false),[community,setCommunity]=useState<any[]>([]);
 useEffect(()=>{let live=true;(async()=>{const {data}=await supabase.from("evaluaciones").select("plato,comentario,created_at").eq("restaurante_id",r.id).order("created_at",{ascending:false}).limit(50);if(live)setCommunity(data??[])})();return()=>{live=false}},[r.id]);
 if(showEval) return <Evaluation r={r} ctx={ctx} onBack={()=>setShowEval(false)}/>;
 const m=calcularMatch(r,ctx);
 const normalizeDish=(v:string)=>v.trim().replace(/\s+/g," ").toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());
 const validDish=(v:string)=>{const x=v.trim();return x.length>=3&&x.length<=80&&/[a-záéíóúüñ]/i.test(x)&&!/^([a-z]{1,5})\1+$/.test(x.replace(/\s/g,"").toLowerCase())};
 const dishCounts=new Map<string,number>();
 community.forEach(x=>{const raw=(x.plato??"").trim();if(validDish(raw)){const d=normalizeDish(raw);dishCounts.set(d,(dishCounts.get(d)??0)+1)}});
 const uniqueDishes=[...dishCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));
 const latestComment=community.find(x=>(x.comentario??"").trim())?.comentario?.trim();
 const recommendation=r.descripcion?.trim()||(uniqueDishes.length?"La comunidad destaca especialmente "+uniqueDishes[0].name.toLowerCase()+".":"Una recomendación construida con la experiencia de la comunidad GUÍA·ME."); return <div className="app"><header className="top"><button className="back" onClick={onBack}>← Volver a resultados</button><div className="brand">GUÍA<span>·</span>ME</div></header>
 <main className="results"><p className="eyebrow">FICHA DEL RESTAURANTE</p><h1>{r.nombre}</h1><div className="match">{m.match}% MATCH</div>
 <p className="lead">{r.cocina.join(" · ")||"Gastronomía"} · {rangoPrecio(r)} · {ctx.zonaNombre}</p>
 {r.imagen_url&&<img src={r.imagen_url} alt={r.nombre} className="detail-image"/>}
 <section className="detail-section"><h2>VALORACIÓN GUÍA·ME</h2><div className="scores"><span>COCINA <b>{r.food_avg??"—"}/30</b></span><span>DECORACIÓN <b>{r.decor_avg??"—"}/30</b></span><span>SERVICIO <b>{r.service_avg??"—"}/30</b></span><span>PRECIO <b>{r.cost_avg??"—"}/30</b></span></div><p className="why">{m.razones.slice(0,3).map(x=>x.etiqueta+": "+x.detalle).join(" · ")}</p></section>
 <section className="detail-section"><h2>LA RECOMENDACIÓN</h2><p>{recommendation}</p>{uniqueDishes.length>0&&<><h3>LO QUE PEDIR</h3><p>{uniqueDishes.slice(0,3).map((d,i)=><span key={d.name}><strong>{d.name}</strong>{d.count>1?" · "+d.count+" menciones":" · Recomendado por la comunidad"}{i<Math.min(uniqueDishes.length,3)-1?" · ":""}</span>)}</p></>}{latestComment&&<><h3>EXPERIENCIA DE LA COMUNIDAD</h3><p>“{latestComment}”</p></>}<p className="lead">{community.length} evaluaciones{uniqueDishes.length?" · "+uniqueDishes.length+" plato"+(uniqueDishes.length===1?"":"s")+" válido"+(uniqueDishes.length===1?"":"s")+" mencionado"+(uniqueDishes.length===1?"":"s"):""}</p></section>
 <section className="detail-section"><p><strong>Precio:</strong> {rangoPrecio(r)} por persona</p><p>{r.direccion||"Dirección pendiente"}</p>{r.telefono&&<p>{r.telefono}</p>}{r.web&&<p><a href={r.web} target="_blank" rel="noreferrer">Visitar sitio web →</a></p>}</section>
 <button className="primary" type="button" onClick={()=>setShowEval(true)}>EVALUAR ESTE LUGAR</button></main></div>
}


function Score({label,value,setValue}:{label:string;value:number;setValue:(v:number)=>void}){return <div className="score-control"><div><strong>{label}</strong><b>{value}/30</b></div><input type="range" min="0" max="30" value={value} onChange={e=>setValue(Number(e.target.value))}/></div>}
function Evaluation({r,ctx,onBack}:{r:Restaurante;ctx:Contexto;onBack:()=>void}){const [food,setFood]=useState(15),[decor,setDecor]=useState(15),[service,setService]=useState(15),[cost,setCost]=useState(15),[plato,setPlato]=useState(""),[precio,setPrecio]=useState(""),[comentario,setComentario]=useState(""),[saving,setSaving]=useState(false),[done,setDone]=useState(false),[error,setError]=useState<string|null>(null);
async function save(){if(saving)return;setSaving(true);setError(null);try{const result=await Promise.race([supabase.rpc("registrar_evaluacion",{p_restaurante_id:r.id,p_anon_id:anonId(),p_food:food,p_decor:decor,p_service:service,p_cost:cost,p_ambiente:ctx.ambientes[0]??null,p_con_quien:ctx.conQuien,p_personas:String(ctx.personas),p_presupuesto:ctx.presupuesto,p_comentario:comentario||null,p_plato:plato||null,p_precio_pagado:precio?Number(precio):null,p_moneda:currency(ctx.paisNombre)}),new Promise(resolve=>setTimeout(()=>resolve({error:{message:"La conexión está tardando demasiado. Comprueba tu conexión e inténtalo de nuevo."}}),15000))]);if(result.error)throw new Error(result.error.message);setDone(true)}catch(e){setError(e instanceof Error?e.message:"No se pudo guardar la evaluación.")}finally{setSaving(false)}}
if(done)return <div className="app"><main className="results"><p className="eyebrow">GRACIAS</p><h1>Tu experiencia<br/><em>ya es parte de GUÍA·ME.</em></h1><p className="lead">Tu evaluación alimentará las próximas recomendaciones.</p><button className="primary" onClick={onBack}>VOLVER</button></main></div>;
return <div className="app"><header className="top"><button className="back" onClick={onBack}>← Cancelar</button><div className="brand">GUÍA<span>·</span>ME</div></header><main className="results"><p className="eyebrow">EVALÚA TU EXPERIENCIA</p><h1>{r.nombre}</h1><p className="lead">Valora cada dimensión de 0 a 30. Tu experiencia es parte del motor de GUÍA·ME.</p><Score label="Cocina" value={food} setValue={setFood}/><Score label="Decoración" value={decor} setValue={setDecor}/><Score label="Servicio" value={service} setValue={setService}/><Score label="Precio" value={cost} setValue={setCost}/><div className="detail-section"><label>¿Cuánto pagaste? ({currency(ctx.paisNombre)})</label><input value={precio} onChange={e=>setPrecio(e.target.value)} inputMode="decimal" placeholder="Ej. 28.50"/><label>Plato que probaste</label><input value={plato} onChange={e=>setPlato(e.target.value)} placeholder="Ej. Ceviche de corvina"/><label>Comentario</label><textarea value={comentario} onChange={e=>setComentario(e.target.value)} rows={4} placeholder="Tu experiencia…"/></div>{error&&<div className="error">{error}</div>}<button className="primary" disabled={saving} onClick={save}>{saving?"GUARDANDO…":"PUBLICAR MI EVALUACIÓN"}</button></main></div>}
function currency(p?:string){const x=(p??"").toLowerCase();if(x.includes("chile"))return"CLP";if(x.includes("méxico")||x.includes("mexico"))return"MXN";if(x.includes("panamá")||x.includes("panama"))return"USD";return"moneda local"}
function Inscription({paises,ciudades,zonas,onBack}:{paises:Pais[];ciudades:Ciudad[];zonas:Zona[];onBack:()=>void}) {
 const [name,setName]=useState(""),[pais,setPais]=useState(""),[ciudad,setCiudad]=useState(""),[zona,setZona]=useState(""),[direccion,setDireccion]=useState(""),[cocina,setCocina]=useState(""),[antojo,setAntojo]=useState(""),[precio,setPrecio]=useState(""),[saving,setSaving]=useState(false),[done,setDone]=useState(false),[error,setError]=useState<string|null>(null);
 const norm=(v:string)=>v.trim().toLowerCase();
 const matchedPais=paises.find(x=>norm(x.nombre)===norm(pais));
 const cityOptions=matchedPais?ciudades.filter(x=>x.pais_id===matchedPais.id):ciudades;
 const matchedCiudad=cityOptions.find(x=>norm(x.nombre)===norm(ciudad));
 const zoneOptions=matchedCiudad?zonas.filter(x=>x.ciudad_id===matchedCiudad.id):zonas;
 const matchedZona=zoneOptions.find(x=>norm(x.nombre)===norm(zona));

 async function save(){
   if(saving)return;
   if(!name.trim()||!pais.trim()||!ciudad.trim()||!zona.trim()||!direccion.trim()){setError("Completa nombre, país, ciudad, zona y dirección.");return;}
   setSaving(true);setError(null);
   const {error:e}=await supabase.rpc("registrar_aporte_restaurante",{
     p_nombre:name.trim(),
     p_pais:pais.trim(),
     p_ciudad:ciudad.trim(),
     p_zona:zona.trim(),
     p_direccion:direccion.trim(),
     p_tipo_cocina:cocina.trim()||null,
     p_rango_precio:precio.trim()||null,
     p_anon_id:anonId(),
     p_especialidades:antojo.trim()?antojo.split(",").map(x=>x.trim()).filter(Boolean):[]
   });
   if(e)setError(e.message);else setDone(true);
   setSaving(false);
 }
 if(done)return <div className="app"><main className="results"><p className="eyebrow">GRACIAS</p><h1>Restaurante<br/><em>inscrito.</em></h1><p className="lead">Quedó pendiente de verificación. Si la zona no existía, también quedó propuesta para incorporarla a GUÍA·ME.</p><button className="primary" onClick={onBack}>VOLVER A INICIO</button></main></div>;
 return <div className="app"><header className="top"><button className="back" onClick={onBack}>← Volver</button><div className="brand">GUÍA<span>·</span>ME</div></header>
 <main className="results"><p className="eyebrow">APORTE DE LA COMUNIDAD</p><h1>Inscribir<br/><em>restaurante.</em></h1><p className="lead">Puedes inscribir un restaurante en cualquier país, ciudad o zona. Si el lugar no existe todavía, GUÍA·ME lo recibe como propuesta.</p>
 <div className="card">
  <label>Nombre</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre del restaurante"/>
  <label>País</label><input list="guiame-paises" value={pais} onChange={e=>setPais(e.target.value)} placeholder="Ej. Panamá, España, Perú…"/>
  <datalist id="guiame-paises">{paises.map(x=><option key={x.id} value={x.nombre}/>)}</datalist>
  <label>Ciudad</label><input list="guiame-ciudades" value={ciudad} onChange={e=>setCiudad(e.target.value)} placeholder="Ej. Panamá, Madrid, Lima…"/>
  <datalist id="guiame-ciudades">{cityOptions.slice(0,100).map(x=><option key={x.id} value={x.nombre}/>)}</datalist>
  <label>Zona</label><input list="guiame-zonas" value={zona} onChange={e=>setZona(e.target.value)} placeholder="Ej. Ancón, Miraflores, Malasaña…"/>
  <datalist id="guiame-zonas">{zoneOptions.slice(0,150).map(x=><option key={x.id} value={x.nombre}/>)}</datalist>
  <p className="lead">Si no aparece en la lista, <strong>escríbela.</strong> No estamos limitados a las zonas precargadas.</p>
  <label>Dirección</label><input value={direccion} onChange={e=>setDireccion(e.target.value)} placeholder="Dirección del restaurante"/>
  <label>Tipo de cocina</label><input value={cocina} onChange={e=>setCocina(e.target.value)} placeholder="Ej. Mexicana, italiana, árabe…"/>
  <label>¿Qué se sirve / cuál es la especialidad?</label><input value={antojo} onChange={e=>setAntojo(e.target.value)} placeholder="Ej. Hamburguesas, tacos, BBQ…"/><p className="lead">Puedes poner varias, separadas por comas.</p>
  <label>Rango de precio</label><input value={precio} onChange={e=>setPrecio(e.target.value)} placeholder="Ej. $20–35 por persona"/>
  {error&&<div className="error">{error}</div>}
  <button className="primary" disabled={!name.trim()||!pais.trim()||!ciudad.trim()||!zona.trim()||!direccion.trim()||saving} onClick={save}>{saving?"ENVIANDO…":"INSCRIBIR RESTAURANTE"}</button>
 </div></main></div>
}
