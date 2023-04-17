import semverMaxSatisfying from "semver/ranges/max-satisfying";
import semverCoerce from "semver/functions/coerce";
import { library, icon } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleXmark,
  faCodePullRequest,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import { html, nothing, render, LitElement } from "lit";

import styleSheet from "./notification.css";
import { AddonBase } from "./utils";

export class NotificationElement extends LitElement {
  /** @static @property {string} - registered HTML element tag name */
  static elementName = "readthedocs-notification";

  /** @static @property {Object} - Lit reactive properties */
  static properties = {
    config: { state: true },
    urls: { state: true },
    highest_version: { state: true },
  };

  /** @static @property {Object} - Lit stylesheets to apply to elements */
  static styles = styleSheet;

  constructor() {
    super();

    this.className = this.className || "raised floating";
    this.config = {};
    this.urls = {
      build: null,
      external: null,
    };
    this.highest_version = {};
  }

  loadConfig(config) {
    this.config = config;

    // TODO: this URL should come from the backend API.
    // Doing a simple replacement for now to solve the most common cases.
    const vcs_external_url = config.project.repository_url
      .replace(".git", "")
      .replace("git@github.com:", "https://github.com/");

    this.urls = {
      build: `${window.location.protocol}//${config.domains.dashboard}/projects/${config.project.slug}/builds/${config.build.id}/`,
      external: `${vcs_external_url}/pull/${config.version.slug}`,
    };
    this.calculateHighestVersion();
  }

  render() {
    // The element doesn't yet have our config, don't render it.
    if (!this.config) {
      // nothing is a special Lit response type
      return nothing;
    }

    if (this.config.version.external) {
      if (this.config.features.external_version_warning.enabled) {
        return this.renderExternalVersionWarning();
      }
    } else if (
      this.config.features.non_latest_version_warning.enabled &&
      this.highest_version
    ) {
      return this.renderNonLatestVersionWarning();
    }
    return nothing;
  }

  calculateHighestVersion() {
    // Convert versions like `v1` into `1.0.0` to be able to compare them
    const versions = this.config.features.non_latest_version_warning.versions;
    const coercedVersions = versions.map((v) => semverCoerce(v));
    const coercedHighest = semverMaxSatisfying(coercedVersions, ">=0.0.0");

    // Get back the original `v1` to generate the URLs and display the correct name
    const index = coercedVersions.indexOf(coercedHighest);
    const highest = versions[index];

    if (highest && highest !== this.config.version.slug) {
      this.highest_version = {
        name: highest,
        // TODO: get this URL from the API
        url: `${window.location.protocol}/${window.location.hostname}/${this.config.project.language}/${highest}/`,
      };
    }
  }

  renderNonLatestVersionWarning() {
    library.add(faCircleXmark);
    library.add(faLayerGroup);
    const xmark = icon(faCircleXmark, {
      title: "Close notification",
    });
    const iconLayerGroup = icon(faLayerGroup, {
      title: "This version is not the latest one",
      classes: ["header", "icon"],
    });

    return html`
      <div>
        ${iconLayerGroup.node[0]}
        <div class="title">
          This is an <span>old version</span>
          <a href="#" class="right" @click=${this.closeNotification}>
            ${xmark.node[0]}
          </a>
        </div>
        <div class="content">
          You are reading an old version of this documentation. The latest
          stable version is
          <a href="${this.highest_version.url}">${this.highest_version.name}</a
          >.
        </div>
      </div>
    `;
  }

  renderExternalVersionWarning() {
    library.add(faCircleXmark);
    library.add(faCodePullRequest);
    const xmark = icon(faCircleXmark, {
      title: "Close notification",
    });
    const iconPullRequest = icon(faCodePullRequest, {
      title: "This version is a pull request version",
      classes: ["header", "icon"],
    });

    return html`
      <div>
        ${iconPullRequest.node[0]}
        <div class="title">
          This page was created from a pull request build
          <a href="#" class="right" @click=${this.closeNotification}>
            ${xmark.node[0]}
          </a>
        </div>
        <div class="content">
          See the
          <a href="${this.urls.build}">build's detail page</a>
          or
          <a href="${this.urls.external}"
            >pull request #${this.config.version.slug}</a
          >
          for more information.
        </div>
      </div>
    `;
  }

  closeNotification(e) {
    // TODO add cookie to allow closing this notification for all page views on this
    // PR build.
    this.remove();

    // Avoid event propagation
    return false;
  }
}

/**
 * Notification addon
 *
 * Currently this addon is used to warn readers that the documentation is built
 * from a pull request.
 *
 * The default implementation is a floating element, but this can also be hard
 * coded into the page from the author or theme author. If there is a hardcoded
 * element, we do not inject a new element, but the web component is
 * initialized as normal by the browser.
 *
 * We load the param ``config`` into the elements after creation and API
 * response, as this is needed to give hardcoded elements access to ``config``
 *
 * @param {Object} config - Addon configuration object
 */
export class NotificationAddon extends AddonBase {
  constructor(config) {
    super();

    // Load this first as it is illegal to instantiate the element class without
    // defining the custom element first.
    customElements.define("readthedocs-notification", NotificationElement);

    // If there are no elements found, inject one
    let elems = document.querySelectorAll("readthedocs-notification");
    if (!elems.length) {
      elems = [new NotificationElement()];
      render(elems[0], document.body);
    }

    for (const elem of elems) {
      elem.loadConfig(config);
    }
  }

  /**
   * Test if addon is enabled in the configuration
   *
   * @param {Object} config - Addon configuration object
   */
  static isEnabled(config) {
    // TODO support the outdated version warning feature here too.
    return (
      config.features &&
      config.features.external_version_warning.enabled &&
      config.version.external
    );
  }
}
