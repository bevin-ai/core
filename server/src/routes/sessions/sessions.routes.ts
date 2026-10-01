import { Router, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

/**
 * GET /api/sessions
 * List the current user's sessions, most recently updated first
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
    res.status(200).json({ sessions });
  } catch (error) {
    console.error('❌ Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * POST /api/sessions
 * Create a new session for the current user
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const title = typeof req.body?.title === 'string' && req.body.title.trim()
      ? req.body.title.trim().slice(0, 120)
      : 'New session';

    const session = await prisma.session.create({
      data: { title, userId: req.user!.userId },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json({ session });
  } catch (error) {
    console.error('❌ Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete one of the current user's sessions
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Scope by userId so users can only delete their own sessions
    const { count } = await prisma.session.deleteMany({
      where: { id: String(req.params.id), userId: req.user!.userId },
    });

    if (count === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
