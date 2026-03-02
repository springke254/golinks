import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

import AuthLayout from '../../components/auth/AuthLayout';
import Button from '../../components/ui/Button';
import * as authService from '../../services/authService';
import { ROUTES } from '../../utils/constants';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token was provided.');
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        await authService.verifyEmail(token);
        if (!cancelled) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(
            err.response?.data?.message || 'Email verification failed. The link may have expired.'
          );
        }
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthLayout title="Email verification" subtitle="Confirming your email address">
      <div className="w-full max-w-sm text-center space-y-6">
        {status === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-sm text-text-secondary">Verifying your email...</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-success flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-text-inverse" />
            </div>
            <p className="text-sm text-text-secondary">{message}</p>
            <Link to={ROUTES.LOGIN}>
              <Button>Sign in</Button>
            </Link>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-danger flex items-center justify-center">
              <XCircle className="w-8 h-8 text-text-inverse" />
            </div>
            <p className="text-sm text-text-secondary">{message}</p>
            <Link to={ROUTES.LOGIN}>
              <Button variant="secondary">Back to sign in</Button>
            </Link>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
}
