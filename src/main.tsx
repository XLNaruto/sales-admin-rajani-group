import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router/router";
import { useAuthStore } from "@/stores/auth-store";
import { useOtpSessionStore } from "@/stores/otp-session-store";
import "@/styles/globals.css";

// The persisted stores use async (encrypted) storage with `skipHydration`, so
// rehydrate them BEFORE mounting the router — otherwise the synchronous
// `beforeLoad` guards would run against empty state and bounce a signed-in user
// to /login on refresh.
Promise.allSettled([
  useAuthStore.persist.rehydrate(),
  useOtpSessionStore.persist.rehydrate(),
]).finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
});
