import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { rangoPrecio, type Restaurante } from "@/lib/guiame";

const icono = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#1a1a17;border:3px solid #d0a548"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function MapView({
  restaurantes,
  centro,
  zoom = 13,
  alto = 420,
}: {
  restaurantes: Restaurante[];
  centro: [number, number];
  zoom?: number;
  alto?: number;
}) {
  return (
    <MapContainer center={centro} zoom={zoom} style={{ height: alto, width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {restaurantes
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => (
          <Marker key={r.id} position={[r.lat!, r.lng!]} icon={icono}>
            <Popup>
              <strong>{r.nombre}</strong>
              <br />
              {r.cocina.join(" · ")} · {rangoPrecio(r)}
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
