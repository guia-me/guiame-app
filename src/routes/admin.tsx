import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Shell } from "@/components/guiame/ui";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

function Admin() {
  return (
    <Shell titulo="Administración" subtitulo="Herramientas de gestión de GUÍA·ME.">
      <div className="space-y-3 py-8">
        <Link to="/agregar" className="btn-primary block w-full text-center">
          Agregar restaurante
        </Link>
        <Link to="/matches" className="block w-full border border-border px-4 py-3 text-center">
          Ver resultados
        </Link>
        <Link to="/mapa" className="block w-full border border-border px-4 py-3 text-center">
          Ver mapa
        </Link>
      </div>
    </Shell>
  );
}
