"use client";

import { useRouteStatus } from "@/util/useRouteStatus";

/**
 * Wrapper component that tracks route-based status changes
 */
export function RouteStatusTracker() {
  useRouteStatus();
  return null;
}
