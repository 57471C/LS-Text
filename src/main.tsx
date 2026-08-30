import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IdeShell } from "@/components/ide/IdeShell";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IdeShell />
  </StrictMode>,
);
