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
  userAgent: navigator.userAgent.slice(0, 50),
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[Laterr] FATAL: #root element not found in DOM");
  document.body.innerHTML =
    '<div style="padding:20px;font-family:sans-serif;"><h1>Error: Root element not found</h1></div>';
} else {
  try {
    createRoot(rootElement).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.log("[Laterr] React mounted successfully");
  } catch (err) {
    console.error("[Laterr] Failed to mount React:", err);
    rootElement.innerHTML =
      '<div style="padding:20px;font-family:sans-serif;"><h1>Failed to load application</h1></div>';
  }
}
