import express, { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  postReview,
  getPullRequest,
  getPullRequestDiff,
  reactToComment,
} from '../../utils/github';
import type { CodeReview } from '../../utils/models';

const router = Router();

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;
const MENTION = /@bevin-ai\b/i;

function verifyGithubSignature(
    payload: Buffer,
    signature: string | undefined,
): boolean {
  if (!GITHUB_WEBHOOK_SECRET || !signature) return false;

  const digest =
      'sha256=' +
      crypto
          .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

  const sigBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  if (sigBuffer.length !== digestBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, digestBuffer);
}

interface Mention {
  repo: string;
  prNumber: number;
  author: string;
  commentUrl: string;
  commentId: number;
  text: string;
}

function extractPrMention(event: string, payload: any): Mention | null {
  if (event !== 'issue_comment' || payload.action !== 'created') {
    return null;
  }

  if (!payload.issue?.pull_request) return null;

  const text = payload.comment?.body;
  const commentUrl = payload.comment?.html_url;
  const commentId = payload.comment?.id;
  const prNumber = payload.issue?.number;
  const repo = payload.repository?.full_name;
  const author = payload.sender?.login;

  if (!text || !repo || !prNumber || !author || !commentUrl || !commentId) {
    return null;
  }

  if (!MENTION.test(text)) return null;

  return { repo, prNumber, author, commentUrl, commentId, text };
}

async function askReviewer(
    mention: Mention,
): Promise<{ review: CodeReview; headSha: string }> {
  if (!CHAT_SERVICE_URL) {
    throw new Error('chat-service is not configured (CHAT_SERVICE_URL)');
  }

  const [pr, diff] = await Promise.all([
    getPullRequest(mention.repo, mention.prNumber),
    getPullRequestDiff(mention.repo, mention.prNumber),
  ]);

  const upstream = await fetch(`${CHAT_SERVICE_URL}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      topic: [
        `PR: ${pr.title}`,
        `Description: ${pr.body ?? ''}`,
        `Repository: ${mention.repo}`,
        `PR number: ${mention.prNumber}`,
        `Comment: ${mention.text}`,
      ].join('\n'),
      code: diff,
    }),
  });

  if (!upstream.ok) {
    throw new Error(`chat-service returned ${upstream.status}`);
  }

  const review = (await upstream.json()) as CodeReview;

  if (
      !review ||
      typeof review.summary !== 'string' ||
      !Array.isArray(review.findings)
  ) {
    throw new Error('chat-service returned an invalid CodeReview');
  }

  return {
    review,
    headSha: pr.head.sha,
  };
}

router.post(
    '/webhook/github',
    express.raw({ type: 'application/json' }),
    (req: Request, res: Response) => {
      try {
        const signature = req.headers['x-hub-signature-256'] as
            | string
            | undefined;
        const event = req.headers['x-github-event'] as string | undefined;

        if (
            !Buffer.isBuffer(req.body) ||
            !verifyGithubSignature(req.body, signature)
        ) {
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }

        if (!event) {
          res.status(400).json({ error: 'Missing GitHub event header' });
          return;
        }

        const payload = JSON.parse(req.body.toString());

        // Bots, including Bevin's own comments, must not trigger another review.
        if (payload.sender?.type === 'Bot') {
          res.status(200).json({ received: true });
          return;
        }

        const mention = extractPrMention(event, payload);

        // Acknowledge the webhook before the agent runs.
        res.status(200).json({ received: true });

        if (mention) {
          reactToComment(mention.repo, mention.commentId, 'eyes').catch(
            (err) =>
              console.error(
                `@bevin-ai reaction failed (${mention.commentUrl}):`,
                err,
              ),
          );

          askReviewer(mention)
              .then(({ review, headSha }) =>
                  postReview(
                      mention.repo,
                      mention.prNumber,
                      headSha,
                      review,
                  ),
              )
              .catch((err) =>
                  console.error(
                      `@bevin-ai review failed (${mention.commentUrl}):`,
                      err,
                  ),
              );
        }
      } catch (err) {
        console.error('GitHub webhook error:', err);

        if (!res.headersSent) {
          res.status(400).json({ error: 'Webhook processing failed' });
        }
      }
    },
);

export default router;