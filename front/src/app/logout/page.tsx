"use client";

import { logout } from "@/api/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TOKEN_SYNC_EVENT } from "@/util/useGameData";

const LogoutPage = () => {
  const router = useRouter();

  useEffect(() => {
    logout().then(() => {
      try {
        localStorage.removeItem("token");
        window.dispatchEvent(new Event(TOKEN_SYNC_EVENT));
      } catch (err) {
        console.warn("Failed to clear auth token:", err);
      }
      router.replace("../");
    });
  }, []);
  return <>Loading...</>;
};

export default LogoutPage;
