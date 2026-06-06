"use client";

import { useEffect, useRef } from "react";
import { gtmPush } from "@/lib/gtm";

/**
 * Dispara un evento del dataLayer UNA vez al montar la página.
 * Para eventos de "vista": view_item (producto) y view_item_list (categoría).
 */
export function GtmEvent({ event, data }: { event: string; data?: Record<string, unknown> }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    gtmPush({ event, ...(data || {}) });
  }, [event, data]);

  return null;
}
