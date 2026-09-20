const IPTV_BASE = 'https://api.omegatech.app/api/movie/Iptv';
let channelCache = { expires: 0, channels: [] };

async function provider(action) {
  const response = await fetch(`${IPTV_BASE}?action=${action}`, { headers: { 'User-Agent': 'Mozilla/5.0 MovieLab/1.0', Accept: 'application/json' } });
  if (!response.ok) throw new Error(`IPTV ${action}: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : (data.data || data.results || []);
}

async function getChannels() {
  if (channelCache.expires > Date.now() && channelCache.channels.length) return channelCache.channels;
  const [rawChannels, rawStreams] = await Promise.all([provider('channels'), provider('streams')]);
  const byId = new Map();
  const byTitle = new Map();
  for (const stream of rawStreams) {
    const key = String(stream.channel || '');
    if (key) (byId.get(key) || byId.set(key, []).get(key)).push(stream);
    const title = String(stream.title || '').trim().toLowerCase();
    if (title) (byTitle.get(title) || byTitle.set(title, []).get(title)).push(stream);
  }
  const channels = rawChannels.map((channel) => {
    if (!channel?.name) return null;
    const streams = byId.get(String(channel.id)) || byTitle.get(channel.name.trim().toLowerCase()) || [];
    const best = streams.find((s) => s.quality === '1080p') || streams.find((s) => s.quality === '720p') || streams[0];
    const url = channel.url || channel.stream_url || best?.url || '';
    if (!url) return null;
    const logo = channel.logo || channel.posterUrl || '';
    const category = channel.categories?.[0] || 'general';
    return { id: channel.id || channel.name, name: channel.name, country: channel.country || 'GLOBAL', category, categories: channel.categories || [category], url, stream_url: url, logo, thumbnail: logo, streams, hd: streams.some((s) => String(s.quality || '').includes('1080p')) ? 1 : 0, description: channel.description || `${channel.name} Live Stream`, website: channel.website || '' };
  }).filter(Boolean);
  channelCache = { expires: Date.now() + 5 * 60 * 1000, channels };
  return channels;
}

function filterChannels(channels, query) {
  const q = String(query || '').trim().toLowerCase();
  return q ? channels.filter((c) => `${c.name} ${c.category} ${c.country}`.toLowerCase().includes(q)) : channels;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ data: [] });
  const path = String(req.query.path || '').split('/').filter(Boolean).pop() || 'channels';
  try {
    if (path === 'img') {
      const imageUrl = String(req.query.url || '');
      if (!/^https?:\/\//i.test(imageUrl)) return res.status(400).end();
      const image = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 MovieLab/1.0' } });
      if (!image.ok) return res.status(404).end();
      res.setHeader('Content-Type', image.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).end(Buffer.from(await image.arrayBuffer()));
    }
    const channels = await getChannels();
    if (path === 'channels') {
      const filtered = filterChannels(channels, req.query.q);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
      return res.status(200).json({ data: filtered.slice(offset, offset + limit), total: filtered.length, offset, limit, meta: { source: 'Movie Lab IPTV' } });
    }
    if (path === 'categories') return res.status(200).json({ data: [...new Set(channels.flatMap((c) => c.categories || [c.category]))].sort() });
    if (path === 'countries') return res.status(200).json({ data: [...new Set(channels.map((c) => c.country).filter(Boolean))].sort() });
    if (path === 'onnow') return res.status(200).json({ data: channels.slice(0, 50).map((c) => ({ id: c.id, channel_name: c.name, title: `${c.name} Live`, logo: c.logo, thumbnail: c.thumbnail, stream_url: c.url, url: c.url })) });
    if (path === 'home') return res.status(200).json({ banners: channels.slice(0, 5).map((c) => ({ id: c.id, title: c.name, description: c.description, thumbnail: c.logo, stream_url: c.url })), onnow: channels.slice(0, 10).map((c) => ({ id: c.id, channel_name: c.name, title: `${c.name} Live`, logo: c.logo, thumbnail: c.logo, stream_url: c.url, url: c.url })), categories: [...new Set(channels.flatMap((c) => c.categories || [c.category]))] });
    return res.status(200).json({ data: [] });
  } catch (error) {
    console.error('[Movie Lab TV]', error);
    return res.status(200).json({ data: [], total: 0, banners: [], onnow: [], categories: [] });
  }
}
