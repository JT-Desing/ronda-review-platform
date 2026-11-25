// Derives the Firefox manifest from extension/manifest.json (the Chrome one),
// so both builds share one source and cannot drift apart.
export const FIREFOX_ID = 'ronda-anotaciones@repolite.link';

/**
 * @param {Record<string, any>} chrome Chrome MV3 manifest
 * @returns {Record<string, any>} Firefox MV3 manifest
 */
export function toFirefoxManifest(chrome) {
  const {minimum_chrome_version: _chromeOnly, background, permissions, ...rest} = chrome;
  return {
    ...rest,
    // Firefox runs MV3 backgrounds as event pages, not service workers.
    background: {scripts: [background.service_worker], type: background.type},
    // Firefox has no webRequestAuthProvider; onAuthRequired needs webRequestBlocking.
    permissions: permissions.map(name => (name === 'webRequestAuthProvider' ? 'webRequestBlocking' : name)),
    browser_specific_settings: {
      gecko: {
        id: FIREFOX_ID,
        strict_min_version: '128.0',
        // Selected text and scroll position reach Ronda and are saved with the
        // comment. Saved site passwords stay in the browser, so they are not listed.
        data_collection_permissions: {required: ['websiteContent', 'websiteActivity']},
      },
    },
  };
}
