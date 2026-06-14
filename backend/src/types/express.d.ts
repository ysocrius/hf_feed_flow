// Type augmentation for Express Request with authenticated user
declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      email?: string;
    };
  }
}

export {};
