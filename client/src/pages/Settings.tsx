import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Lock,
  Plus,
  RefreshCw,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/useAuth';

interface Repo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  ownerAvatar: string;
  visibility: 'public' | 'private';
  url: string;
  installed: boolean;
  installUrl: string;
}

type Filter = 'all' | 'installed' | 'not-installed';

export const Settings: React.FC = () => {
  const { user, loginWithGithub } = useAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/github/repositories`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setNeedsReauth(!!data.reauth);
        setError(data.error || 'Failed to load repositories');
        return;
      }
      setNeedsReauth(false);
      setRepos(data.repositories);
    } catch {
      setError('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // user comes back from the GitHub install page → refresh statuses
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const total = repos.length;
  const installedCount = repos.filter((r) => r.installed).length;
  const privateCount = repos.filter((r) => r.visibility === 'private').length;
  const pct = total ? Math.round((installedCount / total) * 100) : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return repos.filter((r) => {
      if (filter === 'installed' && !r.installed) return false;
      if (filter === 'not-installed' && r.installed) return false;
      return !q || r.fullName.toLowerCase().includes(q);
    });
  }, [repos, query, filter]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: total },
    { key: 'installed', label: 'Installed', count: installedCount },
    { key: 'not-installed', label: 'Not installed', count: total - installedCount },
  ];

  const showSkeleton = loading && repos.length === 0 && !error;

  return (
    <div className="st-shell">
      {/* ───────── Left rail ───────── */}
      <aside className="st-rail">
        <div className="st-brand">
          <span className="st-brand-mark">B</span>
          <span>bevin</span>
        </div>

        <nav className="st-nav" aria-label="Settings">
          <Link to="/dashboard" className="st-nav-item">
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link to="/profile" className="st-nav-item">
            <UserIcon size={16} /> Profile
          </Link>
          <div className="st-nav-label">Settings</div>
          <span className="st-nav-item active" aria-current="page">
            <Cpu size={16} /> Repositories
          </span>
        </nav>

        <div className="st-rail-user">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" />
          ) : (
            <span>{(user?.displayName || user?.username || 'B').charAt(0).toUpperCase()}</span>
          )}
          <div>
            <strong>{user?.displayName || user?.username || 'Bevin user'}</strong>
            <small>{user?.username ? `@${user.username}` : 'Workspace member'}</small>
          </div>
        </div>
      </aside>

      {/* ───────── Main ───────── */}
      <main className="st-main">
        <div className="st-wrap">
          <Link to="/dashboard" className="st-back">
            <ArrowLeft size={14} /> Back to dashboard
          </Link>

          <header className="st-head">
            <div>
              <span className="st-eyebrow">Settings</span>
              <h1>Repositories</h1>
              <p>Install the Bevin app on the repositories you want it to work with.</p>
            </div>
            <button type="button" className="st-btn" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'st-spin' : ''} />
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
          </header>

          {error && (
            <div className="st-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
              {needsReauth && (
                <button type="button" className="st-btn" onClick={loginWithGithub}>
                  Sign in again
                </button>
              )}
            </div>
          )}

          {/* Summary */}
          {!error && (
            <section className="st-summary" aria-label="Installation summary">
              <div className="st-summary-main">
                <div className="st-fraction">
                  <strong>{installedCount}</strong>
                  <span>/ {total}</span>
                </div>
                <p>repositories with Bevin installed</p>
                <div
                  className="st-progress"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="st-stats">
                <div>
                  <strong>{installedCount}</strong>
                  <span>Installed</span>
                </div>
                <div>
                  <strong>{total - installedCount}</strong>
                  <span>Not installed</span>
                </div>
                <div>
                  <strong>{privateCount}</strong>
                  <span>Private</span>
                </div>
              </div>
            </section>
          )}

          {/* Toolbar */}
          {!error && (
            <div className="st-toolbar">
              <label className="st-search">
                <Search size={14} />
                <input
                  type="search"
                  placeholder="Search repositories"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="st-seg" role="tablist" aria-label="Filter repositories">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.key}
                    className={filter === f.key ? 'is-active' : ''}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label} <em>{f.count}</em>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grid */}
          {showSkeleton ? (
            <div className="st-grid" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="st-card st-skeleton">
                  <div className="sk-row">
                    <i className="sk-circle" />
                    <div className="sk-lines">
                      <i />
                      <i />
                    </div>
                  </div>
                  <i className="sk-pill" />
                  <i className="sk-btn" />
                </div>
              ))}
            </div>
          ) : !error && visible.length === 0 ? (
            <div className="st-empty">
              <Search size={20} />
              <strong>{total === 0 ? 'No repositories found' : 'No matches'}</strong>
              <span>
                {total === 0
                  ? 'GitHub returned no repositories for your account.'
                  : 'Try a different search or filter.'}
              </span>
            </div>
          ) : (
            <div className="st-grid">
              {visible.map((r, i) => (
                <article
                  key={r.id}
                  className={`st-card ${r.installed ? 'is-installed' : ''}`}
                  style={{ animationDelay: `${Math.min(i, 12) * 28}ms` }}
                >
                  <div className="st-card-top">
                    <img src={r.ownerAvatar} alt="" className="st-avatar" />
                    <div className="st-names">
                      <a href={r.url} target="_blank" rel="noreferrer" title={r.fullName}>
                        {r.name}
                        <ExternalLink size={11} />
                      </a>
                      <small>{r.owner}</small>
                    </div>
                    <span className={`st-badge ${r.installed ? 'ok' : 'idle'}`}>
                      {r.installed ? 'Installed' : 'Not installed'}
                    </span>
                  </div>

                  <div className="st-card-meta">
                    <span className="st-pill">
                      {r.visibility === 'private' ? <Lock size={11} /> : <Globe size={11} />}
                      {r.visibility === 'private' ? 'Private' : 'Public'}
                    </span>
                  </div>

                  {r.installed ? (
                    <button type="button" className="st-add is-done" disabled>
                      <CheckCircle2 size={14} /> Installed
                    </button>
                  ) : (
                    <a className="st-add" href={r.installUrl} target="_blank" rel="noreferrer">
                      <Plus size={14} /> Add
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};