import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';

/**
 * GoRedirect — catches /go/:slug in the SPA and performs a full-page
 * navigation to the backend redirect endpoint. This prevents React Router's
 * catch-all from swallowing short URL requests in both dev and production.
 */
export default function GoRedirect() {
  const { slug } = useParams();

  useEffect(() => {
    if (slug) {
      // Build the backend URL - in dev the proxy handles /go/*, in production
      // this needs to point at the backend origin
      const apiBase = process.env.REACT_APP_API_URL || '/api/v1';
      const backendOrigin = apiBase.replace('/api/v1', '');
      const redirectUrl = `${backendOrigin}/go/${slug}${window.location.search}`;

      // Full-page navigation (not SPA) so the backend handles the 302
      window.location.replace(redirectUrl);
    }
  }, [slug]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-dark">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-text-secondary text-sm">Redirecting…</p>
      </div>
    </div>
  );
}
