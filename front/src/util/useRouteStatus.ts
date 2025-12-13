"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { updateUserStatus } from "@/api/users";
import { useGameData } from "./useGameData";

/**
 * Tracks the current route and sets user status based on whether they're on a game page or not.
 * Pages containing "pong" or "shoot" are game pages (status = "in_game")
 * All other pages are non-game pages (status = "online")
 */
export function useRouteStatus() {
  const pathname = usePathname();
  const { client } = useGameData();
  const lastStatusRef = useRef<'online' | 'in_game' | null>(null);

  useEffect(() => {
    // Check if we're on a game page
    const isGamePage = pathname.includes("pong") || pathname.includes("shoot");
    const targetStatus: 'offline' | 'online' | 'in_game' = isGamePage ? "in_game" : "online";

    // Only update if status actually changed
    if (lastStatusRef.current === targetStatus) {
      return;
    }
    lastStatusRef.current = targetStatus;

    const updateStatus = async () => {
      try {
        await updateUserStatus(targetStatus);

        // Notify other clients via websocket if connected
        if (client?.connected) {
          client.emit("user-status-changed", {
            status: targetStatus,
          });
        }
      } catch (err) {
        console.error(`Failed to update status to ${targetStatus}:`, err);
      }
    };

    updateStatus();
  }, [pathname, client]);
}
