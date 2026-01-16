// Simple in-memory rate limiter for edge functions
// Uses a Map to track request counts per user

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;      // Maximum requests allowed in the window
  windowMs: number;         // Time window in milliseconds
  identifier: string;       // Unique identifier (usually user ID)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;          // Milliseconds until reset
}

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const key = config.identifier;
  
  const entry = rateLimitStore.get(key);
  
  // No existing entry or window expired - create new window
  if (!entry || (now - entry.windowStart) >= config.windowMs) {
    rateLimitStore.set(key, {
      count: 1,
      windowStart: now
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs
    };
  }
  
  // Within window - check count
  const resetIn = config.windowMs - (now - entry.windowStart);
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn
  };
}

// Clean up old entries periodically (call this occasionally)
export function cleanupRateLimitStore(windowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if ((now - entry.windowStart) >= windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

// Rate limit response helper
export function rateLimitResponse(corsHeaders: Record<string, string>, resetIn: number): Response {
  return new Response(
    JSON.stringify({ 
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil(resetIn / 1000)
    }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(resetIn / 1000))
      } 
    }
  );
}
