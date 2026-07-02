import { lazy } from 'react';

const RELOAD_FLAG = 'rems-chunk-reloaded';

/**
 * Drop-in replacement for React.lazy that self-heals stale deployments.
 *
 * After a deploy, a tab that loaded the previous version still references
 * old content-hashed chunk filenames; navigating to a not-yet-visited page
 * then 404s ("Loading chunk failed"). Instead of erroring, reload the page
 * once to pick up the new version. The sessionStorage flag prevents a
 * reload loop if the chunk is genuinely broken.
 */
const lazyWithReload = (importer) =>
  lazy(() =>
    importer()
      .then((module) => {
        sessionStorage.removeItem(RELOAD_FLAG);
        return module;
      })
      .catch((error) => {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
          // Keep React suspended while the reload happens.
          return new Promise(() => {});
        }
        throw error;
      })
  );

export default lazyWithReload;
