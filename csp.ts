/*
 * The page's Content-Security-Policy, in one place. vite.config.ts writes it into the built page
 * as a <meta> tag (so it holds on any host), and public/_headers sends it as a header too, where
 * the host reads that file — a test keeps the two the same. It allows nothing but the game's own
 * files: no other site's scripts, no requests leaving the page (the game has no server and sends
 * nothing), and no strings turned into script (Trusted Types). The one script address the game
 * hands the browser — its own service worker — goes through the single policy allowed here,
 * which accepts that address and nothing else (swUpdate.ts).
 */
/** The only Trusted Types policy the page may create. */
export const TT_POLICY = 'sen-iksin-sw';

export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  `trusted-types ${TT_POLICY}`,
];

/** Only a header can refuse framing; a <meta> policy ignores this directive. */
export const HEADER_ONLY_DIRECTIVES = ["frame-ancestors 'none'"];

export const CSP = CSP_DIRECTIVES.join('; ');
