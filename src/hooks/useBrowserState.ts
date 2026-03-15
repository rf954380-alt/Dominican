import { useState, useCallback, useEffect } from "react";

export interface ScramjetFrame {
  frame: HTMLIFrameElement;
  back?: () => void;
  forward?: () => void;
  reload?: () => void;
  go?: (url: string) => void;
  destroy?: () => void;
  addEventListener?: (event: string, handler: (e: any) => void) => void;
}

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  pinned?: boolean;
  incognito?: boolean;
  spaceId: string;
  icon?: string;
  frame?: ScramjetFrame;
}

export interface Space {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_SPACES: Space[] = [
  { id: "main", name: "Home", color: "var(--space-blue)" },
];

let tabCounter = 1;

export const SEARCH_ENGINES: Record<string, { name: string; url: string; color: string }> = {
  duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", color: "#DE5833" },
  google:     { name: "Google",     url: "https://www.google.com/search?q=", color: "#4285F4" },
  bing:       { name: "Bing",       url: "https://www.bing.com/search?q=", color: "#00809D" },
  brave:      { name: "Brave",      url: "https://search.brave.com/search?q=", color: "#FB542B" },
};

function getFavicon(url: string): string {
  try {
    if (
      !url ||
      url === "dominican://newtab" ||
      url === "about:blank" ||
      url === "https://"
    )
      return "";
    const clean = url.startsWith("http") ? url : `https://${url}`;
    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(
      clean
    )}&size=32`;
  } catch {
    return "";
  }
}

function formatUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "dominican://newtab";
  if (trimmed.startsWith("dominican://")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" "))
    return `https://${trimmed}`;
  const engineId = localStorage.getItem("dominican-search-engine") || "duckduckgo";
  const base = SEARCH_ENGINES[engineId]?.url ?? SEARCH_ENGINES.duckduckgo.url;
  return base + encodeURIComponent(trimmed);
}

function makeScramjetFrame(url: string): ScramjetFrame | undefined {
  const scramjet = (window as any).scramjet;
  if (!scramjet) {
    console.warn("[browser] Scramjet not ready yet, frame creation skipped");
    return undefined;
  }
  try {
    const scFrame = scramjet.createFrame();
    scFrame.frame.src = scramjet.encodeUrl(url);
    scFrame.frame.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;border:none;opacity:0;transition:opacity 0.25s ease;";
    scFrame.frame.onload = () => {
      scFrame.frame.style.opacity = "1";
    };
    return scFrame;
  } catch (e) {
    console.error("Failed to create scramjet frame:", e);
    return undefined;
  }
}

function createTab(url: string, spaceId: string, incognito = false): Tab {
  const tabId = String(tabCounter++);
  const isNewTab = !url || url === "dominican://newtab" || url === "about:blank";
  const isInternalPage = isNewTab || url.startsWith("dominican://");
  const finalUrl = isNewTab ? "dominican://newtab" : url;
  const frame = isInternalPage ? undefined : makeScramjetFrame(url);
  if (frame) {
    frame.addEventListener?.("urlchange", (e: any) => {
      const newUrl = e?.url || e?.detail?.url || "";
      if (newUrl && newUrl.startsWith("http")) {
        window.dispatchEvent(new CustomEvent("dominican-url-change", {
          detail: { tabId: tabId, url: newUrl }
        }));
      }
    });
  }
  return {
    id: tabId,
    title: isNewTab ? (incognito ? "Incognito" : "New Tab") : url.split("/")[2] || url,
    url: finalUrl,
    favicon: getFavicon(finalUrl),
    spaceId,
    incognito: incognito || undefined,
    frame,
  };
}

function makeNewTabEntry(spaceId: string, incognito = false): Tab {
  return {
    id: String(tabCounter++),
    title: incognito ? "Incognito" : "New Tab",
    url: "dominican://newtab",
    spaceId,
    incognito: incognito || undefined,
  };
}

function getSessionTabs(): Array<{ url: string; title: string; pinned?: boolean }> {
  try {
    const stored = localStorage.getItem("dominican-session-tabs");
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function useBrowserState() {
  const [spaces] = useState<Space[]>(DEFAULT_SPACES);
  const [activeSpaceId] = useState("main");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [splitTabId, setSplitTabId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isUrlFocused, setIsUrlFocused] = useState(false);

  const [tabs, setTabs] = useState<Tab[]>(() => {
    const session = getSessionTabs();
    if (session.length > 0) {
      return session.map(({ url, title, pinned }) => ({
        id: String(tabCounter++),
        title: title || (url === "dominican://newtab" ? "New Tab" : url.split("/")[2] || url),
        url,
        favicon: getFavicon(url),
        pinned,
        spaceId: "main",
      }));
    }
    return [makeNewTabEntry("main")];
  });

  const [activeTabId, setActiveTabId] = useState(() => {
    return String(tabCounter - 1);
  });

  useEffect(() => {
    const toSave = tabs
      .filter(t => !t.incognito)
      .map(({ url, title, pinned }) => ({ url, title, pinned }));
    try {
      localStorage.setItem("dominican-session-tabs", JSON.stringify(toSave));
    } catch {}
  }, [tabs]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const spaceTabs = tabs.filter((t) => t.spaceId === activeSpaceId);
  const pinnedTabs = spaceTabs.filter((t) => t.pinned);
  const unpinnedTabs = spaceTabs.filter((t) => !t.pinned);

  const addTab = useCallback(
    (url?: unknown) => {
      const targetUrl =
        typeof url === "string" && url.trim() ? url : "dominican://newtab";
      const newTab = createTab(targetUrl, activeSpaceId);
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      return newTab;
    },
    [activeSpaceId]
  );

  const addIncognitoTab = useCallback(() => {
    const newTab = makeNewTabEntry(activeSpaceId, true);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    return newTab;
  }, [activeSpaceId]);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const tab = prev.find((t) => t.id === id);
        if (tab?.frame) {
          try {
            tab.frame.frame?.parentNode?.removeChild(tab.frame.frame);
            tab.frame.destroy?.();
          } catch {}
        }
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) {
          const fallback = makeNewTabEntry(activeSpaceId);
          setTimeout(() => setActiveTabId(fallback.id), 0);
          return [fallback];
        }
        if (id === activeTabId) {
          const idx = prev.findIndex((t) => t.id === id);
          const nextActive = next[Math.min(idx, next.length - 1)];
          setTimeout(() => setActiveTabId(nextActive.id), 0);
        }
        return next;
      });
      setSplitTabId((prev) => (prev === id ? null : prev));
    },
    [activeTabId, activeSpaceId]
  );

  const closeAllTabs = useCallback(() => {
    setTabs((prev) => {
      prev.forEach((tab) => {
        try {
          tab.frame?.frame?.parentNode?.removeChild(tab.frame.frame);
          tab.frame?.destroy?.();
        } catch {}
      });
      const fallback = makeNewTabEntry(activeSpaceId);
      setTimeout(() => setActiveTabId(fallback.id), 0);
      return [fallback];
    });
    setSplitTabId(null);
  }, [activeSpaceId]);

  const togglePin = useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t))
    );
  }, []);

  const openSplit = useCallback(() => {
    const newTab = makeNewTabEntry(activeSpaceId);
    setTabs((prev) => [...prev, newTab]);
    setSplitTabId(newTab.id);
  }, [activeSpaceId]);

  const closeSplit = useCallback(() => setSplitTabId(null), []);

  const navigateToUrl = useCallback(
  (rawUrl: unknown) => {
    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) return;
    const url = formatUrl(rawUrl);

    const doNavigate = () => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;

          if (url === "dominican://newtab" || url.startsWith("dominican://")) {
            try {
              t.frame?.frame?.parentNode?.removeChild(t.frame.frame);
              t.frame?.destroy?.();
            } catch {}
            const title = url === "dominican://newtab"
              ? (t.incognito ? "Incognito" : "New Tab")
              : url.replace("dominican://", "").replace(/^\w/, (c) => c.toUpperCase());
            return { ...t, url, title, favicon: "", frame: undefined };
          }

          if (t.frame?.go) {
            try { t.frame.go(url); } catch {}
            const existingTabId = t.id;
            t.frame.addEventListener?.("urlchange", (e: any) => {
              const newUrl = e?.url || e?.detail?.url || "";
              if (newUrl && newUrl.startsWith("http")) {
                window.dispatchEvent(new CustomEvent("dominican-url-change", {
                  detail: { tabId: existingTabId, url: newUrl }
                }));
              }
            });
            return { ...t, url, title: url.split("/")[2] || url, favicon: getFavicon(url) };
          }

          const frame = makeScramjetFrame(url);
          if (frame) {
            const newTabId = t.id;
            frame.addEventListener?.("urlchange", (e: any) => {
              const newUrl = e?.url || e?.detail?.url || "";
              if (newUrl && newUrl.startsWith("http")) {
                window.dispatchEvent(new CustomEvent("dominican-url-change", {
                  detail: { tabId: newTabId, url: newUrl }
                }));
              }
            });
          }
          return {
            ...t,
            url,
            title: url.split("/")[2] || url,
            favicon: getFavicon(url),
            ...(frame ? { frame } : {}),
          };
        })
      );
    };

    if (!(window as any).scramjet && !url.startsWith("dominican://")) {
      const interval = setInterval(() => {
        if ((window as any).scramjet) {
          clearInterval(interval);
          doNavigate();
        }
      }, 100);
    } else {
      doNavigate();
    }

    setUrlInput("");
    setIsUrlFocused(false);
  },
  [activeTabId]
);

  const updateTabMeta = useCallback(
    (id: string, updates: Partial<Pick<Tab, "title" | "url" | "favicon">>) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    },
    []
  );

  const updateTabUrl = useCallback((tabId: string, url: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, url, favicon: getFavicon(url) } : t))
    );
    setActiveTabId((prev) => {
      if (prev === tabId) setUrlInput(url);
      return prev;
    });
  }, []);

  return {
    spaces,
    tabs,
    activeTabId,
    activeSpaceId,
    activeTab,
    pinnedTabs,
    unpinnedTabs,
    sidebarCollapsed,
    splitTabId,
    urlInput,
    isUrlFocused,
    setActiveTabId,
    setSidebarCollapsed,
    setUrlInput,
    setIsUrlFocused,
    addTab,
    addIncognitoTab,
    closeTab,
    closeAllTabs,
    togglePin,
    openSplit,
    closeSplit,
    setSplitTabId,
    navigateToUrl,
    updateTabMeta,
    updateTabUrl,
  };
}
