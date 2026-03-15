import { useEffect, useRef } from "react";

export default function ChatPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frameEl: HTMLIFrameElement | null = null;
    let cancelled = false;

    const tryCreate = () => {
      if (cancelled) return true;
      const scramjet = (window as any).scramjet;
      if (!scramjet) return false;
      try {
        const scFrame = scramjet.createFrame();
        frameEl = scFrame.frame;
        frameEl!.src = scramjet.encodeUrl("https://vtx.coinknowledge.net/embed/petezah");
        frameEl!.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:none;";
        container.appendChild(frameEl!);
        return true;
      } catch {
        return false;
      }
    };

    let interval: ReturnType<typeof setInterval> | null = null;
    if (!tryCreate()) {
      interval = setInterval(() => {
        if (tryCreate()) { clearInterval(interval!); interval = null; }
      }, 200);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (frameEl?.parentNode) frameEl.parentNode.removeChild(frameEl);
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
