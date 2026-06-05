import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";

// Inter typography (Fontsource) — must be imported BEFORE the app styles
// so the @font-face declarations are available when the @theme tokens
// reference the "Inter" family. Per ADR-05, Inter is the ONLY typeface.
// 4 weights matches the design budget "Inter 4 weights ≤100KB total".
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@/styles/index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
