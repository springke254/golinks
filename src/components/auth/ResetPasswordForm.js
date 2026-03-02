import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { resetPasswordSchema } from '../../schemas/authSchemas';
import * as authService from '../../services/authService';
import { ROUTES } from '../../utils/constants';
import Input from '../ui/Input';
import Button from '../ui/Button';
import PasswordStrength from '../ui/PasswordStrength';

export default function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({ token, password: data.password });
      setDone(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = err.response.data?.retryAfter || 60;
        toast.error(`Too many attempts — please wait ${retryAfter} seconds before trying again`);
      } else {
        const message = err.response?.data?.message || 'Failed to reset password';
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <p className="text-danger font-medium">Invalid or missing reset token.</p>
        <Link
          to={ROUTES.FORGOT_PASSWORD}
          className="text-primary hover:text-primary-hover font-semibold text-sm"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-16 h-16 bg-success mx-auto flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-text-inverse" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Password reset!</h2>
        <p className="text-sm text-text-secondary">
          Your password has been reset successfully. You can now sign in with your new password.
        </p>
        <Button onClick={() => navigate(ROUTES.LOGIN)} fullWidth>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Input
            label="New password"
            icon={Lock}
            type="password"
            placeholder="Enter your new password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrength password={passwordValue} />
        </div>

        <Input
          label="Confirm password"
          icon={Lock}
          type="password"
          placeholder="Confirm your new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" fullWidth loading={isLoading}>
          Reset password
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-secondary">
        <Link
          to={ROUTES.LOGIN}
          className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
