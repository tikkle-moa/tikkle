import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { apiClient, createRefreshTokenMiddleware } from "@shared/api";

import { useSessionStore } from "@entities/session";

import App from "./app";

apiClient.use(createRefreshTokenMiddleware(() => useSessionStore.getState().clearSession()));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
