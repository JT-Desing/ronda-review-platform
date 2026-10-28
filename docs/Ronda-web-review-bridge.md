# Ronda web review bridge

Ronda renders the supplied HTTPS URL directly in a sandboxed iframe. It does not proxy or recreate the site. A page cannot expose its scroll/layout to Ronda across origins, so document-anchored marks require an explicit integration on the reviewed site.

## Install on the reviewed site

Load the bridge on pages that should be reviewed:

```html
<script defer src="https://ronda.repolite.link/ronda-web-review-bridge.js?parentOrigin=https%3A%2F%2Fronda.repolite.link"></script>
```

Then permit the Ronda origin in the site's response headers:

- `Content-Security-Policy: frame-ancestors https://ronda.repolite.link` (retain the site's other required ancestors).
- Remove `X-Frame-Options: SAMEORIGIN` / `DENY` for the reviewable page; those directives conflict with cross-origin embedding.
- If the site has a `script-src` Content Security Policy, allow `https://ronda.repolite.link` to load the bridge.

The bridge only accepts an initialization message from the configured Ronda origin and replies to that origin. It reports viewport size, document size, and page scroll position; it does not read, transmit, or rewrite page content. The iframe remains sandboxed in Ronda (`allow-scripts` only).

## Verify

1. Open the site's URL in a Ronda review.
2. Wait for the “Documento conectado” status.
3. Create a mark, scroll the page inside the frame, and confirm the mark stays over the same document location.
4. Resize the Ronda viewer and repeat.

Without the bridge, Ronda will indicate that only viewport-relative annotations are available. Sites that block framing must change their own headers; Ronda cannot override those browser protections.
