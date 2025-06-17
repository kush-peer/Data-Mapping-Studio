import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Configuration from "./pages/Configuration";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="navbar w-full border-b">
            <div className="container mx-auto px-4 py-2 flex items-center justify-between">
              <span className="font-bold text-xl tracking-tight"></span>
              <nav className="flex items-center gap-2">
                <Link to="/">
                  <Button className="btn-nav">Home</Button>
                </Link>
                <Link to="/configuration">
                  <Button className="btn-nav">Configuration</Button>
                </Link>
              </nav>
            </div>
          </div>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/configuration" element={<Configuration />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
