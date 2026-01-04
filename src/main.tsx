import { createRoot } from "react-dom/client";
import { Component, ErrorInfo, ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

// Error boundary to catch any React rendering errors
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Laterr] React Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
          <h1 style={{ color: "#e11d48" }}>Something went wrong</h1>
          <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "10px", padding: "8px 16px", cursor: "pointer" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Debug: confirm React mounts in production
console.log("[Laterr] React mounting...", {
  timestamp: Date.now(),
  url: window.location.href,
  pathname: window.location.pathname,
  origin: window.location.origin,
  userAgent: navigator.userAgent.slice(0, 50),
  nodeEnv: import.meta.env.MODE,
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[Laterr] FATAL: #root element not found in DOM");
  document.body.innerHTML =
    '<div style="padding:20px;font-family:sans-serif;"><h1>Error: Root element not found</h1><p>The application container is missing from the page.</p></div>';
} else {
  // Add a temporary visual marker in production to confirm script loads
  const marker = document.createElement("div");
  marker.id = "laterr-load-marker";
  marker.style.cssText = "position:fixed;bottom:10px;right:10px;background:rgba(0,255,0,0.1);color:#0a0;padding:4px 8px;font-size:10px;font-family:monospace;z-index:999999;pointer-events:none;";
  marker.textContent = "JS Loaded";
  document.body.appendChild(marker);
  
  try {
    createRoot(rootElement).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.log("[Laterr] React mounted successfully");
    
    // Update marker to show successful mount
    marker.textContent = "React Mounted ✓";
    marker.style.background = "rgba(0,255,0,0.2)";
    
    // Remove marker after 3 seconds once we confirm the app rendered
    setTimeout(() => {
      if (marker.parentNode) {
        marker.remove();
      }
    }, 3000);
  } catch (err) {
    console.error("[Laterr] Failed to mount React:", err);
    rootElement.innerHTML =
      '<div style="padding:20px;font-family:sans-serif;"><h1>Failed to load application</h1><pre style="background:#f5f5f5;padding:10px;overflow:auto;">' +
      (err instanceof Error ? err.message : String(err)) +
      '</pre></div>';
    
    // Update marker to show failure
    marker.textContent = "React Mount Failed ✗";
    marker.style.background = "rgba(255,0,0,0.2)";
    marker.style.color = "#f00";
  }
}
