import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/shared/components/ui";
import { Toaster as Sonner } from "@/shared/components/ui";
import { TooltipProvider } from "@/shared/components/ui";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { DynamicBackground } from "@/shared/components/DynamicBackground";

const queryClient = new QueryClient();

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DynamicBackground />
            {children}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};
