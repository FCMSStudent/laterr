import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug: confirm React mounts in production
console.log("[Laterr] React mounting...", { timestamp: Date.now() });

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[Laterr] FATAL: #root element not found in DOM");
} else {
  createRoot(rootElement).render(<App />);
  console.log("[Laterr] React mounted successfully");
}
