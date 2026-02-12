import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { TooltipProvider } from "@/shared/components/ui";

type RenderOptions = {
  route?: string;
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export const renderWithProviders = (ui: ReactElement, options?: RenderOptions) => {
  const route = options?.route ?? "/";
  const queryClient = createQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

  return render(ui, { wrapper: Wrapper });
};
