import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

// Keep the server entry on the official TanStack Start fetch contract.
// Custom error-to-Response handling is intentionally avoided here so SSR
// route errors are handled by Start/Vercel instead of being swallowed.
export default createServerEntry({
  fetch(request, opts) {
    return handler.fetch(request, opts);
  },
});
