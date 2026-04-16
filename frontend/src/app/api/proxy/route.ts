import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000';
// Extract the base origin from INTERNAL_API_URL (e.g. http://1.2.3.4:8000)
const ALLOWED_ORIGIN = new URL(INTERNAL_API_URL).origin;

// Also allow localhost for local dev
const ALLOWED_ORIGINS = new Set([
  ALLOWED_ORIGIN,
  'http://localhost:8000',
  'http://127.0.0.1:8000',
]);

/**
 * Media proxy — forwards requests for HTTP media/stream assets through
 * the HTTPS Next.js edge so browsers don't block them as mixed content.
 *
 * Usage:  GET /api/proxy?url=http%3A%2F%2Fec2-ip%3A8000%2Fmedia%2Fstreams%2F...
 *
 * Security:
 *  - Only proxies URLs whose origin matches the configured backend.
 *  - Only allows GET and HEAD methods.
 *  - Strips cookies / auth headers from the proxied response.
 */
export async function GET(request: NextRequest) {
  return handleProxy(request);
}

export async function HEAD(request: NextRequest) {
  return handleProxy(request, true);
}

async function handleProxy(request: NextRequest, headOnly = false) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return new NextResponse('Invalid url parameter', { status: 400 });
  }

  // Security: only proxy requests to the allowed backend origin
  if (!ALLOWED_ORIGINS.has(targetUrl.origin)) {
    return new NextResponse(
      `Proxy only allowed for configured backend (got: ${targetUrl.origin})`,
      { status: 403 },
    );
  }

  // Forward Range header for video seeking support
  const forwardHeaders: HeadersInit = {};
  const range = request.headers.get('range');
  if (range) forwardHeaders['Range'] = range;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl.toString(), {
      method: headOnly ? 'HEAD' : 'GET',
      headers: forwardHeaders,
      // Next.js server-side fetch is not subject to browser mixed-content rules
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[proxy] fetch error:', err);
    return new NextResponse('Upstream fetch failed', { status: 502 });
  }

  // Build response headers — pass through content-type, content-range, etc.
  const responseHeaders = new Headers();
  const passthroughHeaders = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'cache-control',
  ];
  for (const header of passthroughHeaders) {
    const value = upstream.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }
  // Allow the browser to reuse the response for HLS segments
  responseHeaders.set('Access-Control-Allow-Origin', '*');

  if (headOnly) {
    return new NextResponse(null, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
