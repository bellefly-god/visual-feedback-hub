import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // Code splitting and chunk optimization
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: (id) => {
          // React core - rarely changes, good for caching
          if (id.includes("react-dom") || id.includes("react/")) {
            return "vendor-react";
          }
          
          // Radix UI components - large, stable
          if (id.includes("@radix-ui/react-")) {
            return "vendor-ui";
          }
          
          // PDF.js - very large, only needed for PDF editing
          if (id.includes("pdfjs-dist") || id.includes("pdf.js")) {
            return "vendor-pdf";
          }
          
          // Framer Motion - animation library
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          
          // Charts - only needed on Dashboard
          if (id.includes("recharts") || id.includes(" recharts")) {
            return "vendor-charts";
          }
          
          // Supabase client
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }
          
          // React Query
          if (id.includes("@tanstack")) {
            return "vendor-query";
          }
          
          // Lucide icons
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          
          // Tailwind CSS utilities
          if (id.includes("tailwind")) {
            return "vendor-tailwind";
          }
        },
        
        // Chunk naming
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || "";
          if (/\.(woff|woff2|ttf|eot)$/.test(info)) {
            return "assets/fonts/[name]-[hash][extname]";
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(info)) {
            return "assets/images/[name]-[hash][extname]";
          }
          if (/\.css$/.test(info)) {
            return "assets/css/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
    
    // Warn about large chunks
    chunkSizeWarningLimit: 500,
    
    // Enable source maps for production debugging
    sourcemap: mode === "development",
    
    // CSS code splitting
    cssCodeSplit: true,
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "lucide-react",
      "clsx",
      "tailwind-merge",
    ],
  },
}));
