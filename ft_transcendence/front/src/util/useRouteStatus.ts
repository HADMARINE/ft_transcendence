"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { updateUserStatus } from "@/api/users";
import { useGameData } from "./useGameData";


export function useRouteStatus() {
  const pathname = usePathname();
  const { client } = useGameData();
  const lastStatusRef = useRef<'online' | 'in_game' | null>(null);

  useEffect(() => {
    
    const isGamePage = pathname.includes("pong") || pathname.includes("shoot");
    const targetStatus: 'offline' | 'online' | 'in_game' = isGamePage ? "in_game" : "online";

    
    if (lastStatusRef.current === targetStatus) {
      return;
    }
    lastStatusRef.current = targetStatus;

    const updateStatus = async () => {
      try {
        await updateUserStatus(targetStatus);

        
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
