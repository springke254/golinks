import React from 'react';

import AuthLayout from '../../components/auth/AuthLayout';
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Reset password" subtitle="Choose a new password for your account">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
