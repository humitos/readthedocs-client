import { getReadTheDocsConfig } from "./readthedocs-config";
import * as notification from "./notification";
import * as analytics from "./analytics";
import * as search from "./search";
import * as docdiff from "./docdiff";
import * as flyout from "./flyout";
import * as ethicalads from "./ethicalads";
import * as hotkeys from "./hotkeys";
import * as linkpreviews from "./linkpreviews";
import * as filetreediff from "./filetreediff";
import * as customscript from "./customscript";
import { default as objectPath } from "object-path";
import {
  isEmbedded,
  IS_PRODUCTION,
  setupLogging,
  getMetadataValue,
} from "./utils";

export function setup() {
  const addons = [
    flyout.FlyoutAddon,
    notification.NotificationAddon,
    analytics.AnalyticsAddon,
    ethicalads.EthicalAdsAddon,
    search.SearchAddon,

    // HotKeys has to be initialized before DocDiff because when
    // `?readthedocs-diff=true` DocDiff triggers an event that HotKeys has to
    // listen to to update its internal state.
    hotkeys.HotKeysAddon,
    docdiff.DocDiffAddon,

    linkpreviews.LinkPreviewsAddon,
    filetreediff.FileTreeDiffAddon,
    customscript.CustomScriptAddon,
  ];

  return new Promise((resolve) => {
    setupLogging();

    let sendUrlParam = false;
    for (const addon of addons) {
      if (addon.requiresUrlParam()) {
        sendUrlParam = true;
        break;
      }
    }

    getReadTheDocsConfig(sendUrlParam)
      .then((config) => {
        const loadWhenEmbedded = objectPath.get(
          config,
          "addons.options.load_when_embedded",
          false,
        );
        if (isEmbedded() && !loadWhenEmbedded) {
          return false;
        }

        const httpStatus = getMetadataValue("readthedocs-http-status");
        let promises = [];

        if (!IS_PRODUCTION) {
          // Addons that are only available on development
          console.log("Development mode.");
        }

        for (const addon of addons) {
          if (addon.isEnabled(config, httpStatus)) {
            promises.push(
              new Promise((resolve) => {
                return resolve(new addon(config));
              }),
            );
          }
        }
        return Promise.all(promises);
      })
      .then(() => {
        return resolve();
      })
      .catch((err) => {
        console.error(err);
      });
  });
}
