import 'server-only';

interface RateLimitOptions {
  /** 윈도우 안에서 허용할 최대 요청 수 */
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const MAX_TRACKED_CLIENTS = 10_000;

/**
 * 인스턴스 메모리 기반 고정 윈도우 rate limiter.
 * 서버리스에서는 인스턴스마다 카운터가 따로라 상한이 느슨해진다.
 * 1차 방어선이며, 트래픽이 커지면 Upstash Redis 같은 공유 저장소로 옮겨야 한다.
 */
export function createRateLimiter({ limit, windowMs }: RateLimitOptions) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  function evictExpired(now: number) {
    for (const [key, window] of windows) {
      if (window.resetAt <= now) windows.delete(key);
    }
  }

  return function check(clientKey: string, now = Date.now()): RateLimitResult {
    if (windows.size >= MAX_TRACKED_CLIENTS) evictExpired(now);

    const current = windows.get(clientKey);
    if (!current || current.resetAt <= now) {
      windows.set(clientKey, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    current.count += 1;
    return {
      allowed: current.count <= limit,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  };
}

export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown';
}
