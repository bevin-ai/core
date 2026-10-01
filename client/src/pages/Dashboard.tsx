import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ChatBot } from '../components/ChatBot';
import { API_BASE_URL } from '../config/api';
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
  Trash2,
} from 'lucide-react';

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export const Dashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE_URL}/api/sessions`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions);
      if (data.sessions.length > 0) setActiveSessionId(data.sessions[0].id);
    })();
  }, []);

  const handleNewSession = async () => {
    const res = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    if (!res.ok) return;
    const { session } = await res.json();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
  };

  const handleDeleteSession = async (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActiveSessionId((current) => (current === id ? null : current));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const handleStreamMessage = async (
    message: string,
    history: { role: string; text: string }[],
    onChunk: (chunk: string) => void,
  ): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok || !res.body) throw new Error('Chat request failed');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="workspace-switcher">
          <div className="workspace-avatar">B</div>
          <span>bevin</span>
          <span className="workspace-chevron">⌄</span>
        </div>

        <button className="new-session-button" type="button" onClick={handleNewSession}>
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
            <button type="button" aria-label="Add session" onClick={handleNewSession}><Plus size={15} /></button>
            <button type="button" aria-label="Session options"><SlidersHorizontal size={15} /></button>
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="empty-sessions">
            <small>No sessions</small>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                onClick={() => setActiveSessionId(session.id)}
                onKeyDown={(e) => e.key === 'Enter' && setActiveSessionId(session.id)}
              >
                <span>{session.title}</span>
                <button
                  type="button"
                  className="session-delete"
                  aria-label="Delete session"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

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
          <ChatBot key={activeSessionId ?? 'new'} title="Bevin" compact onStreamMessage={handleStreamMessage} />
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
