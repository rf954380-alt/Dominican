import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import { useBrowserState } from "@/hooks/useBrowserState";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/BrowserSidebar";
import Toolbar from "@/components/BrowserToolbar";
import ContentArea from "@/components/ContentArea";
import StatusBar from "@/components/StatusBar";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export default function ArcBrowser() {
  const state = useBrowserState();
  const { user, setUser } = useAuth();
  const isMobile = useIsMobile();
  const splitTab = state.splitTabId
    ? state.tabs.find((t) => t.id === state.splitTabId)
    : undefined;
  const [showNotifications, setShowNotifications] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [scramjetReady, setScramjetReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let progress = 0;
    const tick = setInterval(() => {
      if ((window as any).scramjet) {
        setScramjetReady(true);
        setLoadingProgress(100);
        clearInterval(tick);
        return;
      }
      progress = Math.min(progress + Math.random() * 12, 85);
      setLoadingProgress(Math.round(progress));
    }, 200);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { tabId, url } = (e as CustomEvent).detail;
      state.updateTabUrl(tabId, url);
      const tab = state.tabs.find((t) => t.id === tabId);
      if (tab?.incognito) return;
      try {
        const entries = JSON.parse(localStorage.getItem("dominican-history") || "[]");
        const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`;
        const newEntry = { id: String(Date.now()) + Math.random(), url, title: url, favicon, visitedAt: Date.now(), isProxied: true };
        const filtered = entries.filter((entry: any) => entry.url !== url);
        localStorage.setItem("dominican-history", JSON.stringify([newEntry, ...filtered].slice(0, 500)));
      } catch {}
    };
    window.addEventListener("dominican-url-change", handler);
    return () => window.removeEventListener("dominican-url-change", handler);
  }, [state.tabs]);

  const sidebarOpen = !state.sidebarCollapsed;

  return (
    <div style={{ height: "100dvh", width: "100vw", display: "flex", overflow: "hidden", backgroundColor: "hsl(220 30% 7%)" }}>
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
          onClick={() => state.setSidebarCollapsed(true)}
        />
      )}
      <Sidebar
        spaces={state.spaces}
        activeSpaceId={state.activeSpaceId}
        pinnedTabs={state.pinnedTabs}
        unpinnedTabs={state.unpinnedTabs}
        activeTabId={state.activeTabId}
        collapsed={state.sidebarCollapsed}
        mobileOverlay={isMobile}
        onSpaceSwitch={() => {}}
        onTabSelect={state.setActiveTabId}
        onTabClose={state.closeTab}
        onTabPin={state.togglePin}
        onTabSplit={() => state.openSplit()}
        onAddTab={() => state.addTab()}
        onAddIncognitoTab={state.addIncognitoTab}
        onToggleCollapse={() => state.setSidebarCollapsed(!state.sidebarCollapsed)}
        onAccountClick={() => state.navigateToUrl("dominican://account")}
        onNavigate={state.navigateToUrl}
        user={user}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AnimatePresence>
          {!scramjetReady && (
            <motion.div
              key="proxy-bar"
              className="absolute top-0 left-0 right-0 z-50 h-0.5 bg-foreground/5"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400"
                style={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.2 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <Toolbar
          activeTab={state.activeTab}
          urlInput={state.urlInput}
          isUrlFocused={state.isUrlFocused}
          onUrlChange={state.setUrlInput}
          onUrlFocus={state.setIsUrlFocused}
          onNavigate={state.navigateToUrl}
          onNotificationClick={() => state.navigateToUrl("dominican://account")}
          onCloseTab={() => state.activeTab && state.closeTab(state.activeTab.id)}
          onCloseAllTabs={state.closeAllTabs}
          onNewTab={() => state.addTab()}
          zoomLevel={zoomLevel}
          onZoomIn={() => setZoomLevel((z) => Math.min(z + 10, 200))}
          onZoomOut={() => setZoomLevel((z) => Math.max(z - 10, 50))}
          onResetZoom={() => setZoomLevel(100)}
          onMobileMenu={isMobile ? () => state.setSidebarCollapsed(false) : undefined}
        />
        <ContentArea
          tabs={state.tabs}
          activeTab={state.activeTab}
          splitTab={splitTab}
          onNavigate={state.navigateToUrl}
          onNewTab={() => state.addTab()}
          onCloseSplit={state.closeSplit}
        />
        <StatusBar
          tabCount={state.tabs.length}
          spaceCount={state.spaces.length}
        />
      </main>
    </div>
  );
}
