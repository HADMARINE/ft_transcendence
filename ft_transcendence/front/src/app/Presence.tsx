"use client";

import { useEffect } from "react";
import { updateUserStatus } from "@/api/users";

export default function Presence() {
  useEffect(() => {
    (async () => {
      try {
        // If user has a valid session cookie, mark as online.
        await updateUserStatus("online");
      } catch {
        // Ignore when not authenticated.
      }
    })();

    const onBeforeUnload = () => {
      // Best-effort; async not guaranteed during unload.
      void updateUserStatus("offline");
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return null;
}
