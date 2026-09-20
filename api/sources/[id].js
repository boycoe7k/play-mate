const metadataBase = 'https://h5-api.aoneroom.com/wefeed-h5api-bff';
const omegaBase = 'https://api.omegatech.app';
const streamBase = 'https://stream.omegatech.app';

async function readJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 MovieLab/1.0',
      Accept: 'application/json,*/*',
      Origin: 'https://moviebox.ph',
      Referer: 'https://moviebox.ph/',
    },
  });
  if (!response.ok) return null;
  return response.json();
}

function hasSources(data) {
  return Boolean(data && (
    data.qualities?.length || data.sources?.length || data.videos?.length || data.subtitles?.length
  ));
}

function payload(data) {
  return [data, data?.data, data?.data?.raw, data?.result, data?.data?.result]
    .filter(Boolean)
    .find((candidate) => Array.isArray(candidate.qualities) || Array.isArray(candidate.sources) || Array.isArray(candidate.videos) || Array.isArray(candidate.subtitles)) || {};
}

function https(url) {
  return typeof url === 'string' ? url.replace(/^http:\/\//i, 'https://') : url;
}

function sourceUrl(item) {
  return https(item?.streamUrl || item?.videoUrl || item?.url || item?.stream || item?.direct);
}

function normalize(data) {
  const provider = payload(data);
  const qualities = Array.isArray(provider.qualities) ? provider.qualities : (Array.isArray(provider.sources) ? provider.sources : (provider.videos || []));
  const videos = qualities.map((item) => ({
    quality: item.quality || item.resolution || item.label || 'Auto',
    url: sourceUrl(item),
    download: https(item.downloadUrl || item.download || sourceUrl(item)),
    format: item.format || 'MP4',
    size: item.resolution ? `${item.resolution}p` : (item.size || item.quality || 'Auto'),
  })).filter((item) => item.url || item.download);
  if (provider.bestQualityUrl) videos.unshift({ quality: 'Best (Auto)', url: https(provider.bestQualityUrl), download: https(provider.bestQualityUrl), format: 'MP4', size: 'Original' });
  const subtitles = (provider.subtitles || []).map((item, index) => {
    const lang = String(item.languageCode || item.lang || 'en').trim();
    const url = https(item.url || item.streamUrl || '');
    return { id: item.id || `${lang}-${index}`, lang, language: item.language || item.name || item.label || lang, languageCode: lang, name: item.name || item.language || item.label || lang, label: item.label || item.language || item.name || lang, url, proxyUrl: url ? `/api/subtitle?url=${encodeURIComponent(url)}` : '', size: item.size || '', delay: item.delay || 0 };
  });
  return { results: videos, subtitles };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ results: [], subtitles: [] });
  const subjectId = String(req.query.id || '');
  if (!subjectId) return res.status(400).json({ results: [], subtitles: [] });
  const season = String(req.query.season || '0');
  const episode = String(req.query.episode || '0');
  const type = String(req.query.type || '').toLowerCase();
  const se = type === 'movie' ? '0' : season;
  const ep = type === 'movie' ? '0' : episode;
  let detailPath = String(req.query.path || '');
  const title = String(req.query.title || '');

  try {
    if (!detailPath) {
      const detail = await readJson(`${metadataBase}/detail?subjectId=${encodeURIComponent(subjectId)}`);
      detailPath = detail?.data?.subject?.detailPath || detail?.data?.detailPath || '';
    }
    const suffix = `subjectId=${encodeURIComponent(subjectId)}&detailPath=${encodeURIComponent(detailPath)}&se=${se}&ep=${ep}`;
    let data = await readJson(`${omegaBase}/api/movie/MovieBox-pro?action=download&${suffix}`);
    if (!hasSources(data)) data = await readJson(`${streamBase}/info?${suffix}`);

    if (!hasSources(data) && title) {
      const search = await readJson(`${omegaBase}/api/movie/MovieBox-pro?action=search&keyword=${encodeURIComponent(title)}&page=1`);
      const items = search?.data?.results || search?.data?.raw?.items || search?.data?.items || [];
      for (const item of items) {
        const sid = String(item.subjectId || item.id || '');
        if (!sid || sid === subjectId) continue;
        const candidatePath = item.detailPath || '';
        const candidate = await readJson(`${omegaBase}/api/movie/MovieBox-pro?action=download&subjectId=${encodeURIComponent(sid)}&detailPath=${encodeURIComponent(candidatePath)}&se=${se}&ep=${ep}`);
        if (hasSources(candidate)) { data = candidate; break; }
      }
    }
    return res.status(200).json(normalize(data));
  } catch (error) {
    console.error('[Movie Lab sources]', error);
    return res.status(200).json({ results: [], subtitles: [] });
  }
}
