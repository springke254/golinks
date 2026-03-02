import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import { forgotPasswordSchema } from '../../schemas/authSchemas';
import * as authService from '../../services/authService';
import { ROUTES } from '../../utils/constants';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = err.response.data?.retryAfter || 60;
        toast.error(`Too many attempts — please wait ${retryAfter} seconds before trying again`);
        setIsLoading(false);
        return;
      }
      // Always show success to prevent email enumeration
      setSent(true);
      toast.success('If an account exists, a reset link has been sent.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary mx-auto flex items-center justify-center">
            <Mail className="w-8 h-8 text-text-inverse" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Check your email</h2>
          <p className="text-sm text-text-secondary">
            If an account with that email exists, we've sent a password reset link.
            Please check your inbox and spam folder.
          </p>
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-hover font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email"
          icon={Mail}
          type="email"
          placeholder="Enter your email address"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Button type="submit" fullWidth loading={isLoading}>
          Send reset link
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
