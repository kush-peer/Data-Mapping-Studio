import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Configuration from "./pages/Configuration";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

const AppContent: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Don't show navbar on login page
  const showNavbar = isAuthenticated && !location.pathname.includes('/login');

  return (
    <>
      {showNavbar && (
        <div className="navbar w-full border-b">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <span className="font-bold text-xl tracking-tight">Data Mapping Studio</span>
            <nav className="flex items-center gap-2">
              <Link to="/projects">
                <Button className="btn-nav">Projects</Button>
              </Link>
              <Link to="/">
                <Button className="btn-nav">Mapping</Button>
              </Link>
              <Link to="/configuration">
                <Button className="btn-nav">Configuration</Button>
              </Link>
            </nav>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/configuration" element={<ProtectedRoute><Configuration /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ProjectProvider>
              <AppContent />
            </ProjectProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
