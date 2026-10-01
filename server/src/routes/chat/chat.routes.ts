import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/chat
 * Stream a chat message (plus recent history) from the CrewAI chat service
 * back to the client as plain-text chunks.
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const upstream = await fetch(`${CHAT_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        message: req.body?.message,
        history: Array.isArray(req.body?.history) ? req.body.history : [],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      console.error('❌ Chat service error:', upstream.status, detail);
      res.status(502).json({ error: 'Chat service unavailable' });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (error) {
    console.error('❌ Chat proxy error:', error);
    if (res.headersSent) {
      res.end();
    } else {
      res.status(502).json({ error: 'Chat service unavailable' });
    }
  }
});

export default router;
