"use client";

import type { ReactNode } from "react";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: unknown[];
  label?: string;
}

export default function RoleGuard({ children }: RoleGuardProps) {
  return <>{children}</>;
}
