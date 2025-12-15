"use client";

import { authStatus } from "@/api/auth";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

interface UseIsAuthProps {
  redirectToLogin?: boolean;
  returnToCurrentPage?: boolean;
}

export function useIsAuth(props?: UseIsAuthProps): boolean | null {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuth, setIsAuth] = React.useState<null | boolean>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isMounted) return;

    authStatus()
      .then((v) => {
        if (v) {
          setIsAuth(true);
        } else {
          throw new Error("Not Authenticated");
        }
      })
      .catch(() => {
        setIsAuth(false);
        if (props?.redirectToLogin) {
          router.replace(
            `/login${props?.returnToCurrentPage ? `?redirect=${pathname}` : ""}`
          );
        }
      });
  }, [isMounted, props?.redirectToLogin, props?.returnToCurrentPage, pathname, router]);

  return isAuth;
}