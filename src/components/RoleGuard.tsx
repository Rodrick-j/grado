'use client';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/data';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { role, loading } = useAuth();

  if (loading) return null; // Or a skeleton

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
