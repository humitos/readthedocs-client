import { CSSResult } from "lit";

import {
  docTool,
  domReady,
  isEmbedded,
  IS_PRODUCTION,
  setupLogging,
  setupHistoryEvents,
  getMetadataValue,
} from "./utils";
import { getReadTheDocsConfig } from "./readthedocs-config";
import {
  EVENT_READTHEDOCS_ADDONS_INTERNAL_DATA_READY,
  EVENT_READTHEDOCS_URL_CHANGED,
} from "./events";

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
import * as application from "./application";
import { default as objectPath } from "object-path";

import doctoolsStyleSheet from "./doctools.css";

export class AddonsApplication {
  constructor() {
    setupLogging();
    setupHistoryEvents();

    this.addonsInstances = [];
    this.config = null;

    console.debug(
      "Addons Application config (from constructor() method)",
      this.config,
    );

    this.addons = [
      flyout.FlyoutAddon,
      notification.NotificationAddon,
      analytics.AnalyticsAddon,
      ethicalads.EthicalAdsAddon,
      search.SearchAddon,

      // HotKeys & FileTreeDiff have to be initialized before DocDiff because when
      // `?readthedocs-diff=true` DocDiff triggers an event that HotKeys has to
      // listen to to update its internal state.
      // https://github.com/readthedocs/addons/blob/47645b013724cdf244716b549a5baa28409fafcb/src/docdiff.js#L105-L111
      hotkeys.HotKeysAddon,
      filetreediff.FileTreeDiffAddon,
      docdiff.DocDiffAddon,

      linkpreviews.LinkPreviewsAddon,
      customscript.CustomScriptAddon,
    ];

    this.httpStatus = getMetadataValue("readthedocs-http-status");

    this.addDoctoolData();
    getReadTheDocsConfig(this.sendUrlParam());
  }

  reload(config) {
    console.debug("Addons Application config (from reload() method)", config);

    if (!config) {
      return;
    }
    this.config = config;
    if (this.config && !this.loadWhenEmbedded()) {
      return;
    }

    if (!this.addonsInstances.length) {
      // Addons instances were not created yet
      let promises = [];
      for (const addon of this.addons) {
        if (addon.isEnabled(this.config, this.httpStatus)) {
          promises.push(
            new Promise((resolve) => {
              this.addonsInstances.push(new addon(this.config));
              resolve();
            }),
          );
        }
      }
      Promise.all(promises).catch((err) => {
        console.error(err);
      });
    } else {
      // Addons instances were already created. We just need to reload them with
      // the new config object.
      for (const addon of this.addonsInstances) {
        addon.loadConfig(config);
      }
    }
    return;
  }

  loadWhenEmbedded() {
    const loadWhenEmbedded = objectPath.get(
      this.config,
      "addons.options.load_when_embedded",
      false,
    );
    if (isEmbedded() && !loadWhenEmbedded) {
      return false;
    }
    return true;
  }

  sendUrlParam() {
    for (const addon of this.addons) {
      if (addon.requiresUrlParam()) {
        console.debug(`${addon.addonName} requires "url=" parameter.`);
        return true;
      }
    }
    return false;
  }

  addDoctoolData() {
    // Apply fixes to variables for individual documentation tools
    const elementHtml = document.querySelector("html");
    if (elementHtml) {
      // Inject styles at the parent DOM to set variables at :root
      let styleSheet = doctoolsStyleSheet;
      if (doctoolsStyleSheet instanceof CSSResult) {
        styleSheet = doctoolsStyleSheet.styleSheet;
      }
      document.adoptedStyleSheets = [styleSheet];

      // If we detect a documentation tool, set attributes on :root to allow
      // for CSS selectors to utilize these values.
      if (docTool.documentationTool) {
        elementHtml.setAttribute(
          "data-readthedocs-tool",
          docTool.documentationTool,
        );
      }
      if (docTool.documentationTheme) {
        elementHtml.setAttribute(
          "data-readthedocs-tool-theme",
          docTool.documentationTheme,
        );
      }
    }
  }
}

export const addonsApplication = new AddonsApplication();

/**
 * Subscribe to `EVENT_READTHEDOCS_ADDONS_INTERNAL_DATA_READY` to reload all the
 * addons with fresh Addons API data once it's ready.
 *
 */
document.addEventListener(
  EVENT_READTHEDOCS_ADDONS_INTERNAL_DATA_READY,
  (event) => {
    addonsApplication.reload(event.detail.data(true));
  },
);

/**
 * Subscribe to `EVENT_READTHEDOCS_URL_CHANGED` to trigger a new request to
 * Addons API to fetch fresh data.
 *
 */
window.addEventListener(EVENT_READTHEDOCS_URL_CHANGED, (event) => {
  console.debug("URL Change detected. Triggering a new API call", event);
  getReadTheDocsConfig(addonsApplication.sendUrlParam());
});
