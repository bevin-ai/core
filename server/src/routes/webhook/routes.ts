import express, { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET as string;

function verifyGithubSignature(payload: Buffer, signature: string | undefined): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  // timingSafeEqual requires equal-length buffers
  const sigBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  if (sigBuffer.length !== digestBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, digestBuffer);
}

router.post(
  '/webhook/github',
  express.raw({ type: 'application/json' }),
  (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const event = req.headers['x-github-event'] as string;

      const isValid = verifyGithubSignature(req.body, signature);

      const payload = JSON.parse(req.body.toString());

      switch (event) {
        case 'push':
          console.log('Push event:', payload.ref);
          // handle push
          break;
        case 'pull_request':
          console.log('PR event:', payload.action);
          // handle PR
          break;
        case 'issues':
          console.log('Issue event:', payload.action);
          // handle issue
          break;
        default:
          console.log('Unhandled GitHub event:', event);
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error('GitHub webhook error:', err);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  }
);

export default router;
