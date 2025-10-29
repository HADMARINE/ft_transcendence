"use client";

import { logout } from "@/api/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LogoutPage = () => {
  const router = useRouter();

  useEffect(() => {
    logout().then(() => {
      router.replace("../");
    });
  }, []);
  return <>Loading...</>;
};

export default LogoutPage;
