// Using unfetch 4.2.0 because 5.0.0 has a bug
// https://github.com/developit/unfetch/pull/164
import { default as fetch } from "unfetch";

import { ajv } from "./data-validation";
import { AddonBase, CLIENT_VERSION } from "./utils";

export const API_ENDPOINT = "/_/api/v2/analytics/";

/**
 * Analytics addon
 *
 * Register page views that can be seen from the project's dashboard.
 * Besides, it injects the Global Read the Docs analytics.
 *
 * Read more at:
 *  - https://docs.readthedocs.io/en/stable/reference/analytics.html
 *  - https://docs.readthedocs.io/en/stable/advertising/advertising-details.html#analytics
 *
 * @param {Object} config - Addon configuration object
 */
export class AnalyticsAddon extends AddonBase {
  static jsonValidationURI =
    "http://v1.schemas.readthedocs.org/addons.analytics.json";
  static addonEnabledPath = "addons.analytics.enabled";
  static addonName = "Analytics";
  static enabledOnHttpStatus = [200, 404];

  loadConfig(config) {
    this.config = config;

    // Only register pageviews on non-external versions
    if (this.config.versions.current.type !== "external") {
      this.registerPageView();
    }
  }

  registerPageView() {
    const params = {
      project: this.config.projects.current.slug,
      version: this.config.versions.current.slug,
      absolute_uri: window.location.href,
    };

    const url = API_ENDPOINT + "?" + new URLSearchParams(params).toString();
    fetch(url, {
      method: "GET",
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error();
        }
      })
      .catch((error) => {
        console.error("Error registering page view");
      });
  }
}
