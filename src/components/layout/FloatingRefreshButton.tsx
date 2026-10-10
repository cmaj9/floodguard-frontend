import { useState } from "react";
import { RefreshCwIcon } from "../ui/Icons";

export default function FloatingRefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent("app:refresh"));
    setTimeout(() => {
      setRefreshing(false);
    }, 850);
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      className={`floating-refresh-pod tactile-press ${refreshing ? "refreshing" : ""}`}
      title="รีเฟรชข้อมูลเซนเซอร์ทุกระบบ"
      aria-label="รีเฟรชข้อมูลเซนเซอร์ทุกระบบ"
    >
      <RefreshCwIcon size={18} className={refreshing ? "spin-refresh" : ""} />
    </button>
  );
}
