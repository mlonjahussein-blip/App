import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let target = (req.query.url as string) || 'https://efhub.com/';
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://efhub.com' + (target.startsWith('/') ? target : '/' + target);
    }

    const parsedUrl = new URL(target);
    if (!parsedUrl.hostname.endsWith('efhub.com') && !parsedUrl.hostname.endsWith('efimg.com')) {
      return res.status(403).send('Forbidden: Proxy target domain not permitted.');
    }

    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    res.setHeader('content-type', contentType);

    // Remove frame blocking headers
    res.removeHeader('x-frame-options');
    res.removeHeader('content-security-policy');
    res.removeHeader('content-security-policy-report-only');

    if (contentType.includes('text/html')) {
      let html = await response.text();

      // 1. Rewrite relative paths for scripts, styles, manifests, and static images to absolute efhub.com URLs
      html = html.replace(/href="\/_next\//g, 'href="https://efhub.com/_next/');
      html = html.replace(/src="\/_next\//g, 'src="https://efhub.com/_next/');
      html = html.replace(/src="\/efhub/g, 'src="https://efhub.com/efhub');
      html = html.replace(/href="\/favicon/g, 'href="https://efhub.com/favicon');
      html = html.replace(/src="\/favicon/g, 'src="https://efhub.com/favicon');
      html = html.replace(/href="\/icons\//g, 'href="https://efhub.com/icons/');
      html = html.replace(/src="\/icons\//g, 'src="https://efhub.com/icons/');
      html = html.replace(/href="\/manifest\.json"/g, 'href="https://efhub.com/manifest.json"');

      // 2. Inject anti-redirect and communication script at the VERY TOP of <head>
      const headScriptTag = `
<base href="https://efhub.com/">
<script>
(function() {
  function notifyParent(type, payload) {
    try {
      window.parent.postMessage({ source: 'EFHUB_EMBED', type: type, ...payload }, '*');
    } catch (e) {}
  }

  // Intercept Next.js client-side router redirects so it never escapes to root "/"
  var origReplaceState = history.replaceState;
  history.replaceState = function(state, title, url) {
    if (url === '/' || url === window.location.origin + '/' || url === '') {
      return;
    }
    return origReplaceState.apply(this, arguments);
  };

  var origPushState = history.pushState;
  history.pushState = function(state, title, url) {
    if (url === '/' || url === window.location.origin + '/' || url === '') {
      return;
    }
    if (typeof url === 'string') {
      var fullUrl = url.startsWith('http') ? url : 'https://efhub.com' + (url.startsWith('/') ? url : '/' + url);
      notifyParent('URL_CHANGED', { url: fullUrl, pathname: url });
      // If navigating to another page/player, load it through proxy
      if (url.startsWith('/players/') || url.startsWith('/players?')) {
        window.location.href = '/api/efhub-proxy?url=' + encodeURIComponent(fullUrl);
        return;
      }
    }
    return origPushState.apply(this, arguments);
  };

  // Intercept all link clicks so none escape to the host app
  document.addEventListener('click', function(e) {
    var anchor = e.target.closest('a');
    if (!anchor) return;

    var href = anchor.getAttribute('href');
    if (!href) return;

    // Check for player selection or card click
    var cardEl = anchor.closest('[data-player-id]') || anchor;
    var playerMatch = (href || '').match(/\\/players\\/([0-9a-zA-Z_\\-]+)/);
    var text = (anchor.innerText || '').trim();

    if (playerMatch && playerMatch[1]) {
      notifyParent('CARD_CLICKED', { 
        href: href, 
        fullUrl: anchor.href || ('https://efhub.com' + href), 
        playerId: playerMatch[1], 
        text: text 
      });
    }

    // Always keep relative links inside proxy
    if (href.startsWith('/') && !href.startsWith('/api/efhub-proxy')) {
      e.preventDefault();
      e.stopPropagation();
      var target = 'https://efhub.com' + href;
      window.location.href = '/api/efhub-proxy?url=' + encodeURIComponent(target);
    }
  }, true);

  // Monitor URL on load
  setTimeout(function() {
    notifyParent('URL_CHANGED', { url: window.location.href, pathname: window.location.pathname });
  }, 1000);
})();
</script>
`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${headScriptTag}`);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head[^>]*>/, `$&${headScriptTag}`);
      } else {
        html = headScriptTag + html;
      }

      return res.status(200).send(html);
    } else {
      const buffer = await response.arrayBuffer();
      return res.status(200).send(Buffer.from(buffer));
    }
  } catch (err: any) {
    console.error('Error in efhubProxy serverless handler:', err);
    return res.status(500).send('Unable to load live eFHUB frame.');
  }
}
