import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { GithubIcon } from '../components/GithubIcon';
import {
  LogOut,
  User as UserIcon,
  Cpu,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

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
          <Link to="/profile" className="btn-logout" style={{ textDecoration: 'none', marginRight: '8px' }}>
            <UserIcon size={16} />
            <span>Profile</span>
          </Link>
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
      <main className="dashboard-main" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="dashboard-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-github-oauth"
            id="connect-github-btn"
          >
            <GithubIcon size={20} />
            <span>Connect to GitHub</span>
          </button>
        </div>
      </main>
    </div>
  );
};

