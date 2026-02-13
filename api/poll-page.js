/**
 * Serves poll.html with server-rendered og:meta tags.
 * Facebook's crawler does NOT execute JavaScript, so meta tags must be in the initial HTML.
 * This API fetches the template and injects og:title, og:description, og:url, og:image.
 */
export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
    const host = request.headers.get('x-forwarded-host') || url.host;
    const origin = `${proto}://${host}`;

    const question = url.searchParams.get('question') || url.searchParams.get('q') || '';
    const optsParam = url.searchParams.get('opts') || url.searchParams.get('options') || '';
    const options = optsParam ? optsParam.split(',').map(s => s.trim()).filter(Boolean) : [];

    const pageUrl = `${origin}/poll.html${url.search ? '?' + url.search : ''}`;

    let ogTitle = 'Bragging Rights - Poll';
    let ogDesc = 'Vote on this poll at Bragging Rights!';
    let ogImage = '';

    if (question) {
      const esc = (s) => (!s ? '' : String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'));
      ogTitle = esc(question) + ' • Bragging Rights';
      ogDesc = options.length ? 'Options: ' + options.map(esc).join(' • ') + ' — Vote at Bragging Rights!' : 'Vote at Bragging Rights!';
      const optsEnc = optsParam ? encodeURIComponent(optsParam) : '';
      ogImage = `${origin}/api/og-image?question=${encodeURIComponent(question)}${optsEnc ? '&opts=' + optsEnc : ''}`;
    }

    const fetchUrl = `${origin}/poll-static.html`;
    const resp = await fetch(fetchUrl);
    if (!resp.ok) {
      return new Response('Could not load poll template', { status: 500 });
    }
    let html = await resp.text();

    const escContent = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    html = html.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escContent(ogTitle)}" />`);
    html = html.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escContent(ogDesc)}" />`);
    html = html.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${escContent(pageUrl)}" />`);
    html = html.replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${escContent(ogImage)}" />`);

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    console.error('poll-page error:', err);
    return new Response('Error serving poll page', { status: 500 });
  }
}
