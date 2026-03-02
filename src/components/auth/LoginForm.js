import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

import { loginSchema } from '../../schemas/authSchemas';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';
import Input from '../ui/Input';
import Button from '../ui/Button';
import OAuthButtons from './OAuthButtons';

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login(data);
      toast.success('Welcome back!');
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = err.response.data?.retryAfter || 60;
        toast.error(`Too many attempts — please wait ${retryAfter} seconds before trying again`);
        return;
      }
      const apiErrors = err.response?.data?.errors;
      if (apiErrors && Array.isArray(apiErrors)) {
        apiErrors.forEach((e) => {
          setError(e.field, { message: e.message });
        });
      } else {
        const message = err.response?.data?.message || 'Invalid email or password';
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
          label="Email"
          icon={Mail}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          icon={Lock}
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={isLoading}>
          Sign in
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-border-strong" />
        <span className="text-xs text-text-muted font-medium uppercase">or</span>
        <div className="flex-1 h-px bg-border-strong" />
      </div>

      {/* OAuth */}
      <OAuthButtons action="Sign in" />

      {/* Signup link */}
      <p className="mt-8 text-center text-sm text-text-secondary">
        Don't have an account?{' '}
        <Link
          to={ROUTES.SIGNUP}
          className="text-primary hover:text-primary-hover font-semibold transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
