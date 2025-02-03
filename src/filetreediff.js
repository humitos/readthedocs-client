import { library, icon } from "@fortawesome/fontawesome-svg-core";
import { faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { html, nothing, LitElement } from "lit";
import { default as objectPath } from "object-path";
import styleSheet from "./filetreediff.css";
import { DOCDIFF_URL_PARAM } from "./docdiff.js";
import {
  EVENT_READTHEDOCS_ROOT_DOM_CHANGED,
  EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW,
  EVENT_READTHEDOCS_DOCDIFF_HIDE,
} from "./events";
import { hasQueryParam } from "./utils";

import { AddonBase } from "./utils";

const SCROLL_OFFSET_Y = 0.1;

export class FileTreeDiffElement extends LitElement {
  static elementName = "readthedocs-filetreediff";

  static properties = {
    config: { state: true },
    docDiffEnabled: { state: true },
    chunks: { state: true },
    chunkIndex: { state: true },
  };

  static styles = styleSheet;

  constructor() {
    super();
    this.config = null;
    this.docDiffEnabled = false;

    this.chunkIndex = null;
    this.chunks = [];
    this.chunkTagSelector = [
      // We may want to add more selectors here as we find them.
      "h1",
      "h2",
      "h3",
      "p",
      "dl",
      "table",
      "pre",
    ];
    this.chunkPseudoSelector = [
      ":has(.doc-diff-added)",
      ":has(.doc-diff-removed)",
    ];

    this.chunkSelector = [];
    for (let selector of this.chunkTagSelector) {
      for (let pseudo of this.chunkPseudoSelector) {
        this.chunkSelector.push(`${selector}${pseudo}`);
      }
    }
    this.chunkSelector = this.chunkSelector.join(", ");
    console.log(this.chunkSelector);

    library.add(faArrowDown);
    library.add(faArrowUp);

    this.iconArrowUp = icon(faArrowUp, {
      classes: ["icon"],
    });
    this.iconArrowDown = icon(faArrowDown, {
      classes: ["icon"],
    });
  }

  loadConfig(config) {
    if (!FileTreeDiffAddon.isEnabled(config)) {
      return;
    }
    this.config = config;
  }

  handleFileChange(event) {
    const fileUrl = event.target.value;
    if (fileUrl) {
      const url = new URL(fileUrl);
      // Only add the diff parameter if diff is currently enabled
      if (this.docDiffEnabled) {
        url.searchParams.set(DOCDIFF_URL_PARAM, "true");
      }
      window.location.href = url.toString();
    }
  }

  handleToggleDiff(event) {
    if (event.target.checked) {
      document.dispatchEvent(
        new CustomEvent(EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW),
      );
    } else {
      document.dispatchEvent(new CustomEvent(EVENT_READTHEDOCS_DOCDIFF_HIDE));
    }
  }

  getCurrentPageUrl() {
    // Remove any query parameters to match against file URLs
    const currentPath = window.location.pathname;
    const currentOrigin = window.location.origin;
    return `${currentOrigin}${currentPath}`;
  }

  renderArrows() {
    if (!this.docDiffEnabled) {
      return nothing;
    }
    console.log("chunkIndex", this.chunkIndex);
    console.log("chunks.length", this.chunks.length);
    console.log("chunks", this.chunks);

    return html`
      <span>${this.chunkIndex + 1 || 0} of ${this.chunks.length || 0}</span>
      <span @click=${this.previousChunk}> ${this.iconArrowUp.node[0]} </span>
      <span @click=${this.nextChunk}> ${this.iconArrowDown.node[0]} </span>
    `;
  }

  renderDocDiff() {
    if (objectPath.get(this.config, "addons.doc_diff.enabled", false)) {
      return html`
        <label>
          <input
            type="checkbox"
            .checked=${this.docDiffEnabled}
            @change=${this.handleToggleDiff}
          />
          Show diff
        </label>
        ${this.renderArrows()}
      `;
    }
    return nothing;
  }

  previousChunk() {
    if (!this.chunks.length) {
      return;
    }
    if (this.chunkIndex === null) {
      this.chunkIndex = 0;
    } else if (this.chunkIndex != 0) {
      this.chunkIndex -= 1;
    }

    const chunk = this.chunks[this.chunkIndex];
    this.scrollToChunk(chunk);
  }

  nextChunk() {
    if (!this.chunks.length) {
      return;
    }
    if (this.chunkIndex === null) {
      this.chunkIndex = 0;
    } else if (this.chunkIndex != this.chunks.length - 1) {
      this.chunkIndex += 1;
    }

    const chunk = this.chunks[this.chunkIndex];
    this.scrollToChunk(chunk);
  }

  scrollToChunk(chunk) {
    for (const elem of document.querySelectorAll(".doc-diff-chunk-selected")) {
      elem.classList.remove("doc-diff-chunk-selected");
    }

    chunk.classList.add("doc-diff-chunk-selected");

    console.log("chunk offset", chunk.offsetTop);
    globalThis.scrollTo({
      top:
        chunk.getBoundingClientRect().top -
        window.innerHeight * SCROLL_OFFSET_Y, // Y-axis
      behavior: "smooth",
    });
  }

  render() {
    const diffData = objectPath.get(this.config, "addons.filetreediff.diff");
    if (!diffData) {
      return nothing;
    }

    const currentUrl = this.getCurrentPageUrl();
    const renderSection = (files, label) => {
      if (!files.length) return nothing;
      const emoji = label === "Added" ? "+ " : "± ";
      return html`
        <optgroup label="${label}">
          ${files.map(
            (f) => html`
              <option
                value=${f.urls.current}
                ?selected=${f.urls.current === currentUrl}
              >
                ${emoji}${f.filename}
              </option>
            `,
          )}
        </optgroup>
      `;
    };

    const hasCurrentFile = [...diffData.added, ...diffData.modified].some(
      (f) => f.urls.current === currentUrl,
    );

    return html`
      <div>
        <div>
          ${this.renderDocDiff()}
          <select @change=${this.handleFileChange}>
            <option value="" ?selected=${!hasCurrentFile} disabled>
              Files changed
            </option>
            ${renderSection(diffData.added, "Added")}
            ${renderSection(diffData.modified, "Changed")}
          </select>
        </div>
      </div>
    `;
  }

  _handleDocDiffShow = (event) => {
    this.docDiffEnabled = true;
  };

  _handleDocDiffHide = (event) => {
    this.docDiffEnabled = false;
  };

  _handleRootDOMChanged = (event) => {
    // Update the list of chunks when the DOM changes
    this.chunks = document.querySelectorAll(this.chunkSelector);
    if (this.chunkIndex === null || this.chunkIndex === 0) {
      this.chunkIndex = 0;
      if (this.chunks.length) {
        this.scrollToChunk(this.chunks[0]);
      }
    }
  };

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(
      EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW,
      this._handleDocDiffShow,
    );
    document.addEventListener(
      EVENT_READTHEDOCS_DOCDIFF_HIDE,
      this._handleDocDiffHide,
    );
    document.addEventListener(
      EVENT_READTHEDOCS_ROOT_DOM_CHANGED,
      this._handleRootDOMChanged,
    );
  }

  disconnectedCallback() {
    document.removeEventListener(
      EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW,
      this._handleDocDiffShow,
    );
    document.removeEventListener(
      EVENT_READTHEDOCS_DOCDIFF_HIDE,
      this._handleDocDiffHide,
    );
    document.removeEventListener(
      EVENT_READTHEDOCS_ROOT_DOM_CHANGED,
      this._handleRootDOMChanged,
    );
    super.disconnectedCallback();
  }
}

/**
 * File Tree Diff addon
 *
 * UNDER DEVELOPMENT.
 *
 * Currently, this addon shows in the console all the file changed compared to
 * the LATEST version of the project.
 *
 * @param {Object} config - Addon configuration object
 */
export class FileTreeDiffAddon extends AddonBase {
  static jsonValidationURI =
    "http://v1.schemas.readthedocs.org/addons.filetreediff.json";
  static addonEnabledPath = "addons.filetreediff.enabled";
  static addonName = "File Tree Diff";

  constructor(config) {
    super();
    this.config = config;

    let elems = document.querySelectorAll("readthedocs-filetreediff");
    if (!elems.length) {
      elems = [new FileTreeDiffElement()];
      document.body.append(elems[0]);
      elems[0].requestUpdate();
    }

    for (const elem of elems) {
      elem.loadConfig(config);
    }
  }
}

customElements.define("readthedocs-filetreediff", FileTreeDiffElement);
