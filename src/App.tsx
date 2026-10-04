import { useEffect, useMemo, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import {
  AMBIENTES, COCINAS, CON_QUIEN, PERSONAS, PRESUPUESTOS,
  calcularMatch, contextoVacio, guardarContexto, leerContexto, rangoPrecio,
  type Contexto, type Restaurante,
} from "./lib/guiame";

type Pais = { id:string; nombre:string; codigo_iso2:string|null };
type Ciudad = { id:string; nombre:string; pais_id:string };
type Zona = { id:string; nombre:string; ciudad_id:string };

const clean = (v:any): Restaurante => ({
  id:v.id, nombre:v.nombre, pais_id:v.pais_id, ciudad_id:v.ciudad_id, zona_id:v.zona_id,
  direccion:v.direccion ?? null, cocina:Array.isArray(v.cocina)?v.cocina:[],
  precio_min:v.precio_min ?? null, precio_max:v.precio_max ?? null,
  ambiente:Array.isArray(v.ambiente)?v.ambiente:[], contextos:Array.isArray(v.contextos)?v.contextos:[],
  lat:v.lat ?? null, lng:v.lng ?? null, telefono:v.telefono ?? null, web:v.web ?? null,
  horarios:v.horarios ?? null, capacidad_max:v.capacidad_max ?? null,
  imagen_url:v.imagen_url ?? null, fuente:v.fuente ?? null, estado:v.estado ?? "pendiente",
  food_avg:v.food_avg ?? null, decor_avg:v.decor_avg ?? null, service_avg:v.service_avg ?? null,
  num_evaluaciones:v.num_evaluaciones ?? 0, contexto_scores:v.contexto_scores ?? null,
  pct_volveria:v.pct_volveria ?? null, pct_recomendaria:v.pct_recomendaria ?? null,
});

export default function App() {
  const [screen,setScreen]=useState<"home"|"results"|"detail">("home");
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
        {error&&<div className="error">{error}</div>}
        {loading?<div className="loading">Cargando lugares…</div>:<>
          <label>País</label>
          <div className="chips">{paises.map(p=><button key={p.id} className={ctx.paisId===p.id?"chip active":"chip"} onClick={()=>set({paisId:p.id,paisNombre:p.nombre,ciudadId:null,ciudadNombre:undefined,zonaId:null,zonaNombre:undefined})}>{p.nombre}</button>)}</div>
          {ctx.paisId&&<><label>Ciudad</label><select value={ctx.ciudadId??""} onChange={e=>{const x=cities.find(v=>v.id===e.target.value);set({ciudadId:e.target.value||null,ciudadNombre:x?.nombre,zonaId:null,zonaNombre:undefined})}}><option value="">Selecciona una ciudad</option>{cities.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></>}
          {ctx.ciudadId&&<><label>Zona</label><select value={ctx.zonaId??""} onChange={e=>{const x=zones.find(v=>v.id===e.target.value);set({zonaId:e.target.value||null,zonaNombre:x?.nombre})}}><option value="">Selecciona una zona</option>{zones.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></>}
          {ctx.zonaId&&<Filters ctx={ctx} set={set}/>}
          <button className="primary" disabled={!ctx.paisId||!ctx.ciudadId||!ctx.zonaId||searching} onClick={buscar}>{searching?"BUSCANDO…":"ENCONTRAR MI LUGAR →"}</button>
        </>}
      </section>
    </main>
    <footer>GUÍA·ME · recomendaciones construidas con datos + comunidad</footer>
  </div>
}

function Filters({ctx,set}:{ctx:Contexto;set:(x:Partial<Contexto>)=>void}){
 return <div className="filters">
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
 {results.length===0?<div className="empty"><h2>Aún no tenemos restaurantes aquí.</h2><p>La comunidad puede ayudarnos a construir esta zona.</p></div>:<div className="cards">{results.slice(0,3).map((r,i)=>{const m=calcularMatch(r,ctx);return <article className="restaurant" key={r.id} role="button" tabIndex={0} onClick={()=>onSelect(r)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onSelect(r)}}><div className="rank">0{i+1}</div><div className="rbody"><div className="match">{m.match}% MATCH</div><h2>{r.nombre}</h2><p className="meta">{r.cocina.join(" · ")||"Gastronomía"} · {rangoPrecio(r)}</p><div className="scores"><span>FOOD <b>{r.food_avg??"—"}</b></span><span>DECOR <b>{r.decor_avg??"—"}</b></span><span>SERVICE <b>{r.service_avg??"—"}</b></span></div><p className="why">{m.razones.slice(0,3).map(x=>x.etiqueta+": "+x.detalle).join(" · ")}</p></div></article>})}</div>}
 </main></div>
}
function Detail({r,ctx,onBack}:{r:Restaurante;ctx:Contexto;onBack:()=>void}){
 const m=calcularMatch(r,ctx);
 return <div className="app"><header className="top"><button className="back" onClick={onBack}>← Volver a resultados</button><div className="brand">GUÍA<span>·</span>ME</div></header>
 <main className="results"><p className="eyebrow">FICHA DEL RESTAURANTE</p><h1>{r.nombre}</h1><div className="match">{m.match}% MATCH</div>
 <p className="lead">{r.cocina.join(" · ")||"Gastronomía"} · {rangoPrecio(r)} · {ctx.zonaNombre}</p>
 {r.imagen_url&&<img src={r.imagen_url} alt={r.nombre} className="detail-image"/>}
 <section className="detail-section"><h2>Valoración GUÍA·ME</h2><div className="scores"><span>FOOD <b>{r.food_avg??"—"}</b></span><span>DECOR <b>{r.decor_avg??"—"}</b></span><span>SERVICE <b>{r.service_avg??"—"}</b></span></div><p className="why">{m.razones.slice(0,4).map(x=>x.etiqueta+": "+x.detalle).join(" · ")}</p></section>
 <section className="detail-section"><h2>Información</h2><p>{r.direccion||"Dirección pendiente"}</p>{r.telefono&&<p>{r.telefono}</p>}{r.web&&<p><a href={r.web} target="_blank" rel="noreferrer">Visitar sitio web →</a></p>}</section>
 <button className="primary" type="button" onClick={()=>alert("La evaluación se habilitará en el siguiente módulo de GUÍA·ME.")}>EVALUAR ESTE LUGAR</button></main></div>
}
