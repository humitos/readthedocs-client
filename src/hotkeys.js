import { toString as keyboardEventToString } from "keyboard-event-to-string";

import { AddonBase } from "./utils";
import { LitElement } from "lit";
import {
  EVENT_READTHEDOCS_SEARCH_SHOW,
  EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW,
  EVENT_READTHEDOCS_DOCDIFF_HIDE,
} from "./events";

export class HotKeysElement extends LitElement {
  static elementName = "readthedocs-hotkeys";

  static properties = {
    config: {
      state: true,
    },
    enabled: {
      type: Boolean,
    },
  };

  constructor() {
    super();

    this.config = null;
  }

  loadConfig(config) {
    // Validate the config object before assigning it to the Addon.
    // Later, ``render()`` method will check whether this object exists and (not) render
    // accordingly
    if (!HotKeysAddon.isEnabled(config)) {
      return;
    }

    this.config = config;

    this.docDiffHotKeyEnabled = this.config.addons.hotkeys.doc_diff.enabled;
    this.docDiffEnabled = false;

    this.searchHotKeyEnabled = this.config.addons.hotkeys.search.enabled;
  }

  _handleKeydown = (e) => {
    // Close docdiff with single-stroke `d` (no Ctrl, no Shift, no Alt and no Meta)
    // (I'm checking `document.activeElement` to check if it not inside an INPUT to avoid enable/disable while typing on forms)
    // Read more about these decisions at https://github.com/readthedocs/addons/issues/80

    let event;

    // DocDiff
    if (
      this.docDiffHotKeyEnabled &&
      keyboardEventToString(e) ===
        this.config.addons.hotkeys.doc_diff.trigger &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA" &&
      document.activeElement.tagName !== "READTHEDOCS-SEARCH"
    ) {
      if (this.docDiffEnabled) {
        event = new CustomEvent(EVENT_READTHEDOCS_DOCDIFF_HIDE);
      } else {
        event = new CustomEvent(EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW);
      }
    }

    // Search
    if (
      this.searchHotKeyEnabled &&
      keyboardEventToString(e) === this.config.addons.hotkeys.search.trigger &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA" &&
      document.activeElement.tagName !== "READTHEDOCS-SEARCH"
    ) {
      event = new CustomEvent(EVENT_READTHEDOCS_SEARCH_SHOW);
    }

    // Send event for all keydown events
    if (event !== undefined) {
      document.dispatchEvent(event);
      e.preventDefault();
    }
  };

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("keydown", this._handleKeydown);
    document.addEventListener(
      EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW,
      this._handleDocDiffShow,
    );
    document.addEventListener(
      EVENT_READTHEDOCS_DOCDIFF_HIDE,
      this._handleDocDiffHide,
    );
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._handleKeydown);
    document.removeEventListener(
      EVENT_READTHEDOCS_DOCDIFF_ADDED_REMOVED_SHOW,
      this._handleDocDiffShow,
    );
    document.removeEventListener(
      EVENT_READTHEDOCS_DOCDIFF_HIDE,
      this._handleDocDiffHide,
    );
    super.disconnectedCallback();
  }

  _handleDocDiffShow = (event) => {
    this.docDiffEnabled = true;
  };

  _handleDocDiffHide = (event) => {
    this.docDiffEnabled = false;
  };
}

export class HotKeysAddon extends AddonBase {
  static jsonValidationURI =
    "http://v1.schemas.readthedocs.org/addons.hotkeys.json";
  static addonEnabledPath = "addons.hotkeys.enabled";
  static addonName = "HotKeys";
  static elementClass = HotKeysElement;
}

customElements.define(HotKeysElement.elementName, HotKeysElement);
