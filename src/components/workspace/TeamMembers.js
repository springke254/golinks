import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Mail, Shield, MoreHorizontal, UserMinus, ChevronDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useMembers, useUpdateMemberRole, useRemoveMember } from '../../hooks/useMembers';
import { useInvites, useCreateInvite, useRevokeInvite, useResendInvite } from '../../hooks/useInvites';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useAuth } from '../../hooks/useAuth';
import { WORKSPACE_ROLES } from '../../utils/constants';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import InviteMemberModal from './InviteMemberModal';

const ROLE_BADGE = {
  OWNER: 'success',
  ADMIN: 'warning',
  MEMBER: 'neutral',
};

export default function TeamMembers() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { activeWorkspace, hasPermission } = useWorkspace();
  const { user } = useAuth();

  const { data: membersData, isLoading: membersLoading } = useMembers({ page: 0, size: 50 });
  const { data: invitesData, isLoading: invitesLoading } = useInvites({ page: 0, size: 50 });

  const canManageMembers = hasPermission('MANAGE_MEMBERS');
  const canManageInvites = hasPermission('MANAGE_INVITES');

  const members = membersData?.content || [];
  const invites = invitesData?.content || [];
  const pendingInvites = invites.filter((i) => !i.redeemed && !i.revoked);

  return (
    <div className="space-y-8">
      {/* Header + invite button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Team members</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {members.length} member{members.length !== 1 ? 's' : ''}
            {pendingInvites.length > 0 && ` · ${pendingInvites.length} pending invite${pendingInvites.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManageInvites && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Mail className="w-4 h-4" />
            Invite
          </Button>
        )}
      </div>

      {/* Members list */}
      <div className="border-2 border-border-strong divide-y-2 divide-border-strong">
        {membersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
          </div>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              currentUserId={user?.id}
              isOwner={activeWorkspace?.role === WORKSPACE_ROLES.OWNER}
              canManage={canManageMembers}
            />
          ))
        )}
      </div>

      {/* Pending invites */}
      {canManageInvites && pendingInvites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Pending invites</h3>
          <div className="border-2 border-border-strong divide-y-2 divide-border-strong">
            {pendingInvites.map((invite) => (
              <InviteRow key={invite.id} invite={invite} />
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function MemberRow({ member, currentUserId, isOwner, canManage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const isCurrentUser = member.userId === currentUserId;
  const isMemberOwner = member.role === WORKSPACE_ROLES.OWNER;
  const canEdit = canManage && !isCurrentUser && !isMemberOwner;

  const handleRoleChange = (role) => {
    updateRole.mutate({ userId: member.userId, role });
    setMenuOpen(false);
  };

  const handleRemove = () => {
    if (window.confirm(`Remove ${member.displayName || member.email} from this workspace?`)) {
      removeMember.mutate(member.userId);
    }
    setMenuOpen(false);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Avatar placeholder */}
      <div className="w-9 h-9 bg-dark-elevated border-2 border-border-strong flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-text-secondary">
          {(member.displayName || member.email || '?').charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-text-primary truncate">
            {member.displayName || 'Unnamed'}
          </p>
          {isCurrentUser && (
            <span className="text-xs text-text-muted">(you)</span>
          )}
        </div>
        <p className="text-xs text-text-muted truncate">{member.email}</p>
      </div>

      {/* Role badge */}
      <Badge variant={ROLE_BADGE[member.role] || 'neutral'}>
        {member.role}
      </Badge>

      {/* Actions */}
      {canEdit && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-dark-elevated border-2 border-transparent hover:border-border-strong transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-dark-card border-2 border-border-strong shadow-xl min-w-[160px]"
                >
                  <div className="py-1">
                    <p className="px-3 py-1.5 text-xs text-text-muted font-semibold uppercase tracking-wider">Change role</p>
                    {[WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.MEMBER].map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(role)}
                        disabled={member.role === role}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          member.role === role
                            ? 'text-primary bg-primary/5'
                            : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 inline mr-2" />
                        {role}
                      </button>
                    ))}
                  </div>
                  <div className="border-t-2 border-border-strong py-1">
                    <button
                      onClick={handleRemove}
                      className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                    >
                      <UserMinus className="w-3.5 h-3.5 inline mr-2" />
                      Remove
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function InviteRow({ invite }) {
  const revokeInvite = useRevokeInvite();
  const resendInvite = useResendInvite();

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 bg-dark-elevated border-2 border-border-strong flex items-center justify-center shrink-0">
        <Mail className="w-4 h-4 text-text-muted" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{invite.email}</p>
        <p className="text-xs text-text-muted">
          Expires {new Date(invite.expiresAt).toLocaleDateString()}
        </p>
      </div>

      <Badge variant={ROLE_BADGE[invite.role] || 'neutral'}>
        {invite.role}
      </Badge>

      <div className="flex items-center gap-1">
        <button
          onClick={() => resendInvite.mutate(invite.id)}
          disabled={resendInvite.isPending}
          className="px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 border-2 border-transparent hover:border-primary transition-colors"
        >
          Resend
        </button>
        <button
          onClick={() => revokeInvite.mutate(invite.id)}
          disabled={revokeInvite.isPending}
          className="px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10 border-2 border-transparent hover:border-danger transition-colors"
        >
          Revoke
        </button>
      </div>
    </div>
  );
}
