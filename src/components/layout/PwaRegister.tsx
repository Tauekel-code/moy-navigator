"use client";

import { useEffect } from "react";

/** Раздел 24 ТЗ: регистрация service worker для установки приложения на главный экран. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // офлайн-кэш — не критичная функция, тихо игнорируем сбой регистрации
    });
  }, []);

  return null;
}
