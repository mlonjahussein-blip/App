import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let target = (req.query.url as string) || 'https://efhub.com/';
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = target.startsWith('/efootball') || target.startsWith('/assets')
        ? 'https://pesdb.net' + (target.startsWith('/') ? target : '/' + target)
        : 'https://efhub.com' + (target.startsWith('/') ? target : '/' + target);
    }

    const parsedUrl = new URL(target);
    if (!parsedUrl.hostname.endsWith('pesdb.net') && !parsedUrl.hostname.endsWith('efhub.com') && !parsedUrl.hostname.endsWith('efimg.com')) {
      return res.status(403).send('Forbidden: Proxy target domain not permitted.');
    }

    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow'
    });

    const finalUrl = response.url || target;
    const finalParsed = new URL(finalUrl);
    const finalOrigin = finalParsed.origin;

    const contentType = response.headers.get('content-type') || 'text/html';
    res.setHeader('content-type', contentType);
    res.setHeader('access-control-allow-origin', '*');

    // Remove frame blocking headers
    res.removeHeader('x-frame-options');
    res.removeHeader('content-security-policy');
    res.removeHeader('content-security-policy-report-only');

    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Neutralize common frame-busting patterns in raw HTML & scripts
      html = html.replace(/if\s*\(\s*(?:top\s*!==\s*self|self\s*!==\s*top|window\s*!==\s*top|top\s*!=\s*self|self\s*!=\s*top|window\s*!=\s*top)\s*\)/gi, 'if (false)');
      html = html.replace(/top\.location\.href\s*=/gi, 'window.location.href =');
      html = html.replace(/top\.location\s*=/gi, 'window.location =');
      html = html.replace(/parent\.location\.href\s*=/gi, 'window.location.href =');

      // 1. Rewrite relative paths for scripts, styles, manifests, assets
      html = html.replace(/href="\/assets\//g, `href="${finalOrigin}/assets/`);
      html = html.replace(/src="\/assets\//g, `src="${finalOrigin}/assets/`);
      html = html.replace(/href="\/_next\//g, `href="${finalOrigin}/_next/`);
      html = html.replace(/src="\/_next\//g, `src="${finalOrigin}/_next/`);
      html = html.replace(/src="\/efhub/g, `src="${finalOrigin}/efhub`);
      html = html.replace(/href="\/favicon/g, `href="${finalOrigin}/favicon`);
      html = html.replace(/src="\/favicon/g, `src="${finalOrigin}/favicon`);
      html = html.replace(/href="\/manifest\.json"/g, `href="${finalOrigin}/manifest.json"`);

      // 2. Inject Virtual Separate Tab Environment script at the VERY TOP of <head>
      const headScriptTag = `
<base href="${finalOrigin}/">
<script>
(function() {
  // Emulate completely separate, standalone browser tab environment
  try {
    Object.defineProperty(window, 'top', { get: function() { return window.self; }, configurable: true });
    Object.defineProperty(window, 'parent', { get: function() { return window.self; }, configurable: true });
    Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: true });
    Object.defineProperty(document, 'referrer', { get: function() { return ''; }, configurable: true });
    window.opener = null;
  } catch(e) {}

  function notifyParent(type, payload) {
    try {
      window.parent.postMessage({ source: 'EFHUB_EMBED', type: type, ...payload }, '*');
    } catch (e) {}
  }

  // Intercept window.open so popup requests stay within the in-built browser tab
  window.open = function(url) {
    if (url) {
      var fullUrl = url.startsWith('http') ? url : '${finalOrigin}' + (url.startsWith('/') ? url : '/' + url);
      notifyParent('URL_CHANGED', { url: fullUrl });
      window.location.href = '/api/efhub-proxy?url=' + encodeURIComponent(fullUrl);
    }
    return window;
  };

  // Intercept router history methods
  var origReplaceState = history.replaceState;
  history.replaceState = function(state, title, url) {
    if (url === '/' || url === window.location.origin + '/' || url === '') {
      return;
    }
    if (typeof url === 'string') {
      var fullUrl = url.startsWith('http') ? url : '${finalOrigin}' + (url.startsWith('/') ? url : '/' + url);
      notifyParent('URL_CHANGED', { url: fullUrl, pathname: url });
    }
    return origReplaceState.apply(this, arguments);
  };

  var origPushState = history.pushState;
  history.pushState = function(state, title, url) {
    if (url === '/' || url === window.location.origin + '/' || url === '') {
      return;
    }
    if (typeof url === 'string') {
      var fullUrl = url.startsWith('http') ? url : '${finalOrigin}' + (url.startsWith('/') ? url : '/' + url);
      notifyParent('URL_CHANGED', { url: fullUrl, pathname: url });
      if (url.includes('/players/') || url.includes('/players?') || url.includes('player.php') || url.includes('/player/')) {
        window.location.href = '/api/efhub-proxy?url=' + encodeURIComponent(fullUrl);
        return;
      }
    }
    return origPushState.apply(this, arguments);
  };

  // Intercept all form submissions so search and filters stay inside the proxy
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form) return;
    e.preventDefault();
    e.stopPropagation();

    var action = form.getAttribute('action') || window.location.pathname;
    var formData = new FormData(form);
    var params = new URLSearchParams();
    for (var pair of formData.entries()) {
      params.append(pair[0], pair[1]);
    }
    var queryString = params.toString();

    var target = action.startsWith('http') ? action : ('${finalOrigin}' + (action.startsWith('/') ? action : '/' + action));
    if (queryString) {
      target += (target.includes('?') ? '&' : '?') + queryString;
    }

    notifyParent('URL_CHANGED', { url: target });
    window.location.href = '/api/efhub-proxy?url=' + encodeURIComponent(target);
  }, true);

  // Helper to extract player card details from clicked element
  function extractCardFromElement(targetEl) {
    if (!targetEl) return null;
    var container = targetEl.closest('a, tr, div[class*="player"], div[class*="card"], div[class*="item"]');
    if (!container) return null;

    var text = (container.innerText || '').trim();
    if (!text || text.length < 2) return null;

    var ovrMatch = text.match(/\\b(10[0-9]|9[0-9]|8[0-9]|7[0-9])\\b/);
    var ovr = ovrMatch ? parseInt(ovrMatch[1], 10) : 90;

    var posMatch = text.match(/\\b(GK|CB|LB|RB|LWB|RWB|DMF|CMF|AMF|LMF|RMF|LWF|RWF|SS|CF)\\b/);
    var pos = posMatch ? posMatch[1] : 'CF';

    var cardType = 'Highlight';
    if (/show\\s*time/i.test(text)) cardType = 'Show Time';
    else if (/epic/i.test(text)) cardType = 'Epic';
    else if (/big\\s*time/i.test(text)) cardType = 'Big Time';
    else if (/potw/i.test(text)) cardType = 'POTW';
    else if (/booster/i.test(text)) cardType = 'Booster';
    else if (/legendary/i.test(text)) cardType = 'Legendary';
    else if (/featured/i.test(text)) cardType = 'Featured';

    var playstyle = 'Goal Poacher';
    var styles = [
      'Goal Poacher', 'Hole Player', 'Box-to-Box', 'Anchor Man', 'Build Up', 'Destroyer',
      'Orchestrator', 'Creative Playmaker', 'Proficient Winger', 'Roaming Flank', 
      'Target Man', 'Fox in the Box', 'Offensive Fullback', 'Defensive Fullback',
      'Fullback Finisher', 'Extra Frontman', 'Offensive Goalkeeper', 'Defensive Goalkeeper', 'Cross Specialist'
    ];
    for (var i = 0; i < styles.length; i++) {
      if (new RegExp(styles[i], 'i').test(text)) {
        playstyle = styles[i];
        break;
      }
    }

    var lines = text.split('\\n').map(function(l) { return l.trim(); }).filter(Boolean);
    var name = lines[0] || 'Selected Player';
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j];
      if (line.length > 2 && !/^\\d+$/.test(line) && !/^(GK|CB|LB|RB|DMF|CMF|AMF|LMF|RMF|LWF|RWF|SS|CF)$/.test(line)) {
        name = line;
        break;
      }
    }

    return {
      fullName: name,
      commonName: name,
      primaryPosition: pos,
      maxRating: ovr,
      baseRating: Math.max(70, ovr - 10),
      cardType: cardType,
      playstyle: playstyle,
      rawText: text.substring(0, 200)
    };
  }

  // Intercept all link and card clicks so navigation stays within the proxy browser
  document.addEventListener('click', function(e) {
    var anchor = e.target.closest('a');
    var cardData = extractCardFromElement(e.target);
    
    if (cardData) {
      notifyParent('CARD_DETECTED', { player: cardData });
    }

    if (!anchor) return;

    var href = anchor.getAttribute('href');
    if (!href) return;

    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('javascript:')) return;

    var efhubPlayerMatch = (href || '').match(/\\/(?:efootball\\/)?(?:players|player)\\/([0-9a-zA-Z_\\-]+)/);
    var pesdbPlayerMatch = (href || '').match(/player\\.php\\?id=([0-9]+)/);
    var playerId = (efhubPlayerMatch && efhubPlayerMatch[1]) || (pesdbPlayerMatch && pesdbPlayerMatch[1]);
    var text = (anchor.innerText || '').trim();

    var fullTarget = href.startsWith('http://') || href.startsWith('https://')
      ? href
      : (href.startsWith('/') ? ('${finalOrigin}' + href) : ('${finalOrigin}/' + href.replace(/^\\.\\//, '')));

    notifyParent('URL_CHANGED', { url: fullTarget, pathname: href });

    if (playerId) {
      notifyParent('CARD_CLICKED', { 
        href: href, 
        fullUrl: fullTarget, 
        playerId: playerId, 
        text: text,
        player: cardData 
      });
    }

    e.preventDefault();
    e.stopPropagation();

    window.location.href = '/api/efhub-proxy?url=' + encodeURIComponent(fullTarget);
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
    console.error('Error in /api/efhub-proxy serverless:', err);
    return res.status(500).send('Unable to load live database website frame.');
  }
}
