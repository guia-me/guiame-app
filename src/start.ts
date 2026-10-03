import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// TanStack Start already provides its own SSR error boundary. Keep global
// middleware focused on request concerns; converting render errors into
// Response objects here breaks normal route error handling on Vercel.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [csrfMiddleware],
}));
