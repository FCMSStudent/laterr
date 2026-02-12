import "./styles/gradient.css";
import { Agentation } from "agentation";
import { AppProviders } from "./app/providers";
import { AppRoutes } from "./app/routes";

const App = () => {
  // Agentation integration (dev-only)
  const sendToAgent = (annotation: any) => {
    // TODO: wire to internal agent channel (no network by default)
    console.log("Agentation: Sending annotation to agent", annotation);
  };

  const handleAnnotation = (annotation: any) => {
    console.log("Agentation captured:", {
      element: annotation.element,
      path: annotation.elementPath,
      box: annotation.boundingBox
    });
    sendToAgent(annotation);
  };

  return (
    <AppProviders>
      <AppRoutes />
      {process.env.NODE_ENV === "development" && (
        // @ts-ignore - Agentation might not have types in early versions or if install failed
        <Agentation
          onAnnotationAdd={handleAnnotation}
        // config={{ copyToClipboard: false }} // Placeholder for config if available
        />
      )}
    </AppProviders>
  );
};

export default App;
