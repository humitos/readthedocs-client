import { ajv } from "./data-validation";
import { library, icon } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleXmark,
  faFlask,
  faCodePullRequest,
  faHourglassHalf,
} from "@fortawesome/free-solid-svg-icons";
import { html, nothing, render, LitElement } from "lit";
import { default as objectPath } from "object-path";

import styleSheet from "./notification.css";
import { AddonBase, addUtmParameters, getLinkWithFilename } from "./utils";

export class NotificationElement extends LitElement {
  /** @static @property {string} - registered HTML element tag name */
  static elementName = "readthedocs-notification";

  /** @static @property {Object} - Lit reactive properties */
  static properties = {
    config: { state: true },
    urls: { state: true },
    highest_version: { state: true },
    dismissedTimestamp: { state: true },
    autoDismissed: { state: true },
    localStorageKey: { state: true },
  };

  /** @static @property {Object} - Lit stylesheets to apply to elements */
  static styles = styleSheet;

  constructor() {
    super();

    this.timerID = null;
    this.config = null;
    this.urls = {
      build: null,
      external: null,
      stable: null,
    };
    this.readingLatestVersion = false;
    this.readingStableVersion = false;
    this.stableVersionAvailable = false;
    // This will store information like user dimissing the notification. Any Notification sharing
    // the same localStorageKey will be affected.
    this.localStorageKey = null;
    this.dismissedTimestamp = null;
    this.autoDismissed = false;

    // Trigger the auto-dismiss timer at startup
    this.triggerAutoDismissTimer();
  }

  loadDismissedTimestamp(config) {
    // Check if this notification (as determined by localStorageKey) has been dismissed already.
    // Once a notification has been dismissed, it stays dismissed. This information however is not passed
    // over different subdomains, so if a notification has been dismissed on a PR build, it will not affect
    // other builds.
    this.localStorageKey = this.getLocalStorageKeyFromConfig(this.config);
    const notificationStorage =
      NotificationAddon.getLocalStorage()[this.localStorageKey];
    if (notificationStorage && notificationStorage.dismissedTimestamp) {
      this.dismissedTimestamp = notificationStorage.dismissedTimestamp;
    }
  }

  triggerAutoDismissTimer() {
    if (!document.hidden && !this.autoDismissed) {
      clearTimeout(this.timerID);
      this.timerID = setTimeout(() => {
        this.autoDismissed = true;
        this.requestUpdate();
      }, 5000);
    }
  }

  clearAutoDismissTimer() {
    clearTimeout(this.timerID);
    this.timerID = null;
  }

  _handleMouseEnter = (e) => {
    // Stop the timer when notification is hovered (mouseenter event)
    clearTimeout(this.timerID);
    this.timerID = null;
  };

  _handleMouseLeave = (e) => {
    // Start the timer when the notification is hovered away (mouseleave)
    this.triggerAutoDismissTimer();
  };

  _handleVisibilityChange = (e) => {
    if (document.hidden) {
      // Page is hidden. The user is not looking at it.
      // Clear the timeout to hide the notification.
      this.clearAutoDismissTimer();
    } else {
      // Page became visible.
      // Trigger a timeout to hide the notification.
      this.triggerAutoDismissTimer();
    }
  };

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this._handleVisibilityChange);

    this.addEventListener("mouseenter", this._handleMouseEnter);
    this.addEventListener("mouseleave", this._handleMouseLeave);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.removeEventListener("mouseenter", this._handleMouseEnter);
    this.removeEventListener("mouseleave", this._handleMouseLeave);

    document.removeEventListener(
      "visibilitychange",
      this._handleVisibilityChange,
    );
    clearTimeout(this.timerID);
    this.timerID = null;
  }

  loadConfig(config) {
    // Validate the config object before assigning it to the Addon.
    // Later, ``render()`` method will check whether this object exists and (not) render
    // accordingly
    if (!NotificationAddon.isEnabled(config)) {
      return;
    }

    this.config = config;

    if (
      this.config.addons.notifications.enabled &&
      this.config.versions.current.type === "external"
    ) {
      this.urls = {
        // NOTE: point users to the new beta dashboard for now so we promote it more.
        // We will revert this once we are fully migrated to the new dashboard.
        build: config.builds.current.urls.build
          .replace("readthedocs.org", "app.readthedocs.org")
          .replace("readthedocs.com", "app.readthedocs.com")
          .replace("app.app.", "app."),
        external: config.versions.current.urls.vcs,
      };
    }

    if (
      objectPath.get(
        this.config,
        "addons.notifications.show_on_latest",
        false,
      ) &&
      config.projects.current.versioning_scheme !==
        "single_version_without_translations" &&
      config.versions.current.type !== "external"
    ) {
      this.calculateStableLatestVersionWarning();
    }
    this.loadDismissedTimestamp(this.config);
  }

  getLocalStorageKeyFromConfig(config) {
    const projectSlug = config.projects.current.slug;
    const languageCode = config.projects.current.language.code;
    const versionSlug = config.versions.current.slug;
    return `${projectSlug}-${languageCode}-${versionSlug}-notification`;
  }

  firstUpdated() {
    // Add CSS classes to the element on ``firstUpdated`` because we need the
    // HTML element to exist in the DOM before being able to add tag attributes.
    this.className = this.className || "raised toast";
  }

  render() {
    if (this.autoDismissed) {
      return nothing;
    }

    // The element doesn't yet have our config, don't render it.
    if (this.config === null) {
      // nothing is a special Lit response type
      return nothing;
    }

    // This notification has been dimissed, so don't render it
    if (this.dismissedTimestamp) {
      return nothing;
    }

    if (!this.config.addons.notifications.enabled) {
      return nothing;
    }

    if (this.config.versions.current.type === "external") {
      if (
        objectPath.get(
          this.config,
          "addons.notifications.show_on_external",
          false,
        )
      ) {
        return this.renderExternalVersionWarning();
      }
    }

    if (
      this.readingLatestVersion &&
      this.stableVersionAvailable &&
      this.config.versions.current.slug !==
        this.config.projects.current.default_version &&
      objectPath.get(this.config, "addons.notifications.show_on_latest", false)
    ) {
      return this.renderLatestVersionWarning();
    }

    if (
      !this.readingStableVersion &&
      this.stableVersionAvailable &&
      this.config.versions.current.slug !==
        this.config.projects.current.default_version &&
      objectPath.get(
        this.config,
        "addons.notifications.show_on_non_stable",
        false,
      )
    ) {
      return this.renderStableVersionWarning();
    }

    return nothing;
  }

  calculateStableLatestVersionWarning() {
    // The logic is pretty simple:
    //  - if the user is reading the "latest" version: shows a notification to warn
    //    the user about reading the latest development version.
    //  - if the user is reading a non-"stable" version: shows a notification to warn
    //    the user about reading a version that may be old.
    //  - Both notifications are skipped if the current version is the **default** version,
    //    as we assume then the author wants the user to be reading that version.
    //
    // This does not cover all the cases where this notification could be useful,
    // but users with different needs should be able to implement their own custom logic.
    const stableVersion = this.config.versions.active.find(
      (version) => version.slug === "stable",
    );
    const latestVersion = this.config.versions.active.find(
      (version) => version.slug === "latest",
    );
    const currentVersion = this.config.versions.current;

    // Current version is "latest" or its alias
    if (
      currentVersion.slug === "latest" ||
      (latestVersion !== undefined &&
        latestVersion.aliases.find(
          (version) => version.slug === currentVersion.slug,
        ) !== undefined)
    ) {
      this.readingLatestVersion = true;
    }

    // Current version is "stable" or its alias
    if (
      currentVersion.slug === "stable" ||
      (stableVersion !== undefined &&
        stableVersion.aliases.find(
          (version) => version.slug === currentVersion.slug,
        ) !== undefined)
    ) {
      this.readingStableVersion = true;
    }

    if (stableVersion !== undefined) {
      this.stableVersionAvailable = true;
      this.urls.stable = getLinkWithFilename(
        stableVersion.urls.documentation,
        this.config.readthedocs.resolver.filename,
      );
    }
  }

  renderLatestVersionWarning() {
    library.add(faFlask);
    const iconFlask = icon(faFlask, {
      classes: ["header", "icon"],
    });

    return html`
      <div>
        ${iconFlask.node[0]}
        <div class="title">
          This is the <span>latest development version</span>
          ${this.renderCloseButton()}
        </div>
        <div class="content">
          Some features may not yet be available in the published stable
          version. Read the
          <a href="${this.urls.stable}">stable version of this documentation</a
          >.
        </div>
      </div>
    `;
  }

  renderStableVersionWarning() {
    library.add(faHourglassHalf);
    const iconHourglassHalf = icon(faHourglassHalf, {
      classes: ["header", "icon"],
    });

    return html`
      <div>
        ${iconHourglassHalf.node[0]}
        <div class="title">
          This <em>may</em> be an
          <span>old version of this documentation</span>
          ${this.renderCloseButton()}
        </div>
        <div class="content">
          You may be reading an old version of this documentation. Read the
          <a href="${this.urls.stable}"
            >latest stable version of this documentation</a
          >.
        </div>
      </div>
    `;
  }

  renderExternalVersionWarning() {
    library.add(faCodePullRequest);
    const iconPullRequest = icon(faCodePullRequest, {
      title: "This version is a pull request version",
      classes: ["header", "icon"],
    });

    return html`
      <div>
        ${iconPullRequest.node[0]}
        <div class="title">
          This page was created from a pull request build
          ${this.renderCloseButton()}
        </div>
        <div class="content">
          See the
          <a href="${addUtmParameters(this.urls.build, "notification")}"
            >build's detail page</a
          >
          or
          <a href="${this.urls.external}"
            >pull request #${this.config.versions.current.slug}</a
          >
          for more information.
        </div>
      </div>
    `;
  }

  renderCloseButton() {
    library.add(faCircleXmark);
    const xmark = icon(faCircleXmark, {
      title: "Close notification",
    });
    return html`
      <a href="#" class="right" @click=${this.closeNotification}>
        ${xmark.node[0]}
      </a>
    `;
  }

  closeNotification(e) {
    // Avoid going back to the top of the page when closing the notification
    e.preventDefault();

    // Store the information about dismissal in the Local Storage
    // Make sure to store the timestamp, so that we have the option to maybe add a TTL on the dismissal
    this.dismissedTimestamp = Date.now();
    const dismissedObj = {
      [this.localStorageKey]: { dismissedTimestamp: this.dismissedTimestamp },
    };
    NotificationAddon.setLocalStorage(dismissedObj);

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
  static jsonValidationURI =
    "http://v1.schemas.readthedocs.org/addons.notifications.json";
  static addonEnabledPath = "addons.notifications.enabled";
  static addonName = "Notification";
  static elementClass = NotificationElement;
}

customElements.define(NotificationElement.elementName, NotificationElement);
