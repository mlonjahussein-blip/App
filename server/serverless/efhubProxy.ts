import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let target = (req.query.url as string) || 'https://efhub.com/players';
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

      // Inject base href so relative resources resolve from efhub.com
      const baseTag = '<base href="https://efhub.com/">';
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head[^>]*>/, `$&${baseTag}`);
      }

      // Inject communication script
      const scriptTag = `
<script>
(function() {
  function notifyParent(type, payload) {
    try {
      window.parent.postMessage({ source: 'EFHUB_EMBED', type: type, ...payload }, '*');
    } catch (e) {}
  }

  // Intercept click on player cards or links
  document.addEventListener('click', function(e) {
    var anchor = e.target.closest('a[href*="/players/"]') || e.target.closest('[data-player-id]');
    if (anchor) {
      var href = anchor.getAttribute('href') || window.location.pathname;
      var text = (anchor.innerText || '').trim();
      notifyParent('CARD_CLICKED', { href: href, fullUrl: anchor.href || window.location.href, text: text });
    }
  }, true);

  // Monitor location changes
  function checkUrlChange() {
    notifyParent('URL_CHANGED', { url: window.location.href, pathname: window.location.pathname });
  }

  var origPush = history.pushState;
  if (origPush) {
    history.pushState = function() {
      origPush.apply(this, arguments);
      checkUrlChange();
    };
  }

  window.addEventListener('popstate', checkUrlChange);
  setTimeout(checkUrlChange, 1200);
})();
</script>
`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}</body>`);
      } else {
        html += scriptTag;
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
