import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Exclude mammoth from pre-bundling to prevent circular dependency issues
    // The mammoth library has internal circular dependencies that cause
    // "Cannot access before initialization" errors when pre-bundled by Vite
    exclude: ['mammoth'],
  },
  build: {
    chunkSizeWarningLimit: 600, // Suppress warnings for chunks under 600KB
    modulePreload: {
      // Exclude mammoth from module preloading as it has circular dependencies
      // that cause "Cannot access '$' before initialization" errors when eagerly loaded
      resolveDependencies: (filename, deps) => {
        // Use precise matching for mammoth package to avoid false positives
        return deps.filter(dep => !(dep.includes('/mammoth') || dep.startsWith('mammoth')));
      },
    },
    rollupOptions: {
      // Mark mammoth as having no side effects to prevent static imports
      treeshake: {
        moduleSideEffects: (id) => {
          // mammoth package should not be included as a side-effect import
          // Use node_modules path matching for precision
          if (id.includes('node_modules/mammoth') || id.includes('node_modules\\mammoth')) {
            return false;
          }
          return true;
        },
      },
      output: {
        manualChunks: (id) => {
          // Split vendor libraries into separate chunks for better caching
          if (id.includes('node_modules')) {
            // React core libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            
            // Supabase and TanStack Query
            if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
              return 'supabase-vendor';
            }
            
            // PDF and document processing libraries (heavy) - loaded lazily
            // Split into separate chunks to prevent circular dependency issues between these libraries
            // react-pdf has internal circular dependencies that can cause "Cannot access before initialization" errors
            // when bundled with other document libraries
            if (id.includes('react-pdf') || id.includes('pdfjs-dist')) {
              return 'pdf-vendor';
            }
            
            // Keep mammoth in a separate async chunk to avoid initialization order issues
            // mammoth has internal circular dependencies, so we isolate it
            // The modulePreload filter above excludes this chunk from being eagerly loaded
            if (id.includes('mammoth')) {
              return 'mammoth-async';
            }
            
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'canvas-vendor';
            }
            
            // DOMPurify for security
            if (id.includes('dompurify')) {
              return 'security-vendor';
            }
            
            // Date and markdown utilities
            if (id.includes('date-fns') || id.includes('react-markdown')) {
              return 'content-vendor';
            }
            
            // Chart libraries (if used)
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            
            // Utility libraries
            if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority') || id.includes('zod')) {
              return 'utils-vendor';
            }
            
            // Everything else from node_modules
            return 'vendor';
          }
        },
      },
    },
  },
}));
