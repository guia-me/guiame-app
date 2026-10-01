import { createFileRoute, redirect } from "@tanstack/react-router";
import { leerContexto } from "@/lib/guiame";

export const Route = createFileRoute("/restaurantes")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && leerContexto()) {
      throw redirect({ to: "/matches" });
    }
    throw redirect({ to: "/" });
  },
});
