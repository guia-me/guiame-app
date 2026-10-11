import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, Clock, LogOut, Mail, MapPin, RefreshCw, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "matiascocinpanama@gmail.com";
type Contribution = {
  id: string; nombre: string; pais: string | null; ciudad: string | null; zona: string | null;
  direccion: string | null; tipo_cocina: string | null; rango_precio: string | null; ambiente: string | null;
  lat: number | null; lng: number | null; contacto: string | null; imagen: string | null;
  estado: string; created_at: string; payload: Record<string, unknown> | null;
};
type EditValues = { nombre: string; direccion: string; lat: string; lng: string };
type AdminResponse = { contributions?: Contribution[]; error?: string; detail?: string; status?: string; restaurant?: { id: string; nombre: string }; coordinatesAvailable?: boolean };

async function geolocalizarAporte(item: Contribution): Promise<{ lat: string; lng: string } | null> {
  const query = [item.nombre, item.direccion, item.zona, item.ciudad, item.pais].filter(Boolean).join(", ");
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("q", query);
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const results = (await response.json()) as Array<{ lat?: string; lon?: string; name?: string; class?: string; type?: string; display_name?: string }>;
    const venueTypes = new Set(["restaurant", "fast_food", "cafe", "bar", "pub", "food_court", "ice_cream", "bakery"]);
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const wanted = normalize(item.nombre);
    const found = results.find((result) => {
      const isFoodVenue = result.class === "amenity" && venueTypes.has(result.type ?? "");
      const name = normalize(result.name ?? "");
      const display = normalize(result.display_name ?? "");
      const nameMatches = !!wanted && (name.includes(wanted) || wanted.includes(name) || display.includes(wanted));
      return isFoodVenue && nameMatches && Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon));
    });
    return found ? { lat: String(found.lat), lng: String(found.lon) } : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Administración — GUÍA·ME" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [items, setItems] = useState<Contribution[]>([]);
  const [edits, setEdits] = useState<Record<string, EditValues>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchGeocoding, setBatchGeocoding] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(null);

  const loadItems = useCallback(async () => {
    setLoadingItems(true); setNotice(null);
    const { data, error } = await supabase.functions.invoke("guiame-admin-restaurants", { body: { action: "list" } });
    setLoadingItems(false);
    if (error) { setNotice({ kind: "error", text: "No pudimos cargar los pendientes. Confirma que hayas abierto el enlace de acceso enviado a tu correo." }); return; }
    const response = data as AdminResponse;
    if (response.error) { setNotice({ kind: "error", text: response.error }); return; }
    const contributions = response.contributions ?? [];
    setItems(contributions);
    setEdits(previous => {
      const next = { ...previous };
      for (const item of contributions) if (!next[item.id]) next[item.id] = {
        nombre: item.nombre ?? "", direccion: item.direccion ?? "",
        lat: item.lat == null ? "" : String(item.lat), lng: item.lng == null ? "" : String(item.lng),
      };
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const found = data.session?.user?.email?.toLowerCase() ?? null;
      if (found === ADMIN_EMAIL) setSessionEmail(found);
      else if (found) {
        void supabase.auth.signOut(); setSessionEmail(null);
        setNotice({ kind: "error", text: "Esta cuenta no está autorizada para administrar GUÍA·ME." });
      }
      setLoadingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const found = session?.user?.email?.toLowerCase() ?? null;
      if (found === ADMIN_EMAIL) setSessionEmail(found);
      else { setSessionEmail(null); if (found) void supabase.auth.signOut(); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (sessionEmail === ADMIN_EMAIL) void loadItems(); }, [sessionEmail, loadItems]);

  const sendLink = async () => {
    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setNotice({ kind: "error", text: "Solo se permite el correo administrador configurado." }); return;
    }
    setSendingLink(true); setNotice(null); setLinkSent(false);
    const { error } = await supabase.auth.signInWithOtp({
      email: ADMIN_EMAIL,
      options: { emailRedirectTo: "https://guiame-app-navy.vercel.app/admin", shouldCreateUser: true },
    });
    setSendingLink(false);
    if (error) { setNotice({ kind: "error", text: "No pudimos enviar el enlace de acceso. Revisa la configuración de correo de Supabase." }); return; }
    setLinkSent(true);
  };

  const geolocalizarPendientes = async () => {
    const pendientes = items.filter(item => item.lat == null || item.lng == null);
    if (pendientes.length === 0) {
      setNotice({ kind: "info", text: "Todos los aportes pendientes ya tienen coordenadas." });
      return;
    }
    setBatchGeocoding(true);
    setNotice({ kind: "info", text: `Buscando ubicación automática para ${pendientes.length} aportes. Puedes dejar esta pestaña abierta.` });
    let encontrados = 0;
    for (let index = 0; index < pendientes.length; index++) {
      const item = pendientes[index];
      if (index > 0) await new Promise(resolve => setTimeout(resolve, 1100));
      const coords = await geolocalizarAporte(item);
      if (coords) {
        encontrados++;
        setEdits(current => ({
          ...current,
          [item.id]: { ...(current[item.id] ?? { nombre: item.nombre, direccion: item.direccion ?? "", lat: "", lng: "" }), ...coords },
        }));
      }
    }
    setBatchGeocoding(false);
    setNotice({
      kind: encontrados > 0 ? "ok" : "info",
      text: encontrados > 0
        ? `Encontramos coordenadas para ${encontrados} de ${pendientes.length} aportes. Revisa los resultados y pulsa “Aprobar e incorporar” para guardar cada ficha; los demás quedan sin coordenadas.`
        : `No encontramos ubicaciones suficientemente fiables para estos ${pendientes.length} aportes. No se inventaron coordenadas; puedes revisar dirección y nombre.`,
    });
  };

  const updateEdit = (id: string, patch: Partial<EditValues>) => setEdits(current => ({
    ...current, [id]: { ...(current[id] ?? { nombre: "", direccion: "", lat: "", lng: "" }), ...patch },
  }));

  const act = async (item: Contribution, action: "approve" | "reject") => {
    setBusyId(item.id); setNotice(null);
    const edit = edits[item.id] ?? { nombre: item.nombre, direccion: item.direccion ?? "", lat: "", lng: "" };
    const body: Record<string, unknown> = { action, aporteId: item.id };
    if (action === "approve") { body.nombre = edit.nombre; body.direccion = edit.direccion; body.lat = edit.lat; body.lng = edit.lng; }
    const { data, error } = await supabase.functions.invoke("guiame-admin-restaurants", { body });
    setBusyId(null);
    if (error) { setNotice({ kind: "error", text: "No se completó la acción. El aporte sigue en revisión; actualiza la lista antes de reintentar." }); return; }
    const response = data as AdminResponse;
    if (response.error) { setNotice({ kind: "error", text: response.detail ? response.error + " " + response.detail : response.error }); return; }
    setItems(current => current.filter(x => x.id !== item.id));
    if (action === "approve" && response.coordinatesAvailable === false) setNotice({ kind: "info", text: "Restaurante incorporado al catálogo, pero sin coordenadas: aparecerá en recomendaciones por zona, no en el mapa hasta completar la ubicación." });
    else if (action === "approve") setNotice({ kind: "ok", text: "Restaurante aprobado e incorporado al catálogo de GUÍA·ME." });
    else setNotice({ kind: "ok", text: "Aporte rechazado; no se incorporó al catálogo." });
  };

  const signOut = async () => { await supabase.auth.signOut(); setSessionEmail(null); setItems([]); };

  return (
    <main className="min-h-screen bg-[#f6f3ed] px-4 py-8 text-[#24221e] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-start justify-between gap-4 border-b border-[#d8d0c4] pb-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b7657]">GUÍA·ME · PRIVADO</p><h1 className="mt-2 font-serif text-4xl">Administración</h1><p className="mt-2 text-sm text-[#70695f]">Revisión de restaurantes propuestos por la comunidad</p></div>
          {sessionEmail && <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-[#d8d0c4] px-4 py-2 text-sm hover:bg-white"><LogOut size={15}/> Salir</button>}
        </header>
        {notice && <div role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${notice.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : notice.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{notice.text}</div>}
        {loadingSession ? <div className="rounded-2xl border border-[#e1d9cd] bg-white p-8 text-sm text-[#70695f]">Comprobando acceso seguro…</div> : !sessionEmail ? (
          <section className="mx-auto max-w-lg rounded-2xl border border-[#e1d9cd] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3ede2] text-[#8b7657]"><ShieldCheck size={23}/></div>
            <h2 className="font-serif text-2xl">Acceso de administrador</h2><p className="mt-2 text-sm leading-6 text-[#70695f]">Te enviaremos un enlace de acceso de un solo uso. Solo la cuenta autorizada puede revisar y publicar restaurantes.</p>
            <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-[#70695f]" htmlFor="admin-email">Correo administrador</label>
            <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-[#d8d0c4] bg-[#fcfbf8] px-3 py-3 text-sm outline-none focus:border-[#8b7657]" autoComplete="email"/>
            <button onClick={sendLink} disabled={sendingLink} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#292720] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Mail size={16}/>{sendingLink ? "Enviando enlace…" : "Enviar enlace de acceso"}</button>
            {linkSent && <p className="mt-4 text-sm text-emerald-800">Si el correo está habilitado en Supabase, recibirás un enlace de acceso en {ADMIN_EMAIL}. Ábrelo en este mismo navegador.</p>}
          </section>
        ) : <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e1d9cd] bg-white px-4 py-3">
            <div className="flex items-center gap-3"><ShieldCheck size={19} className="text-emerald-700"/><div><p className="text-sm font-semibold">Sesión autorizada</p><p className="text-xs text-[#70695f]">{sessionEmail}</p></div></div>
            <button onClick={() => void loadItems()} disabled={loadingItems} className="inline-flex items-center gap-2 rounded-full border border-[#d8d0c4] px-3 py-2 text-xs font-semibold disabled:opacity-50"><RefreshCw size={13} className={loadingItems ? "animate-spin" : ""}/> Actualizar</button>
          </div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-serif text-2xl">Pendientes</h2><p className="mt-1 text-sm text-[#70695f]">Revisa la ubicación y los duplicados antes de aprobar.</p><p className="mt-1 text-xs text-[#8a8379]">La búsqueda automática no usa tu ubicación personal; solo acepta coincidencias por nombre de restaurante.</p></div><div className="flex items-center gap-3"><button onClick={() => void geolocalizarPendientes()} disabled={batchGeocoding || loadingItems || !items.some(item => item.lat == null || item.lng == null)} className="inline-flex items-center gap-2 rounded-full border border-[#d8d0c4] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50"><MapPin size={13}/>{batchGeocoding ? "Buscando ubicaciones…" : "Geolocalizar pendientes"}</button><span className="rounded-full bg-[#e8dfd1] px-3 py-1 text-sm font-semibold tabular-nums">{items.length}</span></div></div>
          {loadingItems && items.length === 0 ? <div className="rounded-xl bg-white p-8 text-sm text-[#70695f]">Cargando aportes…</div> : items.length === 0 ? <div className="rounded-xl border border-[#e1d9cd] bg-white p-8 text-center"><Check size={25} className="mx-auto text-emerald-700"/><h3 className="mt-3 font-serif text-xl">Todo al día</h3><p className="mt-2 text-sm text-[#70695f]">No hay restaurantes pendientes de revisión.</p></div> :
          <div className="space-y-5">{items.map(item => {
            const edit = edits[item.id] ?? { nombre: item.nombre, direccion: item.direccion ?? "", lat: item.lat == null ? "" : String(item.lat), lng: item.lng == null ? "" : String(item.lng) };
            const payload = item.payload && typeof item.payload === "object" ? item.payload : {};
            const cuisines = Array.isArray(payload.cocinas) ? payload.cocinas.join(", ") : item.tipo_cocina ?? "Sin especificar";
            const environment = Array.isArray(payload.ambientes) ? payload.ambientes.join(", ") : item.ambiente ?? "Sin especificar";
            return <article key={item.id} className="rounded-2xl border border-[#e1d9cd] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b7657]">APORTE DE LA COMUNIDAD</p><h3 className="mt-1 font-serif text-2xl">{item.nombre}</h3><p className="mt-1 text-xs text-[#8a8379]"><Clock size={12} className="mr-1 inline"/> {new Date(item.created_at).toLocaleString()}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Pendiente</span></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><label className="block text-xs font-semibold text-[#70695f]">Nombre</label><input value={edit.nombre} onChange={e=>updateEdit(item.id,{nombre:e.target.value})} className="mt-1 w-full rounded-lg border border-[#d8d0c4] px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-semibold text-[#70695f]">Precio aportado</label><div className="mt-1 rounded-lg bg-[#f7f4ef] px-3 py-2 text-sm">{item.rango_precio || "Pendiente"}</div></div>
                <div className="sm:col-span-2"><label className="block text-xs font-semibold text-[#70695f]">Dirección (corrígela si hace falta)</label><input value={edit.direccion} onChange={e=>updateEdit(item.id,{direccion:e.target.value})} className="mt-1 w-full rounded-lg border border-[#d8d0c4] px-3 py-2 text-sm"/></div>
                <div className="sm:col-span-2 rounded-xl bg-[#f8f5ef] p-4"><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#70695f]"><MapPin size={14}/> Ubicación</p><p className="text-sm">{[item.pais,item.ciudad,item.zona].filter(Boolean).join(" → ") || "Sin ubicación completa"}</p><div className="mt-3 grid grid-cols-2 gap-3"><div><label className="block text-xs text-[#70695f]">Latitud</label><input inputMode="decimal" value={edit.lat} onChange={e=>updateEdit(item.id,{lat:e.target.value})} placeholder="Ej. 8.9824" className="mt-1 w-full rounded-lg border border-[#d8d0c4] bg-white px-3 py-2 text-sm"/></div><div><label className="block text-xs text-[#70695f]">Longitud</label><input inputMode="decimal" value={edit.lng} onChange={e=>updateEdit(item.id,{lng:e.target.value})} placeholder="Ej. -79.5347" className="mt-1 w-full rounded-lg border border-[#d8d0c4] bg-white px-3 py-2 text-sm"/></div></div>{(!edit.lat || !edit.lng) && <p className="mt-2 text-xs text-amber-800">Sin coordenadas, no aparecerá en el mapa. Puedes aprobarlo para recomendaciones por zona y completar la ubicación después.</p>}</div>
                <div><p className="text-xs font-semibold text-[#70695f]">Cocina</p><p className="mt-1 text-sm">{cuisines}</p></div><div><p className="text-xs font-semibold text-[#70695f]">Ambiente</p><p className="mt-1 text-sm">{environment}</p></div>
                {item.contacto && <div><p className="text-xs font-semibold text-[#70695f]">Contacto</p><p className="mt-1 text-sm">{item.contacto}</p></div>}
                {item.imagen && <div><p className="text-xs font-semibold text-[#70695f]">Imagen</p><a className="mt-1 block break-all text-sm underline" href={item.imagen} target="_blank" rel="noreferrer">Abrir imagen</a></div>}
                {typeof payload.comentario === "string" && payload.comentario && <div className="sm:col-span-2"><p className="text-xs font-semibold text-[#70695f]">Comentario</p><p className="mt-1 text-sm">{payload.comentario}</p></div>}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#eee8df] pt-4 sm:flex-row sm:justify-end"><button onClick={()=>void act(item,"reject")} disabled={busyId===item.id} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"><X size={16}/> Rechazar</button><button onClick={()=>void act(item,"approve")} disabled={busyId===item.id || !edit.nombre.trim() || (!!edit.lat !== !!edit.lng)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#292720] px-5 py-3 text-sm font-semibold text-white hover:bg-[#403d34] disabled:opacity-50"><Check size={16}/>{busyId===item.id ? "Procesando…" : "Aprobar e incorporar"}</button></div>
            </article>;
          })}</div>}
        </>}
        <footer className="mt-10 border-t border-[#d8d0c4] pt-4 text-xs leading-5 text-[#8a8379]">Este panel no aparece en la navegación pública. La autorización real se valida también en el servidor antes de listar, aprobar o rechazar aportes.</footer>
      </div>
    </main>
  );
}
