import { createRateLimiter, getClientKey } from '@/app/api/_shared/rate-limit';

describe('createRateLimiter', () => {
  it('윈도우 안에서 limit을 넘으면 막고, 윈도우가 지나면 다시 허용한다', () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });

    expect(check('a', 0).allowed).toBe(true);
    expect(check('a', 100).allowed).toBe(true);
    const blocked = check('a', 200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);

    expect(check('b', 200).allowed).toBe(true);
    expect(check('a', 1000).allowed).toBe(true);
  });
});

describe('getClientKey', () => {
  it('x-forwarded-for의 첫 번째 IP를 쓴다', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
    });
    expect(getClientKey(request)).toBe('1.1.1.1');
  });
});
