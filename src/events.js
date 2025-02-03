import { ADDONS_API_VERSION, getMetadataValue } from "./utils";

export const EVENT_READTHEDOCS_SEARCH_SHOW = "readthedocs-search-show";
export const EVENT_READTHEDOCS_SEARCH_HIDE = "readthedocs-search-hide";
export const EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW =
  "readthedocs-docdiff-added-removed-show";
export const EVENT_READTHEDOCS_DOCDIFF_HIDE = "readthedocs-docdiff-hide";
export const EVENT_READTHEDOCS_FLYOUT_SHOW = "readthedocs-flyout-show";
export const EVENT_READTHEDOCS_FLYOUT_HIDE = "readthedocs-flyout-hide";

/**
 * Event triggered when the URL has changed dynamically (modifying the history object)
 */
export const EVENT_READTHEDOCS_URL_CHANGED = "readthedocs-url-changed";

/**
 * Event triggered when the Read the Docs data is ready to be consumed by users.
 *
 * This is the event users subscribe to to make usage of Read the Docs data.
 * The object received is `ReadTheDocsEventData`.
 */
export const EVENT_READTHEDOCS_ADDONS_USER_DATA_READY =
  "readthedocs-addons-data-ready";

/**
 * Event triggered when the Read the Docs data is ready to be consumed internally.
 *
 * This is the event users subscribe to to make usage of Read the Docs data.
 * The object received is `ReadTheDocsEventData`.
 */
export const EVENT_READTHEDOCS_ADDONS_INTERNAL_DATA_READY =
  "readthedocs-addons-internal-data-ready";

/**
 * Event triggered when any addons modifies the root DOM.
 *
 * As an example, DocDiff triggers it when injecting the visual diferences.
 * Addons subscribe to this event to re-initialize them in case they perform
 * something specific on DOM elements from inside the root.
 */
export const EVENT_READTHEDOCS_ROOT_DOM_CHANGED =
  "readthedocs-root-dom-changed";

/**
 * Object to pass to user subscribing to `EVENT_READTHEDOCS_ADDONS_*_DATA_READY`.
 *
 * This object allows us to have a better communication with the user.
 * Instead of passing the raw data, we pass this object and enforce them
 * to use it in an expected way:
 *
 *   document.addEventListener(
 *     "readthedocs-addons-data-ready",
 *     function (event) {
 *       const data = event.detail.data();
 *     }
 *   );
 *
 * Note that we perform some checks/validations when `.data()` is called,
 * to make sure the user is using the pattern in the expected way.
 * Otherwise, we throw an exception.
 */
export class ReadTheDocsEventData {
  constructor(data) {
    this._initialized = false;
    this._data = data;
  }

  initialize() {
    const metadataAddonsAPIVersion = getMetadataValue(
      "readthedocs-addons-api-version",
    );
    if (metadataAddonsAPIVersion === undefined) {
      throw `Subscribing to '${EVENT_READTHEDOCS_ADDONS_USER_DATA_READY}' requires defining the '<meta name="readthedocs-addons-api-version" content="${ADDONS_API_VERSION}" />' tag in the HTML.`;
    }

    this._initialized = true;
  }

  data(internal) {
    // ``internal`` is used internally, to skip the META element check.
    if (!this._initialized && !internal) {
      this.initialize();
    }
    return this._data;
  }

  httpStatus() {
    const httpStatus = getMetadataValue("readthedocs-http-status");
    return httpStatus;
  }
}
