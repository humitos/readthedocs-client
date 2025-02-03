import styleSheet from "./docdiff.css";
import docdiffGeneralStyleSheet from "./docdiff.document.css";

// Note that it took as a while to make it work on production and also on tests.
// We have to import it as:
//   import * as  visualDomDiff from "visual-dom-diff";
//
// We have to use it as:
//   visualDomDiff.visualDomDiff();
//
// See https://github.com/readthedocs/addons/pull/234
import * as visualDomDiff from "visual-dom-diff";

import {
  EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW,
  EVENT_READTHEDOCS_DOCDIFF_HIDE,
  EVENT_READTHEDOCS_ROOT_DOM_CHANGED,
} from "./events";
import { nothing, LitElement } from "lit";
import { default as objectPath } from "object-path";
import { AddonBase, hasQueryParam, docTool } from "./utils";

export const DOCDIFF_URL_PARAM = "readthedocs-diff";

/**
 * visual-dom-diff options
 *
 * See https://github.com/Teamwork/visual-dom-diff#options
 */
const VISUAL_DIFF_OPTIONS = {
  addedClass: "doc-diff-added",
  modifiedClass: "doc-diff-modified",
  removedClass: "doc-diff-removed",
  skipModified: true,
};

export class DocDiffElement extends LitElement {
  static elementName = "readthedocs-docdiff";

  static properties = {
    config: {
      state: true,
    },
    enabled: {
      type: Boolean,
    },
    baseUrl: {
      type: String,
      attribute: "base-url",
    },
    injectStyles: {
      type: Boolean,
      attribute: "inject-styles",
      // NOTE: the way that regular `type: Boolean` works is taking a look at
      // the presence of the attribute, which defaults to `false` and it's not
      // what we want. I think it's clearer to always use the same API
      // "key=value" to keep consistency.
      converter: {
        fromAttribute: (value, type) => {
          if (value === "true") {
            return true;
          }
          return false;
        },
        toAttribute: (value, type) => {
          if (value === true) {
            return "true";
          }
          return "false";
        },
      },
    },
  };

  static styles = styleSheet;

  constructor() {
    super();

    this.config = null;
    this.baseUrl = null;
    this.rootSelector = null;
    this.injectStyles = true;

    this.originalBody = null;
    this.cachedRemoteContent = null;
  }

  loadConfig(config) {
    if (!DocDiffAddon.isEnabled(config)) {
      return;
    }
    this.config = config;
    this.rootSelector =
      objectPath.get(this.config, "options.root_selector") ||
      docTool.getRootSelector();

    // NOTE: maybe there is a better way to inject this styles?
    // Conditionally inject our base styles
    if (this.injectStyles) {
      document.adoptedStyleSheets.push(docdiffGeneralStyleSheet);
    }

    // Enable DocDiff if the URL parameter is present
    if (hasQueryParam(DOCDIFF_URL_PARAM)) {
      const event = new CustomEvent(
        EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW,
      );
      document.dispatchEvent(event);
    }
  }

  render() {
    return nothing;
  }

  compare() {
    let promiseData;

    if (this.cachedRemoteContent !== null) {
      promiseData = Promise.resolve(this.cachedRemoteContent);
    } else {
      promiseData = fetch(this.config.addons.doc_diff.base_url).then(
        (response) => {
          if (!response.ok) {
            throw new Error("Error downloading requested base URL.");
          }
          return response.text();
        },
      );
    }

    promiseData
      .then((text) => {
        this.cachedRemoteContent = text;
        this.performDiff(text);
      })
      .finally(() => {
        const event = new CustomEvent(EVENT_READTHEDOCS_ROOT_DOM_CHANGED);
        document.dispatchEvent(event);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  // After finding the root element, and diffing it, replace it in the DOM
  // with the resulting visual diff elements instead.
  performDiff(remoteContent) {
    const parser = new DOMParser();
    const html_document = parser.parseFromString(remoteContent, "text/html");
    const old_body = html_document.documentElement.querySelector(
      this.rootSelector,
    );
    const new_body = document.querySelector(this.rootSelector);

    if (old_body == null || new_body == null) {
      throw new Error("Element not found in both documents.");
    }

    const diffNode = visualDomDiff.visualDomDiff(
      old_body,
      new_body,
      VISUAL_DIFF_OPTIONS,
    );
    new_body.replaceWith(diffNode.firstElementChild);
  }

  enableDocDiff() {
    // TODO: Unsure when this would happen?
    // Perhaps when DocDiffAddon.isEnabled returns false?
    if (this.config === null) {
      return null;
    }

    if (this.enabled) {
      console.debug("Ignoring enableDocDiff: it was already enabled");
      return null;
    }

    // Update URL to include the diff parameter
    const url = new URL(window.location.href);
    url.searchParams.set(DOCDIFF_URL_PARAM, "true");
    window.history.replaceState({}, "", url);

    this.enabled = true;
    this.originalBody = document.querySelector(this.rootSelector);
    return this.compare();
  }

  disableDocDiff() {
    if (!this.enabled) {
      console.debug("Ignoring disableDocDiff: it was already disabled");
      return null;
    }

    // Remove diff parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete(DOCDIFF_URL_PARAM);
    window.history.replaceState({}, "", url);

    this.enabled = false;
    document.querySelector(this.rootSelector).replaceWith(this.originalBody);

    const event = new CustomEvent(EVENT_READTHEDOCS_ROOT_DOM_CHANGED);
    document.dispatchEvent(event);
  }

  _handleShowDocDiff = (e) => {
    e.preventDefault();
    this.enableDocDiff();
  };

  _handleHideDocDiff = (e) => {
    e.preventDefault();
    this.disableDocDiff();
  };

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(
      EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW,
      this._handleShowDocDiff,
    );
    document.addEventListener(
      EVENT_READTHEDOCS_DOCDIFF_HIDE,
      this._handleHideDocDiff,
    );
  }

  disconnectedCallback() {
    document.removeEventListener(
      EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW,
      this._handleShowDocDiff,
    );
    document.removeEventListener(
      EVENT_READTHEDOCS_DOCDIFF_HIDE,
      this._handleHideDocDiff,
    );
    super.disconnectedCallback();
  }
}

export class DocDiffAddon extends AddonBase {
  static jsonValidationURI =
    "http://v1.schemas.readthedocs.org/addons.docdiff.json";
  static addonEnabledPath = "addons.doc_diff.enabled";
  static addonName = "DocDiff";
  static elementClass = DocDiffElement;

  static requiresUrlParam() {
    return (
      window.location.host.endsWith(".readthedocs.build") ||
      // Allow the addon to be enabled on root domains in dev,
      // so we don't have to setup external versions for testing.
      window.location.host.endsWith(".devthedocs.org") ||
      window.location.host.endsWith(".devthedocs.com")
    );
  }
}

customElements.define(DocDiffElement.elementName, DocDiffElement);
