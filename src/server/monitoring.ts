import 'server-only';
import * as Sentry from '@sentry/nextjs';

// Sentry 초기화는 src/instrumentation.ts에서 서버 기동 시 한 번 수행한다.
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) {
    console.error('[Error]', error, context);
    return;
  }

  Sentry.captureException(error, { extra: context });
}
