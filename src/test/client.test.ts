import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, buildUrl, request } from '@/api/client';

describe('api client', () => {
  afterEach(() => vi.restoreAllMocks());

  it('builds versioned URLs and drops empty query values', () => {
    const u = buildUrl('/students', { q: 'ali', programme: undefined, page: 0, status: '' });
    expect(u).toMatch(/\/api\/v1\/students\?q=ali&page=0$/);
  });

  it('maps RFC 9457 problem details to ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ status: 400, detail: 'One or more fields are invalid', code: 'validation', errors: { meetingDate: 'Meeting date cannot be in the future' } }),
      { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
    ));
    await expect(request('/meetings', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 400, code: 'validation', errors: { meetingDate: 'Meeting date cannot be in the future' },
    } satisfies Partial<ApiError>);
  });
});
