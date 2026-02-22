"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/lib/stores/session-store";
import { UserRole } from "@/lib/auth/types";
import { getMockUserByRole } from "@/lib/auth/mock";

export function MockSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const login = useSessionStore((state) => state.login);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
      const mockUser = getMockUserByRole(UserRole.GLOBAL_ADMIN);
      if (mockUser) {
        login(mockUser);
      }
    }
  }, [login]);

  return <>{children}</>;
}
