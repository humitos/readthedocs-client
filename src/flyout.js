import { ajv } from "./data-validation";
import READTHEDOCS_LOGO_WORDMARK from "./images/logo-wordmark-light.svg";
import READTHEDOCS_LOGO from "./images/logo-light.svg";
import { library, icon } from "@fortawesome/fontawesome-svg-core";
import {
  faCodeBranch,
  faCaretDown,
  faLanguage,
} from "@fortawesome/free-solid-svg-icons";
import { html, nothing, render, LitElement } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { default as objectPath } from "object-path";

import styleSheet from "./flyout.css";
import { AddonBase, addUtmParameters, getLinkWithFilename } from "./utils";
import { SPHINX, MKDOCS_MATERIAL } from "./constants";
import {
  EVENT_READTHEDOCS_SEARCH_SHOW,
  EVENT_READTHEDOCS_FLYOUT_HIDE,
  EVENT_READTHEDOCS_FLYOUT_SHOW,
} from "./events";

export class FlyoutElement extends LitElement {
  static elementName = "readthedocs-flyout";

  static properties = {
    config: { state: true },
    opened: { type: Boolean },
    position: { type: String },
  };

  static styles = styleSheet;

  constructor() {
    super();

    this.config = null;
    this.opened = false;
    this.position = "bottom-right";
    this.readthedocsLogo = READTHEDOCS_LOGO;
  }

  loadConfig(config) {
    // Validate the config object before assigning it to the Addon.
    // Later, ``render()`` method will check whether this object exists and (not) render
    // accordingly
    if (!FlyoutAddon.isEnabled(config)) {
      return;
    }
    this.config = config;

    // The "position" is a value that can be defined from the dashboard.
    // There are two main options: "Default" or a specific value.
    // When "Default" is used, the value will be grabbed from the HTML element (e.g. explicitly set by the theme author).
    // In case it's not defined, the value defined in the `constructor` will be used ("bottom-right")
    const dashboardPosition = objectPath.get(
      this.config,
      "addons.flyout.position",
      null,
    );
    if (dashboardPosition) {
      this.position = dashboardPosition;
    }
  }

  _close() {
    this.opened = false;
    this.readthedocsLogo = READTHEDOCS_LOGO;
  }

  _open() {
    this.opened = true;
    this.readthedocsLogo = READTHEDOCS_LOGO_WORDMARK;
  }

  _toggleOpen(e) {
    this.opened ? this._close() : this._open();
  }

  _onOutsideClick = (e) => {
    if (e.target !== this) {
      this._close();
    }
  };

  renderHeader() {
    library.add(faCodeBranch);
    library.add(faLanguage);
    const iconCodeBranch = icon(faCodeBranch, {
      classes: ["icon"],
    });
    const iconLanguage = icon(faLanguage, {
      classes: ["icon"],
    });
    let version = nothing;
    if (
      this.config.projects.current.versioning_scheme !==
      "single_version_without_translations"
    ) {
      version = html`<span class="version">
        ${iconCodeBranch.node[0]} ${this.config.versions.current.slug}
      </span> `;
    }

    const iconCaretDown = icon(faCaretDown, {
      classes: ["icon"],
    });

    let translation = nothing;
    if (this.config.projects.translations.length > 0) {
      translation = html`<span class="language">
        ${iconLanguage.node[0]}
        ${this.config.projects.current.language.code}</span
      > `;
    }

    return html`
      <header @click="${this._toggleOpen}">
        <img class="logo" src="${this.readthedocsLogo}" alt="Read the Docs" />
        ${translation} ${version}
        <span class="caret">${iconCaretDown.node[0]}</span>
      </header>
    `;
  }

  renderFooter() {
    return html`
      <small>
        <span>
          <a
            href="${addUtmParameters(
              "https://docs.readthedocs.io/page/addons.html",
              "flyout",
            )}"
            >Addons documentation</a
          ></span
        >
        <span> ― </span>
        <span
          >Hosted by
          <a
            href="${addUtmParameters(
              "https://about.readthedocs.com/",
              "flyout",
            )}"
            >Read the Docs</a
          ></span
        >
      </small>
    `;
  }

  showSearch() {
    // Dispatch the custom event to hide/collapse the flyout when showing the search modal
    const flyoutEvent = new CustomEvent(EVENT_READTHEDOCS_FLYOUT_HIDE);
    document.dispatchEvent(flyoutEvent);

    // Dispatch the custom event the search addon is listening to show the modal
    const searchEvent = new CustomEvent(EVENT_READTHEDOCS_SEARCH_SHOW);
    document.dispatchEvent(searchEvent);
  }

  renderSearch() {
    // Display the search input only if the search is enabled for this project
    // Note we use ``objectPath`` here instead of validating via JSON schema
    // because this value is optional: even if the search API response is broken,
    // we want to keep showing the flyout but without the search input.
    const searchEnabled = objectPath.get(
      this.config,
      "addons.search.enabled",
      false,
    );
    if (searchEnabled) {
      return html`
        <dl>
          <dt>Search</dt>
          <dd>
            <form @focusin="${this.showSearch}" id="flyout-search-form">
              <input
                type="text"
                name="q"
                aria-label="Search docs"
                placeholder="Search docs"
              />
            </form>
          </dd>
        </dl>
      `;
    }
    return nothing;
  }

  renderVCS() {
    if (
      // TODO: remove this check when ``vcs`` property becomes required
      !this.config.addons.flyout.vcs ||
      !this.config.addons.flyout.vcs.view_url
    ) {
      return nothing;
    }
    const { vcs } = this.config.addons.flyout;

    return html`
      <dl>
        <dt>On ${vcs.name}</dt>
        <dd>
          <a href="${vcs.view_url}">View</a>
        </dd>
      </dl>
    `;
  }

  renderReadTheDocs() {
    return html`
      <dl>
        <dt>On Read the Docs</dt>
        <dd>
          <a
            href="${addUtmParameters(
              this.config.projects.current.urls.home
                .replace("readthedocs.org", "app.readthedocs.org")
                .replace("readthedocs.com", "app.readthedocs.com")
                .replace("app.app.", "app."),
              "flyout",
            )}"
            >Project Home</a
          >
        </dd>
        <dd>
          <a
            href="${addUtmParameters(
              this.config.projects.current.urls.builds
                .replace("readthedocs.org", "app.readthedocs.org")
                .replace("readthedocs.com", "app.readthedocs.com")
                .replace("app.app.", "app."),
              "flyout",
            )}"
            >Builds</a
          >
        </dd>
      </dl>
    `;
  }

  renderDownloads() {
    if (!Object.keys(this.config.versions.current.downloads).length) {
      return nothing;
    }

    const nameDisplay = {
      pdf: "PDF",
      epub: "EPUB",
      htmlzip: "HTML",
    };

    return html`
      <dl class="downloads">
        <dt>Downloads</dt>
        ${Object.entries(this.config.versions.current.downloads).map(
          ([name, url]) =>
            html`<dd>
              <a href="${url}">${nameDisplay[name]}</a>
            </dd>`,
        )}
      </dl>
    `;
  }

  renderVersions() {
    if (
      !this.config.versions.active.length ||
      this.config.projects.current.versioning_scheme ===
        "single_version_without_translations"
    ) {
      return nothing;
    }

    const getVersionLink = (version) => {
      const url = getLinkWithFilename(version.urls.documentation);
      const link = html`<a href="${url}">${version.slug}</a>`;
      return this.config.versions.current.slug == version.slug
        ? html`<strong>${link}</strong>`
        : link;
    };

    return html`
      <dl class="versions">
        <dt>Versions</dt>
        ${this.config.versions.active.map(
          (version) => html`<dd>${getVersionLink(version)}</dd>`,
        )}
      </dl>
    `;
  }

  renderLanguages() {
    if (!this.config.projects.translations.length) {
      return nothing;
    }

    const getLanguageLink = (translation) => {
      const url = getLinkWithFilename(translation.urls.documentation);
      const link = html`<a href="${url}">${translation.language.code}</a>`;
      return this.config.projects.current.slug === translation.slug
        ? html`<strong>${link}</strong>`
        : link;
    };

    // Add the current project as "translation" and sort them based on language's code
    let translations = this.config.projects.translations.concat(
      this.config.projects.current,
    );
    translations = translations.sort((a, b) =>
      a.language.code.localeCompare(b.language.code),
    );

    return html`
      <dl class="languages">
        <dt>Languages</dt>
        ${translations.map(
          (translation) => html`<dd>${getLanguageLink(translation)}</dd>`,
        )}
      </dl>
    `;
  }

  updateCSSClasses() {
    this.classes = { container: true };
    this.classes[this.position] = true;
  }

  render() {
    // The element doesn't yet have our config, don't render it.
    if (this.config === null) {
      // nothing is a special Lit response type
      return nothing;
    }

    this.updateCSSClasses();

    return html`
      <div class=${classMap(this.classes)}>
        ${this.renderHeader()}
        <main class=${classMap({ closed: !this.opened })}>
          ${this.renderLanguages()} ${this.renderVersions()}
          ${this.renderDownloads()} ${this.renderReadTheDocs()}
          ${this.renderVCS()} ${this.renderSearch()}
          <hr />
          ${this.renderFooter()}
        </main>
      </div>
    `;
  }

  _showFlyout = (e) => {
    this.opened = true;
  };

  _hideFlyout = (e) => {
    this.opened = false;
  };

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(EVENT_READTHEDOCS_FLYOUT_SHOW, this._showFlyout);
    document.addEventListener(EVENT_READTHEDOCS_FLYOUT_HIDE, this._hideFlyout);
    window.addEventListener("click", this._onOutsideClick);
  }

  disconnectedCallback() {
    document.removeEventListener(
      EVENT_READTHEDOCS_FLYOUT_SHOW,
      this.showFlyout,
    );

    document.removeEventListener(
      EVENT_READTHEDOCS_FLYOUT_HIDE,
      this.hideFlyout,
    );
    window.removeEventListener("click", this._onOutsideClick);

    super.disconnectedCallback();
  }
}

/**
 * Flyout addon
 *
 * @param {Object} config - Addon configuration object
 */
export class FlyoutAddon extends AddonBase {
  static jsonValidationURI =
    "http://v1.schemas.readthedocs.org/addons.flyout.json";
  static addonEnabledPath = "addons.flyout.enabled";
  static addonName = "Flyout";

  constructor(config) {
    super();

    // If there are no elements found, inject one
    let elems = document.querySelectorAll("readthedocs-flyout");
    if (!elems.length) {
      elems = [new FlyoutElement()];

      // We cannot use `render(elems[0], document.body)` because there is a race conditions between all the addons.
      // So, we append the web-component first and then request an update of it.
      document.body.append(elems[0]);
      elems[0].requestUpdate();
    }

    for (const elem of elems) {
      elem.loadConfig(config);
    }
  }
}

customElements.define("readthedocs-flyout", FlyoutElement);
