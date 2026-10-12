import jwt from 'jsonwebtoken';
import { renderMarkdown, renderInlineFinding } from './renderer';
import {CodeReview, Finding} from "./models";

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

export type ReactionContent =
  | 'eyes'
  | '+1'
  | '-1'
  | 'laugh'
  | 'confused'
  | 'heart'
  | 'hooray'
  | 'rocket';

export async function reactToComment(
  repoFullName: string,
  commentId: number,
  content: ReactionContent,
): Promise<void> {
  const token = await installationToken(repoFullName);
  await gh(
    `${API}/repos/${repoFullName}/issues/comments/${commentId}/reactions`,
    'PUT',
    token,
    { content },
  );
}

export interface PullRequestInfo {
  title: string;
  body: string;
  head: {
    sha: string;
  };
}

export async function getPullRequest(
    repoFullName: string,
    pullNumber: number,
): Promise<PullRequestInfo> {
  const token = await installationToken(repoFullName);

  const pr = await gh<PullRequestInfo>(
      `${API}/repos/${repoFullName}/pulls/${pullNumber}`,
      'GET',
      token,
  );

  return {
    title: pr.title,
    body: pr.body,
    head: pr.head,
  };
}

export async function getPullRequestDiff(
  repoFullName: string,
  number: number,
): Promise<string> {
  const token = await installationToken(repoFullName);
  const res = await fetch(`${API}/repos/${repoFullName}/pulls/${number}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3.diff',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`GitHub diff fetch failed: ${res.status} ${await res.text()}`);
  }
  return res.text();
}

export async function postReview(
    repoFullName: string,
    pullNumber: number,
    commitId: string,
    review: CodeReview,
): Promise<void> {
  const token = await installationToken(repoFullName);

  await gh(
      `${API}/repos/${repoFullName}/pulls/${pullNumber}/reviews`,
      'POST',
      token,
      {
        commit_id: commitId,
        body: renderMarkdown(review),
        event: 'COMMENT',
        comments: review.findings.map((finding: Finding) => ({
          path: finding.file,
          line: finding.line,
          side: finding.side,
          body: renderInlineFinding(finding),
        })),
      },
  );
}