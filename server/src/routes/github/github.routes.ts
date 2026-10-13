import { Router, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { decrypt } from '../../utils/crypto';
import { listInstalledRepoIds, listUserRepos } from '../../utils/github';

const router = Router();
router.use(authenticate);

/**
 * GET /api/github/repositories
 * Every repo the signed-in user can access, flagged with whether our App is installed.
 */
router.get('/repositories', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.githubAccessToken) {
      res.status(401).json({ error: 'GitHub access missing. Please sign in again.', reauth: true });
      return;
    }

    let repos;
    try {
      repos = await listUserRepos(decrypt(user.githubAccessToken));
    } catch (err) {
      // token revoked or expired on GitHub's side
      if (String(err).includes(' 401 ')) {
        res.status(401).json({ error: 'GitHub access expired. Please sign in again.', reauth: true });
        return;
      }
      throw err;
    }

    const installed = await listInstalledRepoIds();
    const slug = process.env.GITHUB_APP_SLUG || '';

    res.status(200).json({
      repositories: repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner.login,
        ownerAvatar: r.owner.avatar_url,
        visibility: r.private ? 'private' : 'public',
        url: r.html_url,
        installed: installed.has(r.id),
        installUrl:
          `https://github.com/apps/${slug}/installations/new/permissions` +
          `?suggested_target_id=${r.owner.id}&repository_ids[]=${r.id}`,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching repositories:', error);
    res.status(502).json({ error: 'Failed to fetch repositories from GitHub' });
  }
});

export default router;