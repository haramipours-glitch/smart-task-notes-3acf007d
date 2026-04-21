import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { getQueue, onQueueChange, flushQueue } from "@/lib/offlineQueue";
import { Button } from "@/components/ui/button";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    const refresh = async () => setPending((await getQueue()).length);
    refresh();
    const off = onQueueChange(refresh);
    const t = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
      off();
      clearInterval(t);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border bg-card/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
      {!online ? (
        <>
          <WifiOff className="h-3.5 w-3.5 text-destructive" />
          <span>آفلاین — تغییرات ذخیره می‌شود</span>
        </>
      ) : (
        <>
          <CloudOff className="h-3.5 w-3.5 text-amber-500" />
          <span>{pending} تغییر در صف</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              await flushQueue();
              setSyncing(false);
            }}
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
          </Button>
        </>
      )}
    </div>
  );
}
