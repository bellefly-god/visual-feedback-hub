import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Upload from "./pages/Upload";
import Editor from "./pages/Editor";
import Review from "./pages/Review";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { DEMO_PROJECT_ID, DEMO_REVIEW_TOKEN, routePaths } from "./lib/routePaths";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path={routePaths.home} element={<Index />} />
          <Route path={routePaths.upload} element={<Upload />} />
          <Route path={routePaths.editorLegacy} element={<Navigate to={routePaths.editor(DEMO_PROJECT_ID)} replace />} />
          <Route path="/editor/:projectId" element={<Editor />} />
          <Route path={routePaths.reviewLegacy} element={<Navigate to={routePaths.review(DEMO_REVIEW_TOKEN)} replace />} />
          <Route path="/review/:token" element={<Review />} />
          <Route path={routePaths.dashboard} element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
