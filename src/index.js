import { getReadTheDocsConfig } from "./readthedocs-config";
import { injectExternalVersionWarning } from "./external-version-warning";
import { injectNonLatestVersionWarning } from "./non-latest-version-warning";
import { injectFlyout, trackFlyoutEvents } from "./flyout";
import { registerPageView, injectAnalytics } from "./analytics";
import { injectEthicalAd } from "./sponsorship";
import { initializeHoverXRef } from "./hoverxref";
import { initializeSearchAsYouType } from "./search";
import { initializeDocDiff } from "./docdiff";

export function IsReadTheDocsEmbedPresent() {
  const url = "/_/static/javascript/readthedocs-doc-embed.js";
  return document.querySelectorAll(`script[src="${url}"]`).length > 0;
}

export function setup() {
  if (IsReadTheDocsEmbedPresent()) {
    console.debug("Read the Docs Embed is present. Skipping...");
    return false;
  }

  const is_loaded = new Promise((resolve) => {
    if (
      document.readyState === "interactive" ||
      document.readyState === "complete"
    ) {
      return resolve();
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          resolve();
        },
        {
          capture: true,
          once: true,
          passive: true,
        }
      );
    }
    return undefined;
  });

  return new Promise((resolve) => {
    is_loaded
      .then(() => {
        return getReadTheDocsConfig();
      })
      .then((config) => {
        let promises = [];

        promises.push(injectAnalytics(config));
        promises.push(injectFlyout(config));
        promises.push(initializeSearchAsYouType(config));
        promises.push(trackFlyoutEvents(config));
        promises.push(registerPageView(config));
        promises.push(injectEthicalAd(config));
        promises.push(initializeHoverXRef(config));
        // FIXME: re-enable docdiff.
        // It's conflicting with EthicalAds and Search As You Type.
        // promises.push(initializeDocDiff(config));

        if (
          config.features.non_latest_version_warning.enabled &&
          !config.version.external
        ) {
          promises.push(injectNonLatestVersionWarning(config));
        }

        if (
          config.features.external_version_warning.enabled &&
          config.version.external
        ) {
          promises.push(injectExternalVersionWarning(config));
        }
        return Promise.all(promises);
      })
      .then(() => {
        resolve();
      })
      .catch((err) => {
        console.error(err.message);
      });
  });
}
