import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ChatBot } from '../components/ChatBot';
import {
  LogOut,
  User as UserIcon,
  Cpu,
  Plus,
  Clock3,
  ShieldCheck,
  GitPullRequest,
  BookOpen,
  SlidersHorizontal,
  Search,
  PanelLeft,
  HelpCircle,
  Settings,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="workspace-switcher">
          <div className="workspace-avatar">B</div>
          <span>bevin</span>
          <span className="workspace-chevron">⌄</span>
        </div>

        <button className="new-session-button" type="button">
          <Plus size={16} />
          <span>New session</span>
        </button>

        <nav className="dashboard-nav" aria-label="Workspace">
          <a href="#automations"><Clock3 size={16} /> Automations</a>
          <a href="#security"><ShieldCheck size={16} /> Security</a>
          <a href="#review"><GitPullRequest size={16} /> Review</a>
          <a href="#wiki"><BookOpen size={16} /> Wiki</a>
          <a href="#customize"><SlidersHorizontal size={16} /> Customize</a>
        </nav>

        <div className="sessions-heading">
          <span>Sessions</span>
          <div>
            <button type="button" aria-label="Add session"><Plus size={15} /></button>
            <button type="button" aria-label="Session options"><SlidersHorizontal size={15} /></button>
          </div>
        </div>
        <div className="empty-sessions">
          <Clock3 size={14} />
          <span>Recent</span>
          <small>No sessions</small>
        </div>

        <div className="sidebar-footer">
          <div className="user-summary">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{(user?.displayName || user?.username || 'B').charAt(0).toUpperCase()}</span>}
            <div>
              <strong>{user?.displayName || user?.username || 'Bevin user'}</strong>
              <small>{user?.username ? `@${user.username}` : 'Workspace member'}</small>
            </div>
          </div>
          <div className="sidebar-footer-actions">
            <button type="button" aria-label="Help"><HelpCircle size={15} /></button>
            <button type="button" aria-label="Settings"><Settings size={15} /></button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-topbar">
          <div className="topbar-actions">
            <button type="button" aria-label="Search"><Search size={17} /></button>
            <button type="button" aria-label="Toggle sidebar"><PanelLeft size={17} /></button>
          </div>
          <div className="topbar-account">
            <Link to="/profile"><UserIcon size={15} /> Profile</Link>
            <button onClick={handleLogout} disabled={isLoggingOut} type="button">
              <LogOut size={15} />
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>

        <section className="dashboard-composer-area">
          <div className="bevin-wordmark"><Cpu size={22} fill="currentColor" /> <span>Bevin</span></div>
          <div className="composer-mode-toggle">
            <span className="active">Agent</span>
            <span>Ask</span>
          </div>
          <ChatBot title="Bevin" compact />
          <div className="connect-codebase">
            <span><GitPullRequest size={15} /> Connect your codebase to try Bevin for free</span>
            <a href="https://github.com/apps/bevin-ai-webhook-wala/installations/new" target="_blank" rel="noreferrer">Connect</a>
          </div>
          <div className="getting-started">
            <div className="getting-started-header">
              <strong>Get started</strong>
              <span>1 of 6 <i></i><button type="button" aria-label="Dismiss getting started">×</button></span>
            </div>
            <div className="getting-started-list">
              <div className="getting-started-item"><span className="checked">✓</span><a href="https://github.com/apps/bevin-ai-webhook-wala/installations/new" target="_blank" rel="noreferrer">Connect to Git</a></div>
              <div className="getting-started-item"><span></span><span>Select repositories</span></div>
              <div className="getting-started-item"><span></span><span>Make your first session</span></div>
              <div className="getting-started-item"><span></span><span>Validate in Bevin Review</span></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
