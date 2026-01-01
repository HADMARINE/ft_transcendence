"use client";

import { useRouteStatus } from "@/util/useRouteStatus";


export function RouteStatusTracker() {
  useRouteStatus();
  return null;
}
