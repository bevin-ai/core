import jwt from 'jsonwebtoken';

const API = 'https://api.github.com';
const APP_ID = process.env.GITHUB_APP_ID;
// .env usually stores the PEM on one line with literal \n sequences
const KEY = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n');

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

const tokenCache = new Map<string, CachedToken>();

function appJwt(): string {
  if (!APP_ID) throw new Error('GITHUB_APP_ID is not set');
  if (!KEY) throw new Error('GITHUB_PRIVATE_KEY is not set');
  const now = Math.floor(Date.now() / 1000);
  // GitHub allows ±6min clock skew; backdate iat and keep exp within 10min
  return jwt.sign({ iat: now - 60, exp: now + 9 * 60, iss: APP_ID }, KEY, {
    algorithm: 'RS256',
  });
}

async function gh<T>(
  url: string,
  method: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`GitHub ${method} ${url} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ponytail: per-repo token cache, never evicted on 401 — re-mint by restarting if a token is revoked
async function installationToken(repoFullName: string): Promise<string> {
  const cached = tokenCache.get(repoFullName);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const { id } = await gh<{ id: number }>(
    `${API}/repos/${repoFullName}/installation`,
    'GET',
    appJwt(),
  );
  const { token, expires_at } = await gh<{ token: string; expires_at: string }>(
    `${API}/app/installations/${id}/access_tokens`,
    'POST',
    appJwt(),
  );
  tokenCache.set(repoFullName, { token, expiresAt: Date.parse(expires_at) });
  return token;
}

export async function postIssueComment(
  repoFullName: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  const token = await installationToken(repoFullName);
  await gh(
    `${API}/repos/${repoFullName}/issues/${issueNumber}/comments`,
    'POST',
    token,
    { body },
  );
}

async function pages<T>(
  url: string,
  token: string,
  pick: (body: any) => T[],
  maxPages = 10,
): Promise<T[]> {
  const out: T[] = [];
  for (let p = 1; p <= maxPages; p++) {
    const sep = url.includes('?') ? '&' : '?';
    const items = pick(await gh<any>(`${url}${sep}per_page=100&page=${p}`, 'GET', token));
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

let installedCache: { ids: Set<number>; expires: number } | null = null;

/** IDs of every repo our GitHub App is installed on (across all installations). */
export async function listInstalledRepoIds(): Promise<Set<number>> {
  if (installedCache && installedCache.expires > Date.now()) return installedCache.ids;

  const installations = await pages<{ id: number }>(
    `${API}/app/installations`,
    appJwt(),
    (b) => b,
  );

  const ids = new Set<number>();
  for (const inst of installations) {
    const { token } = await gh<{ token: string }>(
      `${API}/app/installations/${inst.id}/access_tokens`,
      'POST',
      appJwt(),
    );
    const repos = await pages<{ id: number }>(
      `${API}/installation/repositories`,
      token,
      (b) => b.repositories,
    );
    repos.forEach((r) => ids.add(r.id));
  }

  installedCache = { ids, expires: Date.now() + 60_000 };
  return ids;
}

export interface UserRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  owner: { id: number; login: string; avatar_url: string };
}

/** All repos the user can access: own, collaborator, and organization repos. */
export function listUserRepos(userToken: string): Promise<UserRepo[]> {
  return pages<UserRepo>(
    `${API}/user/repos?affiliation=owner,collaborator,organization_member&sort=updated`,
    userToken,
    (b) => b,
  );
}
