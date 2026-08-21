import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { GithubIcon } from '../components/GithubIcon';
import { AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const Signup: React.FC = () => {
  const { loginWithGithub, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error');

  const errorMessage = useMemo(() => {
    if (!errorParam) return null;
    return decodeURIComponent(errorParam);
  }, [errorParam]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-badge">
            <Sparkles className="brand-icon" size={20} />
            <span>Autonomous Agent</span>
          </div>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">
            Get started instantly by connecting your verified GitHub account.
          </p>
        </div>

        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle className="error-icon" size={18} />
            <div className="error-text">
              <strong>Registration Notice</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <div className="auth-actions">
          <button
            type="button"
            className="btn-github-oauth"
            onClick={loginWithGithub}
            disabled={isLoading}
            id="signup-github-btn"
          >
            <GithubIcon size={22} />
            <span>Continue with GitHub</span>
            <ArrowRight className="btn-arrow" size={18} />
          </button>
        </div>

        <div className="auth-security-note">
          <ShieldCheck size={16} />
          <span>Single-click onboarding &bull; Fast and secure</span>
        </div>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link" id="login-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
