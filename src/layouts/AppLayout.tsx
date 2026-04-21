import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIPanel } from "@/components/AIPanel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import OfflineIndicator from "@/components/OfflineIndicator";
import InstallPrompt from "@/components/InstallPrompt";
import EdgeSwipeHandler from "@/components/EdgeSwipeHandler";

export default function AppLayout() {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 border-b flex items-center justify-between px-3 bg-card/50 backdrop-blur sticky top-0 z-10">
            <SidebarTrigger />
            <Button variant="outline" size="sm" onClick={() => setAiOpen(true)} className="gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI
            </Button>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
        <AIPanel open={aiOpen} onOpenChange={setAiOpen} />
        <OfflineIndicator />
        <InstallPrompt />
        <EdgeSwipeHandler />
      </div>
    </SidebarProvider>
  );
}
