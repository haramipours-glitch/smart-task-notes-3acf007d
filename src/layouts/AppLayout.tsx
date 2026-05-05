import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIPanel } from "@/components/AIPanel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Search } from "lucide-react";
import OfflineIndicator from "@/components/OfflineIndicator";
import InstallPrompt from "@/components/InstallPrompt";
import EdgeSwipeHandler from "@/components/EdgeSwipeHandler";
import ClinicalDisclaimer from "@/components/ClinicalDisclaimer";
import RemindersRunner from "@/components/RemindersRunner";
import BackButtonHandler from "@/components/BackButtonHandler";
import CommandPalette from "@/components/CommandPalette";
import { BottomTabBar } from "@/components/BottomTabBar";
import Onboarding from "@/components/Onboarding";
import HeaderBackButton from "@/components/HeaderBackButton";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function AppLayout() {
  const [aiOpen, setAiOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    if (loc.pathname.startsWith("/app/")) {
      try { localStorage.setItem("last_route", loc.pathname); } catch {}
    }
  }, [loc.pathname]);
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 border-b flex items-center justify-between px-3 bg-card/50 backdrop-blur sticky top-0 z-10">
            <div className="flex items-center gap-1">
              <SidebarTrigger className="hidden md:inline-flex" />
              <HeaderBackButton />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">جستجو</span>
                <kbd className="hidden sm:inline text-[10px] bg-muted px-1.5 py-0.5 rounded ltr">⌘K</kbd>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAiOpen(true)} className="gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-20 md:pb-4">
            <Outlet />
          </main>
        </div>
        <AIPanel open={aiOpen} onOpenChange={setAiOpen} />
        <OfflineIndicator />
        <InstallPrompt />
        <EdgeSwipeHandler />
        <ClinicalDisclaimer />
        <RemindersRunner />
        <BackButtonHandler />
        <CommandPalette />
        <BottomTabBar />
      </div>
    </SidebarProvider>
  );
}
