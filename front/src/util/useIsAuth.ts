"use client";

import { authStatus } from "@/api/auth";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

interface UseIsAuthProps {
  redirectToLogin?: boolean; // If true, redirect to login if no credentials was found
  returnToCurrentPage?: boolean; // If true, return to previous page before login
}
/**
 *
 * @param props? UseIsAuthProps
 * @returns boolean | null - true if authenticated, false if not authenticated, null if not yet verified
 */
export function useIsAuth(props?: UseIsAuthProps): boolean | null {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuth, setIsAuth] = React.useState<null | boolean>(null);
  React.useEffect(() => {
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
  }, []);
  return isAuth;
}
