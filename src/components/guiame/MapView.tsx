import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Link } from "@tanstack/react-router";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { rangoPrecio, type Restaurante } from "@/lib/guiame";

const icono = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#1a1a17;border:3px solid #d0a548;box-shadow:0 1px 5px rgba(0,0,0,.25)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});


function AjustarVistaRestaurantes({ restaurantes, centro, zoom, ajustarVista }: { restaurantes: Restaurante[]; centro: [number, number]; zoom: number; ajustarVista: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!ajustarVista) {
      map.setView(centro, zoom, { animate: false });
      return;
    }
    const points = restaurantes.filter(r => r.lat != null && r.lng != null).map(r => [r.lat!, r.lng!] as [number, number]);
    if (points.length === 1) map.setView(points[0], 15, { animate: false });
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15, animate: false });
  }, [map, restaurantes, centro, zoom, ajustarVista]);
  return null;
}

export default function MapView({
  restaurantes,
  centro,
  zoom = 13,
  alto = 420,
  ajustarVista = true,
}: {
  restaurantes: Restaurante[];
  centro: [number, number];
  zoom?: number;
  alto?: number;
  ajustarVista?: boolean;
}) {
  return (
    <MapContainer center={centro} zoom={zoom} style={{ height: alto, width: "100%" }} scrollWheelZoom>
      <AjustarVistaRestaurantes restaurantes={restaurantes} centro={centro} zoom={zoom} ajustarVista={ajustarVista} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} spiderfyOnMaxZoom>
        {restaurantes
          .filter((r) => r.lat != null && r.lng != null)
          .map((r) => (
            <Marker key={r.id} position={[r.lat!, r.lng!]} icon={icono}>
              <Popup>
                <div style={{ minWidth: 170 }}>
                  <strong>{r.nombre}</strong>
                  <br />
                  <span>{r.cocina.join(" · ") || "Cocina pendiente"} · {rangoPrecio(r)}</span>
                  {r.direccion ? <div style={{ marginTop: 5, fontSize: 12 }}>{r.direccion}</div> : null}
                  <Link
                    to="/restaurante/$id"
                    params={{ id: r.id }}
                    style={{
                      display: "inline-block",
                      marginTop: 9,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: "#59634f",
                      textDecoration: "none",
                    }}
                  >
                    Ver ficha →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
