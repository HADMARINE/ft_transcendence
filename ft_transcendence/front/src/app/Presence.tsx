"use client";

import { useEffect } from "react";
import { updateUserStatus } from "@/api/users";

export default function Presence() {
  useEffect(() => {
    (async () => {
      try {
        
        await updateUserStatus("online");
      } catch {
        
      }
    })();

    const onBeforeUnload = () => {
      
      void updateUserStatus("offline");
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return null;
}
