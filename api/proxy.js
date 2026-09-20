const PROVIDERS = {
  metadata: {
    base: 'https://h5-api.aoneroom.com/wefeed-h5api-bff',
    headers: { Origin: 'https://moviebox.ph', Referer: 'https://moviebox.ph/' },
  },
  omegatech: { base: 'https://api.omegatech.app' },
  player: {
    base: 'https://123movienow.cc/wefeed-h5api-bff',
    headers: { Origin: 'https://123movienow.cc', Referer: 'https://123movienow.cc/' },
  },
  cineverse: {
    base: 'https://cineverse.name.ng',
    headers: { Origin: 'https://cineverse.name.ng', Referer: 'https://cineverse.name.ng/' },
  },
  stream: {
    base: 'https://movieapi.giftedtech.co.ke',
    headers: { Origin: 'https://movieapi.giftedtech.co.ke', Referer: 'https://movieapi.giftedtech.co.ke/' },
  },
};

function safePath(value) {
  const path = String(value || '').replace(/^\/+/, '');
  if (!path || path.includes('..') || path.includes('://') || path.includes('\\')) return null;
  return path;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    return res.status(204).end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ error: 'Method not allowed' });

  const provider = PROVIDERS[String(req.query.service || '')];
  const path = safePath(req.query.path);
  if (!provider || !path) return res.status(400).json({ error: 'Invalid provider path' });

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'service' && key !== 'path') {
      for (const item of Array.isArray(value) ? value : [value]) query.append(key, String(item));
    }
  }
  const target = `${provider.base}/${path}${query.toString() ? `?${query}` : ''}`;
  const headers = { 'User-Agent': 'Mozilla/5.0 MovieLab/1.0', Accept: '*/*', ...(provider.headers || {}) };
  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(target, { method: req.method, headers });
    res.status(upstream.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    // Do not forward upstream Content-Length: fetch may transparently decompress
    // the response, which would advertise a shorter length and truncate JSON.
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);
    const acceptRanges = upstream.headers.get('accept-ranges');
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
    if (req.method === 'HEAD') return res.end();
    const body = Buffer.from(await upstream.arrayBuffer());
    return res.end(body);
  } catch (error) {
    console.error('[Vercel proxy]', provider.base, path, error);
    return res.status(502).json({ error: 'Upstream provider unavailable' });
  }
};
