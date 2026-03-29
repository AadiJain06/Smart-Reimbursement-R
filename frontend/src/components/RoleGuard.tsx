import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore, type Role } from '@/store/authStore';

export function RoleGuard({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
