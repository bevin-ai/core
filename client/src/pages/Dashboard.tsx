import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { GithubIcon } from '../components/GithubIcon';
import {
  LogOut,
  Mail,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Database,
  CheckCircle2,
  Cpu,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-badge">
            <Cpu size={18} />
            <span>Autonomous Agent Workspace</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="btn-logout"
            id="logout-btn"
          >
            <LogOut size={16} />
            <span>{isLoggingOut ? 'Logging out...' : 'Sign out'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Welcome Banner */}
        <div className="welcome-card">
          <div className="user-profile-header">
            <div className="avatar-wrapper">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username || 'User'}
                  className="user-avatar"
                />
              ) : (
                <div className="avatar-placeholder">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="status-indicator-online" title="Online" />
            </div>

            <div className="user-details">
              <h1 className="user-name">
                {user?.displayName || user?.username || 'Authenticated User'}
              </h1>
              <p className="user-handle">@{user?.username}</p>
              
              <div className="user-tags">
                <span className="badge-pill badge-github">
                  <GithubIcon size={14} />
                  GitHub Verified
                </span>
                <span className="badge-pill badge-active">
                  <CheckCircle2 size={13} />
                  Active Session
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Account Details Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <ShieldCheck size={20} className="card-icon" />
              <h2>Profile Information</h2>
            </div>
            <div className="card-body info-list">
              <div className="info-item">
                <div className="info-label">
                  <GithubIcon size={15} />
                  <span>GitHub ID</span>
                </div>
                <div className="info-value">
                  <code>{user?.githubId}</code>
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">
                  <Mail size={15} />
                  <span>Email</span>
                </div>
                <div className="info-value">
                  {user?.email ? (
                    <span>{user.email}</span>
                  ) : (
                    <span className="text-muted">Not provided by GitHub</span>
                  )}
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">
                  <Calendar size={15} />
                  <span>Member Since</span>
                </div>
                <div className="info-value">{formattedDate}</div>
              </div>

              {user?.githubProfileUrl && (
                <div className="info-item">
                  <div className="info-label">
                    <ExternalLink size={15} />
                    <span>GitHub Profile</span>
                  </div>
                  <div className="info-value">
                    <a
                      href={user.githubProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="external-link"
                    >
                      {user.githubProfileUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* System Security & Connection Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <Database size={20} className="card-icon" />
              <h2>System & Session Details</h2>
            </div>
            <div className="card-body info-list">
              <div className="info-item">
                <div className="info-label">
                  <span>Authentication Provider</span>
                </div>
                <div className="info-value">
                  <span className="badge-tech">GitHub OAuth 2.0</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">
                  <span>Database</span>
                </div>
                <div className="info-value">
                  <span className="badge-tech">MongoDB Atlas</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">
                  <span>Session Storage</span>
                </div>
                <div className="info-value">
                  <span className="badge-tech">HTTP-only Secure Cookie</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">
                  <span>Protected Access</span>
                </div>
                <div className="info-value text-success">
                  &bull; Verified JWT Bearer
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
