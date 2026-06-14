import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
}

// Temporary anon client for JWT validation (doesn't need user's JWT)
const validationClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
  jwt: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const jwt = authHeader.substring(7); // Remove 'Bearer '

  try {
    const { data: { user }, error } = await validationClient.auth.getUser(jwt);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
    };
    (req as AuthenticatedRequest).jwt = jwt;
    next();
  } catch {
    res.status(401).json({ error: 'Token validation failed' });
  }
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const jwt = authHeader.substring(7);

  try {
    const { data: { user } } = await validationClient.auth.getUser(jwt);
    if (user) {
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
      };
      (req as AuthenticatedRequest).jwt = jwt;
    }
  } catch {
    // Ignore - optional auth
  }
  next();
}
