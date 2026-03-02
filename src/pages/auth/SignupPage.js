import React from 'react';

import AuthLayout from '../../components/auth/AuthLayout';
import SignupForm from '../../components/auth/SignupForm';

export default function SignupPage() {
  return (
    <AuthLayout title="Create an account" subtitle="Get started with Golinks for free">
      <SignupForm />
    </AuthLayout>
  );
}
