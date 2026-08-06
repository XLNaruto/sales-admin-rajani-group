import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router/router";
import { useAuthStore } from "@/stores/auth-store";
import "@/styles/globals.css";

// Silence console output in the shipped build — logs are dev-time aids and
// leak internals (tokens, ids, payloads) in the browser console otherwise.
// Guarded so `npm run dev` keeps its logs; drop the `if` to silence everywhere.
if (import.meta.env.PROD) {
  console.log = console.warn = console.error = () => {};
}

// The auth store uses async (encrypted) storage with `skipHydration`, so
// rehydrate it BEFORE mounting the router — otherwise the synchronous
// `beforeLoad` guards would run against empty state and bounce a signed-in user
// to /login on refresh.
Promise.allSettled([useAuthStore.persist.rehydrate()]).finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
});
