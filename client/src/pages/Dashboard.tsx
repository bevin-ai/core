import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ChatBot } from '../components/ChatBot';
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
      <main className="dashboard-main" style={{ maxWidth: '840px', padding: '24px auto' }}>
        <ChatBot title="Bevin AI Assistant" />
      </main>
    </div>
  );
};


