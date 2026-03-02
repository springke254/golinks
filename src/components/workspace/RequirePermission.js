import React from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';

/**
 * Conditionally renders children based on workspace permission.
 * If the user lacks the permission, renders `fallback` (default: nothing).
 *
 * Usage:
 *   <RequirePermission permission="MANAGE_MEMBERS">
 *     <InviteButton />
 *   </RequirePermission>
 *
 *   <RequirePermission permission="VIEW_AUDIT" fallback={<NoAccess />}>
 *     <AuditTable />
 *   </RequirePermission>
 */
export default function RequirePermission({ permission, fallback = null, children }) {
  const { hasPermission } = useWorkspace();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return <>{children}</>;
}
