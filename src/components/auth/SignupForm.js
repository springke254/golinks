import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

import { signupSchema } from '../../schemas/authSchemas';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';
import Input from '../ui/Input';
import Button from '../ui/Button';
import PasswordStrength from '../ui/PasswordStrength';
import OAuthButtons from './OAuthButtons';
import CaptchaChallenge from '../ui/CaptchaChallenge';

export default function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      displayName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');
  const showCaptcha = failedAttempts >= 2;

  const onSubmit = async (data) => {
    // If CAPTCHA is required but not verified, block submission
    if (showCaptcha && !captchaVerified) {
      toast.error('Please complete the security check first');
      return;
    }

    setIsLoading(true);
    try {
      await signup(data);
      toast.success('Account created! Check your email to verify your account.');
      navigate(ROUTES.LOGIN);
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = err.response.data?.retryAfter || 60;
        toast.error(`Too many attempts — please wait ${retryAfter} seconds before trying again`);
        setFailedAttempts((prev) => prev + 1);
        setCaptchaVerified(false);
        return;
      }
      setFailedAttempts((prev) => prev + 1);
      setCaptchaVerified(false);
      const apiErrors = err.response?.data?.errors;
      if (apiErrors && Array.isArray(apiErrors)) {
        apiErrors.forEach((e) => {
          setError(e.field, { message: e.message });
        });
      } else {
        const message = err.response?.data?.message || 'Failed to create account';
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Display name"
          icon={User}
          type="text"
          placeholder="Your name"
          autoComplete="name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />

        <Input
          label="Email"
          icon={Mail}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <Input
            label="Password"
            icon={Lock}
            type="password"
            placeholder="Create a password"
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
          placeholder="Confirm your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {/* Progressive CAPTCHA — appears after 2+ failed attempts */}
        {showCaptcha && (
          <CaptchaChallenge
            onVerified={() => setCaptchaVerified(true)}
            className="mt-1"
          />
        )}

        <Button type="submit" fullWidth loading={isLoading} disabled={showCaptcha && !captchaVerified}>
          Create account
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-border-strong" />
        <span className="text-xs text-text-muted font-medium uppercase">or</span>
        <div className="flex-1 h-px bg-border-strong" />
      </div>

      {/* OAuth */}
      <OAuthButtons action="Sign up" />

      {/* Login link */}
      <p className="mt-8 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link
          to={ROUTES.LOGIN}
          className="text-primary hover:text-primary-hover font-semibold transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
