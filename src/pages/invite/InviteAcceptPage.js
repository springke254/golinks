import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Check, AlertTriangle, Loader2, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useValidateInviteToken, useAcceptInvite } from '../../hooks/useInvites';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../../hooks/useWorkspace';
import { ROUTES, AUTH_IMAGES } from '../../utils/constants';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';
import RateLimitBanner from '../../components/ui/RateLimitBanner';

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { onWorkspaceCreated, refreshWorkspaces } = useWorkspace();

  const { data: validation, isLoading: validating, error: validationError } = useValidateInviteToken(token);
  const { mutateAsync: acceptInvite, isPending: accepting } = useAcceptInvite();

  // No token — redirect to dashboard
  useEffect(() => {
    if (!token) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [token, navigate]);

  // Store token in sessionStorage for signup-then-accept flow (Case B)
  useEffect(() => {
    if (token) {
      sessionStorage.setItem('golinks_pending_invite_token', token);
    }
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      // Not logged in — redirect to login with return URL
      navigate(`${ROUTES.LOGIN}?redirect=${encodeURIComponent(`${ROUTES.INVITE}?token=${token}`)}`);
      return;
    }

    try {
      const result = await acceptInvite(token);
      // Clear the pending invite token
      sessionStorage.removeItem('golinks_pending_invite_token');
      await refreshWorkspaces();
      toast.success('Welcome to the workspace!');
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch {
      // Error toast handled by hook
    }
  };

  // Determine specific error states
  const errorCode = validationError?.response?.data?.code || validation?.code;
  const isExpired = errorCode === 'INVITE_EXPIRED' || (validation && !validation.valid && validation.reason === 'expired');
  const isRevoked = errorCode === 'INVITE_REVOKED' || (validation && !validation.valid && validation.reason === 'revoked');
  const isAlreadyAccepted = errorCode === 'ALREADY_ACCEPTED' || (validation && !validation.valid && validation.reason === 'already_accepted');
  const isGenericError = (validationError || (validation && !validation.valid)) && !isExpired && !isRevoked && !isAlreadyAccepted;
  const isValid = validation && validation.valid;

  const renderErrorContent = () => {
    if (isExpired) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-warning/10 border-2 border-warning flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Invite expired</h1>
              <p className="text-text-secondary text-sm mt-1">
                This invitation link has expired. Please ask the workspace admin to send a new invite.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Link to={ROUTES.DASHBOARD}>
              <Button variant="secondary" fullWidth>
                Go to dashboard
              </Button>
            </Link>
          </div>
        </motion.div>
      );
    }

    if (isRevoked) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-danger/10 border-2 border-danger flex items-center justify-center">
              <XCircle className="w-6 h-6 text-danger" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Invite revoked</h1>
              <p className="text-text-secondary text-sm mt-1">
                This invitation was revoked by an admin. Contact the workspace owner if you still need access.
              </p>
            </div>
          </div>
          <Link to={ROUTES.DASHBOARD}>
            <Button variant="secondary" fullWidth>
              Go to dashboard
            </Button>
          </Link>
        </motion.div>
      );
    }

    if (isAlreadyAccepted) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-success/10 border-2 border-success flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Already accepted</h1>
              <p className="text-text-secondary text-sm mt-1">
                You've already accepted this invitation. Head to the workspace to get started.
              </p>
            </div>
          </div>
          <Link to={ROUTES.DASHBOARD}>
            <Button fullWidth>
              Go to workspace
            </Button>
          </Link>
        </motion.div>
      );
    }

    // Generic error fallback
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-danger/10 border-2 border-danger flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-danger" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Invite invalid</h1>
            <p className="text-text-secondary text-sm mt-1">
              {validation?.message || 'This invite link is expired, revoked, or already used.'}
            </p>
          </div>
        </div>

        <Link to={ROUTES.DASHBOARD}>
          <Button variant="secondary" fullWidth>
            Go to dashboard
          </Button>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background-main">
      <RateLimitBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Left — Image panel */}
        <div className="hidden lg:block lg:w-1/2 relative">
          <img
            src={AUTH_IMAGES.invite}
            alt="Team collaboration"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

          <div className="absolute inset-0 flex flex-col justify-between p-10">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Logo size="md" className="[&_span]:text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-3"
            >
              <h2 className="text-3xl font-bold text-white leading-tight">
                You&#39;re invited!
              </h2>
              <p className="text-sm text-white/70 max-w-xs">
                Join your team and start collaborating on shared links.
              </p>
              <p className="text-xs text-white/40 pt-4">
                &copy; {new Date().getFullYear()} Golinks
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right — Invite content */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12">
            <div className="w-full max-w-sm">
            {/* Logo (mobile) */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-10 lg:hidden"
            >
              <Logo size="xl" />
            </motion.div>

            {/* Loading state */}
            {validating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center text-center"
              >
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <h1 className="text-2xl font-bold text-text-primary">Validating invite...</h1>
                <p className="mt-2 text-text-secondary text-sm">Please wait while we verify your invitation.</p>
              </motion.div>
            )}

            {/* Error states — differentiated */}
            {!validating && (isExpired || isRevoked || isAlreadyAccepted || isGenericError) && renderErrorContent()}

            {/* Valid invite */}
            {isValid && !validating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="w-full max-w-sm"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-primary/10 border-2 border-primary flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-text-primary">Join workspace</h1>
                  </div>
                </div>

                {/* Invite details card */}
                <div className="bg-dark-card border-2 border-border-strong p-5 mb-6 space-y-3">
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Workspace</p>
                    <p className="text-lg font-bold text-text-primary mt-0.5">{validation.workspaceName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Invited as</p>
                    <p className="text-sm font-medium text-text-secondary mt-0.5 capitalize">{validation.role?.toLowerCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Invited by</p>
                    <p className="text-sm font-medium text-text-secondary mt-0.5">{validation.invitedByName || 'A team member'}</p>
                  </div>
                </div>

                {!user ? (
                  <div className="space-y-3">
                    <p className="text-sm text-text-secondary">
                      You need to sign in or create an account to accept this invite.
                    </p>
                    <Button fullWidth onClick={handleAccept}>
                      Sign in to accept
                    </Button>
                    <Link
                      to={`${ROUTES.SIGNUP}?redirect=${encodeURIComponent(`${ROUTES.INVITE}?token=${token}`)}`}
                      className="block"
                    >
                      <Button variant="secondary" fullWidth>
                        Create account and join workspace
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      fullWidth
                      loading={accepting}
                      onClick={handleAccept}
                    >
                      <Check className="w-4 h-4" />
                      Accept invite
                    </Button>
                    <Link to={ROUTES.DASHBOARD}>
                      <Button variant="ghost" fullWidth>
                        Decline
                      </Button>
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
