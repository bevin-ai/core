import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { GithubIcon } from '../components/GithubIcon';
import { AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
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
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            Sign in to access your secure workspace and managed pipelines.
          </p>
        </div>

        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle className="error-icon" size={18} />
            <div className="error-text">
              <strong>Authentication Notice</strong>
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
            id="login-github-btn"
          >
            <GithubIcon size={22} />
            <span>Continue with GitHub</span>
            <ArrowRight className="btn-arrow" size={18} />
          </button>
        </div>

        <div className="auth-security-note">
          <ShieldCheck size={16} />
          <span>OAuth 2.0 Protected &bull; Passwords never stored</span>
        </div>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link" id="signup-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
