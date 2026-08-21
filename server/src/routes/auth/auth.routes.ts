import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';

const router = Router();

// Helper to retrieve fresh environment configuration
function getAuthConfig() {
  return {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/auth/github/callback',
    jwtSecret: process.env.JWT_SECRET || '',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

/**
 * GET /auth/github
 * Initiates GitHub OAuth authorization flow
 */
router.get('/github', (req: Request, res: Response): void => {
  const { clientId, callbackUrl, isProduction } = getAuthConfig();

  if (!clientId) {
    console.error('❌ GITHUB_CLIENT_ID is not configured in environment');
    res.status(500).json({ error: 'GitHub OAuth is not configured on this server' });
    return;
  }

  // Generate cryptographically secure state token to prevent CSRF attacks
  const state = crypto.randomBytes(24).toString('hex');

  // Store state in an HTTP-only short lived cookie
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'read:user user:email',
    state: state,
    allow_signup: 'true',
  });

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.redirect(githubAuthUrl);
});

/**
 * GET /auth/github/callback
 * Handles OAuth callback from GitHub, exchanges code for token, upserts user, issues JWT cookie
 */
router.get('/github/callback', async (req: Request, res: Response): Promise<void> => {
  const { clientId, clientSecret, callbackUrl, jwtSecret, frontendUrl, isProduction } = getAuthConfig();

  try {
    const { code, state, error, error_description } = req.query;

    // Handle user denial or GitHub error
    if (error) {
      console.warn('⚠️ GitHub OAuth returned error:', error, error_description);
      const safeErrorMsg = encodeURIComponent(
        typeof error_description === 'string'
          ? error_description
          : 'GitHub authentication was cancelled or failed'
      );
      res.redirect(`${frontendUrl}/login?error=${safeErrorMsg}`);
      return;
    }

    const savedState = req.cookies?.oauth_state;
    // Clear the OAuth state cookie
    res.clearCookie('oauth_state', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });

    // Validate state token for CSRF defense
    if (!state || !savedState || state !== savedState) {
      console.warn('⚠️ OAuth state mismatch or expired state token');
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Authentication session expired or invalid. Please try again.')}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('No authorization code received from GitHub')}`);
      return;
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('❌ Failed to exchange code for GitHub access token:', tokenData);
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Failed to exchange code with GitHub')}`);
      return;
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Autonomous-Coding-Agent-App',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      console.error('❌ Failed to fetch GitHub user profile:', await userResponse.text());
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Could not retrieve GitHub profile')}`);
      return;
    }

    const githubProfile = (await userResponse.json()) as {
      id: number;
      login: string;
      name?: string | null;
      email?: string | null;
      avatar_url?: string;
      html_url?: string;
    };

    let userEmail: string | undefined = githubProfile.email || undefined;

    // If email is not public on GitHub profile, attempt fetching emails via /user/emails
    if (!userEmail) {
      try {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'Autonomous-Coding-Agent-App',
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (emailsResponse.ok) {
          const emails = (await emailsResponse.json()) as Array<{
            email: string;
            primary: boolean;
            verified: boolean;
          }>;
          const primaryEmail = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
          if (primaryEmail) {
            userEmail = primaryEmail.email;
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch secondary GitHub emails:', err);
      }
    }

    const githubIdStr = String(githubProfile.id);

    // Upsert user in MongoDB Atlas
    let user = await User.findOne({ githubId: githubIdStr });

    if (user) {
      // Update existing user details
      user.username = githubProfile.login;
      if (githubProfile.name) user.displayName = githubProfile.name;
      if (userEmail) user.email = userEmail;
      if (githubProfile.avatar_url) user.avatarUrl = githubProfile.avatar_url;
      if (githubProfile.html_url) user.githubProfileUrl = githubProfile.html_url;
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        githubId: githubIdStr,
        username: githubProfile.login,
        displayName: githubProfile.name || githubProfile.login,
        email: userEmail,
        avatarUrl: githubProfile.avatar_url,
        githubProfileUrl: githubProfile.html_url,
      });
    }

    if (!jwtSecret) {
      console.error('❌ JWT_SECRET is not set in environment');
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Server authentication configuration error')}`);
      return;
    }

    // Create signed JWT session
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        githubId: user.githubId,
        username: user.username,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Set secure HTTP-only authentication cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Redirect to frontend dashboard
    res.redirect(`${frontendUrl}/dashboard`);
  } catch (error) {
    console.error('❌ GitHub OAuth callback error:', error);
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
  }
});

/**
 * GET /auth/me
 * Retrieves current authenticated user profile
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { isProduction } = getAuthConfig();

  try {
    if (!req.user?.userId) {
      res.status(401).json({ authenticated: false, error: 'Unauthorized' });
      return;
    }

    const user = await User.findById(req.user.userId).select('-__v');

    if (!user) {
      // User may have been removed from DB
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
      });
      res.status(401).json({ authenticated: false, error: 'User account no longer exists' });
      return;
    }

    res.status(200).json({
      authenticated: true,
      user: {
        id: user._id,
        githubId: user.githubId,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        githubProfileUrl: user.githubProfileUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('❌ Error in /auth/me:', error);
    res.status(500).json({ authenticated: false, error: 'Failed to fetch user profile' });
  }
});

/**
 * POST /auth/logout
 * Clears authentication session cookie
 */
router.post('/logout', (req: Request, res: Response): void => {
  const { isProduction } = getAuthConfig();

  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
