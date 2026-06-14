import { Router, Response, Request } from 'express';
import { createUserClient } from '../lib/supabaseClient';
import { encryptToken } from '../lib/crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { PrivateApiAdapter, BrowserAdapter } from '../services/instagram';

const router = Router();

// POST /instagram/connect - Connect Instagram account (Sim or Live mode)
router.post('/connect', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { mode, username, password } = req.body as {
      mode: 'sim' | 'live' | 'browser';
      username?: string;
      password?: string;
    };

    if (!mode || !['sim', 'live', 'browser'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be "sim", "live", or "browser"' });
    }

    const userClient = createUserClient(authReq.jwt);

    if (mode === 'sim') {
      // Sim mode: create demo connection
      const { data, error } = await userClient
        .from('instagram_connections')
        .upsert(
          {
            user_id: authReq.user.id,
            status: 'connected',
            username: 'demo_user',
            mode: 'sim',
            token_encrypted: null,
            last_sync_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Sim connect error:', error);
        return res.status(500).json({ error: 'Failed to create connection' });
      }

      return res.json({ connection: data });
    } else if (mode === 'live') {
      // Live mode: real Instagram login via PrivateApiAdapter
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required for live mode' });
      }
      try {
        const adapter = new PrivateApiAdapter();
        const session = await adapter.connect(username, password);
        const encrypted = encryptToken(JSON.stringify(session));

        const { data, error } = await userClient
          .from('instagram_connections')
          .upsert(
            {
              user_id: authReq.user.id,
              status: 'connected',
              username,
              mode: 'live',
              token_encrypted: encrypted,
              last_sync_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
          .select()
          .single();

        if (error) {
          console.error('Live connect DB error:', error);
          return res.status(500).json({ error: 'Failed to save Instagram connection' });
        }

        return res.json({ connection: data });
      } catch (adapterErr: any) {
        return res.status(400).json({ error: adapterErr.message || 'Instagram login failed' });
      }
    } else if (mode === 'browser') {
      // Browser mode: Facebook OIDC login via Playwright — saves session cookies
      if (!username || !password) {
        return res.status(400).json({ error: 'Facebook email and password required for browser mode' });
      }
      try {
        const adapter = new BrowserAdapter();
        await adapter.connect(username, password);
        const cookies = await adapter.saveCookies();
        await adapter.disconnect(); // close browser after capturing cookies
        const encrypted = encryptToken(cookies);

        const { data, error } = await userClient
          .from('instagram_connections')
          .upsert(
            {
              user_id: authReq.user.id,
              status: 'connected',
              username,
              mode: 'browser',
              token_encrypted: encrypted,
              last_sync_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
          .select()
          .single();

        if (error) {
          console.error('Browser connect DB error:', error);
          return res.status(500).json({ error: 'Failed to save browser connection' });
        }

        return res.json({ connection: data });
      } catch (adapterErr: any) {
        return res.status(400).json({ error: adapterErr.message || 'Browser login failed' });
      }
    }
  } catch (err) {
    console.error('Connect error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /instagram/connect - Get current connection status
router.get('/connect', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userClient = createUserClient(authReq.jwt);

    const { data, error } = await userClient
      .from('instagram_connections')
      .select('*')
      .eq('user_id', authReq.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'No connection found' });
      }
      console.error('Get connection error:', error);
      return res.status(500).json({ error: 'Failed to get connection' });
    }

    res.json({ connection: data });
  } catch (err) {
    console.error('Get connection error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /instagram/connect - Disconnect Instagram account
router.delete('/connect', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userClient = createUserClient(authReq.jwt);

    const { error } = await userClient
      .from('instagram_connections')
      .update({
        status: 'disconnected',
        username: null,
        token_encrypted: null,
        last_sync_at: null,
      })
      .eq('user_id', authReq.user.id);

    if (error) {
      console.error('Disconnect error:', error);
      return res.status(500).json({ error: 'Failed to disconnect' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Disconnect error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
