import express, { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { postIssueComment } from '../../utils/github';

const router = Router();

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:8000';
const MENTION = /@bevin\b/i;

function verifyGithubSignature(payload: Buffer, signature: string | undefined): boolean {
  if (!GITHUB_WEBHOOK_SECRET || !signature) return false;

  const digest =
    'sha256=' +
    crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET).update(payload).digest('hex');

  // timingSafeEqual requires equal-length buffers
  const sigBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);
  if (sigBuffer.length !== digestBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, digestBuffer);
}

interface Mention {
  repo: string;
  issueNumber: number;
  author: string;
  commentUrl: string;
  text: string;
}

function extractMention(event: string, payload: any): Mention | null {
  let text: string | undefined;
  let commentUrl: string | undefined;
  let issueNumber: number | undefined;

  if (event === 'pull_request_review' && payload.action === 'submitted') {
    text = payload.review?.body;
    commentUrl = payload.review?.html_url;
    issueNumber = payload.pull_request?.number;
  } else if (event === 'pull_request_review_comment' && payload.action === 'created') {
    text = payload.comment?.body;
    commentUrl = payload.comment?.html_url;
    issueNumber = payload.pull_request?.number;
  } else if (event === 'issue_comment' && payload.action === 'created') {
    text = payload.comment?.body;
    commentUrl = payload.comment?.html_url;
    issueNumber = payload.issue?.number;
  } else {
    return null;
  }

  const repo = payload.repository?.full_name;
  const author = payload.sender?.login;
  if (!text || !repo || !issueNumber || !author || !commentUrl) return null;
  if (!MENTION.test(text)) return null;

  return { repo, issueNumber, author, commentUrl, text };
}

async function askAgent(mention: Mention): Promise<string> {
  const message = [
    'You were mentioned as @bevin in a GitHub comment.',
    `Repository: ${mention.repo}`,
    `Comment: ${mention.commentUrl}`,
    `Author: ${mention.author}`,
    '',
    'Their message:',
    mention.text,
    '',
    'Reply as a helpful assistant. Keep it short; Markdown allowed.',
  ].join('\n');

  const upstream = await fetch(`${CHAT_SERVICE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({ message, history: [], first: true }),
  });
  if (!upstream.ok) throw new Error(`chat-service returned ${upstream.status}`);

  const data = (await upstream.json()) as { reply?: string };
  const reply = data.reply?.trim();
  if (!reply) throw new Error('chat-service returned no reply');
  return reply;
}

router.post(
  '/webhook/github',
  express.raw({ type: 'application/json' }),
  (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const event = req.headers['x-github-event'] as string;

      // if (!Buffer.isBuffer(req.body) || !verifyGithubSignature(req.body, signature)) {
      //  res.status(401).json({ error: 'Invalid signature' });
      //  return;
      // }

      const payload = JSON.parse(req.body.toString());

      // bots (including our own comments) must never re-trigger the agent
      if (payload.sender?.type === 'Bot') {
        res.status(200).json({ received: true });
        return;
      }

      const mention = extractMention(event, payload);

      // respond before the agent runs: GitHub times out after 10s, the LLM takes longer
      res.status(200).json({ received: true });

      if (mention) {
        askAgent(mention)
          .then((reply) => postIssueComment(mention.repo, mention.issueNumber, reply))
          .catch((err) =>
            console.error(`@bevin reply failed (${mention.commentUrl}):`, err),
          );
      }
    } catch (err) {
      console.error('GitHub webhook error:', err);
      if (!res.headersSent) res.status(400).json({ error: 'Webhook processing failed' });
    }
  }
);

export default router;
