import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Shield } from 'lucide-react';

import { inviteSchema } from '../../schemas/workspaceSchemas';
import { useCreateInvite } from '../../hooks/useInvites';
import { WORKSPACE_ROLES } from '../../utils/constants';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function InviteMemberModal({ open, onClose }) {
  const createInvite = useCreateInvite();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: WORKSPACE_ROLES.MEMBER,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    try {
      await createInvite.mutateAsync(data);
      reset();
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Invite member">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email address"
          icon={Mail}
          type="email"
          placeholder="colleague@company.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[WORKSPACE_ROLES.MEMBER, WORKSPACE_ROLES.ADMIN].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setValue('role', role, { shouldValidate: true })}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-2 transition-colors ${
                  selectedRole === role
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'bg-dark-elevated text-text-secondary border-border-strong hover:border-text-muted'
                }`}
              >
                <Shield className="w-4 h-4" />
                {role}
              </button>
            ))}
          </div>
          {errors.role && (
            <p className="mt-1 text-xs text-danger font-medium">{errors.role.message}</p>
          )}
          <p className="mt-2 text-xs text-text-muted">
            {selectedRole === WORKSPACE_ROLES.ADMIN
              ? 'Admins can manage members, invites, and links.'
              : 'Members can create and manage their own links.'}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={createInvite.isPending} className="flex-1">
            Send invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
