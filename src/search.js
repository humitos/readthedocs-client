import { ajv } from "./data-validation";
import { library, icon } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleXmark,
  faClockRotateLeft,
  faMagnifyingGlass,
  faCircleNotch,
  faBinoculars,
  faBarsStaggered,
} from "@fortawesome/free-solid-svg-icons";
import READTHEDOCS_LOGO from "./images/logo-wordmark-dark.svg";

import styleSheet from "./search.css";
import { CLIENT_VERSION, AddonBase, debounce, addUtmParameters } from "./utils";
import {
  EVENT_READTHEDOCS_SEARCH_SHOW,
  EVENT_READTHEDOCS_SEARCH_HIDE,
} from "./events";
import { html, nothing, render, LitElement } from "lit";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { classMap } from "lit/directives/class-map.js";

// TODO: play more with the substring limit.
// The idea is to try to fit most of the results in one line.
const MAX_SUBSTRING_LIMIT = 80;
const FETCH_RESULTS_DELAY = 250;
const CLEAR_RESULTS_DELAY = 300;
const MIN_CHARACTERS_QUERY = 3;
const API_ENDPOINT = "/_/api/v3/search/";

// TODO: generate Domain results
// TODO: make the spinner to spin

export class SearchElement extends LitElement {
  static elementName = "readthedocs-search";

  static properties = {
    config: {
      state: true,
    },
    filters: { state: true },
    show: { state: true },
    inputIcon: { state: true },
    // NOTE: does it make sense to handle the query as a property that changes
    // on keydown?
    // query: { state: true },
    results: {
      state: true,
    },
    // Determine whether to hide recent searches. For example set it to true when the first
    // results are being fetched. Set it to false when the search query is removed.
    hideRecentSearches: { state: true },
    cssFormFocusClasses: { state: true },
    triggerKeycode: { type: Number, attribute: "trigger-keycode" },
    triggerSelector: { type: String, attribute: "trigger-selector" },
    triggerEvent: { type: String, attribute: "trigger-event" },
  };

  static styles = styleSheet;

  constructor() {
    super();

    library.add(faMagnifyingGlass);
    library.add(faCircleNotch);
    library.add(faBinoculars);
    library.add(faBarsStaggered);
    library.add(faCircleXmark);

    this.config = null;
    this.show = false;
    this.cssFormFocusClasses = {};
    this.results = null;
    this.inputIcon = icon(faMagnifyingGlass, { title: "Search docs" });
    this.currentQueryRequest = null;
    this.defaultFilter = null;
    this.filters = [];
    this.triggerKeycode = 191;
    this.triggerSelector = null;
    this.triggerEvent = "focusin";
    this.hideRecentSearches = false;
    this.recentSearchesLocalStorageKey = "readthedocsSearchRecentSearches";
    this.recentSearchesLocalStorageLimit = 20; // Control how many recent searches we store in localStorage
  }

  loadConfig(config) {
    // Validate the config object before assigning it to the Addon.
    // Later, ``render()`` method will check whether this object exists and (not) render
    // accordingly
    if (!SearchAddon.isEnabled(config)) {
      return;
    }

    this.config = config;
    if (this.config.addons.search) {
      this.defaultFilter = {
        name: "Default filter",
        value: this.config.addons.search.default_filter,
      };

      let userFilters = [];
      for (const filter of this.config.addons.search.filters) {
        userFilters.push({
          name: filter[0],
          value: filter[1],
        });
      }
      this.filters = userFilters;
    }
  }

  firstUpdated() {
    // Add CSS classes to the element on ``firstUpdated`` because we need the
    // HTML element to exist in the DOM before being able to add tag attributes.
    // See https://lit.dev/docs/components/lifecycle/#firstupdated
    // See https://stackoverflow.com/questions/43836886/failed-to-construct-customelement-error-when-javascript-file-is-placed-in-head
    this.className = this.className || "raised floating";
  }

  render() {
    // The element doesn't yet have our config, don't render it.
    if (this.config === null) {
      // nothing is a special Lit response type
      return nothing;
    }
    return this.renderSearchModal();
  }

  renderSearchModal() {
    return html`
      <div ?hidden=${!this.show} role="search">
        <div @click=${this.triggerCloseModal} class="background"></div>
        <div class="content">
          <form class=${classMap(this.cssFormFocusClasses)}>
            <label>${this.inputIcon.node[0]}</label>
            <input
              @input=${this.queryInput}
              @keydown=${this.selectResultKeyboard}
              @focusin=${this.queryInputFocus}
              @focusout=${this.queryInputFocus}
              placeholder="Search docs"
              type="search"
              autocomplete="off"
            />
          </form>
          ${this.renderFilters()}
          <div class="results">
            ${this.results || this.renderRecentSearches()}
          </div>
          <div class="footer">
            <ul class="help">
              <li><code>Enter</code> to select</li>
              <li><code>Up</code>/<code>Down</code> to navigate</li>
              <li><code>Esc</code> to close</li>
            </ul>
            <div class="credits">
              Search powered by
              <a
                href="${addUtmParameters(
                  "https://about.readthedocs.com/",
                  "search",
                )}"
              >
                <img src="${READTHEDOCS_LOGO}" alt="Read the Docs" />
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderNoResultsFound() {
    // TODO: change the icon to a slash-ed magnifier or similar
    const binoculars = icon(faBinoculars, {
      title: "Not found",
    });
    const query = this.getUserQuery();
    this.results = html`
      <div class="no-results">
        ${binoculars.node[0]}
        <p class="title">No results for <strong>"${query}"</strong></p>
        <div class="tips">
          <p>Try using the following special queries:</p>
          <ul>
            <li>
              <strong>Exact phrase</strong>: use double quotes to match a whole
              pharse: <code>"adding a subproject"</code>.
            </li>
            <li>
              <strong>Prefix</strong>: use an asterisk at the end of any term to
              prefix a result: <code>environ*</code>.
            </li>
            <li>
              <strong>Fuzziness</strong>: add a tilde and a number to indicate
              the fuzziness of the word: <code>getter~2</code>.
            </li>
          </ul>
        </div>

        <div class="footer">
          <p>
            Learn more about the query syntax supported in our
            <a
              target="_blank"
              href="https://docs.readthedocs.io/page/server-side-search/syntax.html"
              >documentation</a
            >.
          </p>
        </div>
      </div>
    `;
  }

  renderFilters() {
    if (!this.config.addons.search.filters.length) {
      return nothing;
    }

    // https://lit.dev/docs/components/events/#listening-to-events-fired-from-repeated-templates
    // https://lit.dev/docs/templates/lists/#repeating-templates-with-map
    return html`
      <div class="filters">
        <span class="filters-title">Filters</span>
        <ul>
          ${this.filters.map(
            (filter, index) => html`
              <li>
                <input
                  @click=${this.filterClicked}
                  id="filter-${index}"
                  type="checkbox"
                  value="${filter.value}"
                />
                <label for="filter-${index}"> ${filter.name} </label>
              </li>
            `,
          )}
        </ul>
      </div>
    `;
  }

  renderResults(data) {
    const listIcon = icon(faBarsStaggered, {
      title: "Result",
      classes: ["header", "icon"],
    });
    // JSON example from our production API
    // https://docs.readthedocs.io/_/api/v3/search/?q=project%3Adocs%2Fstable+build+customization
    this.results = html`
      <div class="hit">
        ${data.results.map(
          (result, rindex) =>
            html`<div class="hit-block">
              <a
                @click=${this.followResultLink}
                class="hit-block-heading"
                href="${result.path}"
              >
                <i>${listIcon.node[0]}</i>
                <h2>${result.title} ${this.renderExternalProject(result)}</h2>
              </a>

              ${result.blocks.map(
                (block, bindex) =>
                  html`${this.renderBlockResult(
                    block,
                    `${block.id}-${rindex}-${bindex}`,
                    result,
                  )}`,
              )}
            </div>`,
        )}
      </div>
    `;
  }

  followResultLink(e) {
    // Close the modal if the link is on the same page
    const event = new CustomEvent(EVENT_READTHEDOCS_SEARCH_HIDE);
    document.dispatchEvent(event);
  }

  renderBlockResult(block, index, result) {
    // TODO: take a substring of the title as well in case it's too long?
    let title = block.title;
    if (block.highlights.title.length) {
      title = unsafeHTML(block.highlights.title[0]);
    }

    let content = block.content.substring(0, MAX_SUBSTRING_LIMIT) + " ...";
    if (block.highlights.content.length) {
      // TODO: with this logic it could happen the highlighted part is outside of the substring
      if (content.length > MAX_SUBSTRING_LIMIT) {
        content = unsafeHTML(
          "... " +
            block.highlights.content[0].substring(0, MAX_SUBSTRING_LIMIT) +
            " ...",
        );
      } else {
        content = unsafeHTML(block.highlights.content[0]);
      }
    }

    return html`
      <a
        @mouseenter=${this.mouseenterResultHit}
        @click=${() => this.storeRecentSearch(block, result)}
        class="hit"
        href="${result.path}#${block.id}"
      >
        <div id="hit-${index}">
          <p class="hit subheading">${title}</p>
          <p class="hit content">${content}</p>
        </div>
      </a>
    `;
  }

  renderRecentSearches() {
    const recentSearches = this.getRecentSearches();
    if (!recentSearches || !recentSearches.length) {
      return html`<p>No recent searches</p>`;
    }

    if (this.hideRecentSearches) {
      return nothing;
    }
    recentSearches.reverse();
    const listIcon = icon(faClockRotateLeft, {
      title: "Result",
      classes: ["header", "icon"],
    });

    const xmark = icon(faCircleXmark, {
      title: "Clear recent search",
      classes: ["header", "icon"],
    });

    return html`
      <div class="hit">
        <p>Recent:</p>
        ${recentSearches.map(
          ({ block, result }) =>
            html`<div class="hit-block">
              <div class="hit-block-heading-container">
                <a class="hit-block-heading" href="${result.path}">
                  <i>${listIcon.node[0]}</i>
                  <h2>${result.title} ${this.renderExternalProject(result)}</h2>
                </a>
                <button
                  class="close-icon"
                  @click=${() => this.removeRecentSearch(block, result)}
                >
                  ${xmark.node[0]}
                </button>
              </div>

              ${html`${this.renderBlockResult(
                block,
                `recent-search-${block.id}`,
                result,
              )}`}
            </div>`,
        )}
      </div>
    `;
  }

  getLocalStorageKeyFromConfig(config) {
    const projectSlug = config.projects.current.slug;
    const languageCode = config.projects.current.language.code;
    const versionSlug = config.versions.current.slug;
    return `${projectSlug}-${languageCode}-${versionSlug}-recent-searches`;
  }

  getRecentSearches() {
    const localStorageKey = this.getLocalStorageKeyFromConfig(this.config);
    const recentSearches = SearchAddon.getLocalStorage()[localStorageKey];
    return recentSearches || [];
  }

  storeRecentSearch(block, result) {
    this.followResultLink();

    const recentSearches = this.getRecentSearches().filter((recentSearch) => {
      const b = recentSearch.block;
      const r = recentSearch.result;
      // Remove any duplicates, since this search result will be appended again
      return (
        r.domain !== result.domain || r.path !== r.path || b.id !== block.id
      );
    });

    recentSearches.push({ block, result });
    let recentSearchesLimited = recentSearches;
    // If we've stored more results than the limit, let's slice to get rid of the oldest result first
    if (recentSearches.length > this.recentSearchesLocalStorageLimit) {
      recentSearchesLimited = recentSearches.slice(
        recentSearches.length - this.recentSearchesLocalStorageLimit,
      );
    }

    const recentSearchesObject = {
      [this.getLocalStorageKeyFromConfig(this.config)]: recentSearches,
    };

    SearchAddon.setLocalStorage(recentSearchesObject);
  }

  removeRecentSearch(block, result) {
    const recentSearches = this.getRecentSearches().filter((recentSearch) => {
      const b = recentSearch.block;
      const r = recentSearch.result;
      // Return everything except this search result
      return (
        r.domain !== result.domain || r.path !== r.path || b.id !== block.id
      );
    });

    const recentSearchesObject = {
      [this.getLocalStorageKeyFromConfig(this.config)]: recentSearches,
    };

    SearchAddon.setLocalStorage(recentSearchesObject);
    this.requestUpdate();
  }

  renderExternalProject(result) {
    if (result.project.slug !== this.config.projects.current.slug) {
      return html`
        <small class="subtitle"> (from project ${result.project.slug}) </small>
      `;
    }
    return nothing;
  }

  closeModal(e) {
    this.show = false;
    // Blur the active element (which at this point will be input or the search element itself)
    // in order for the hotkeys to properly detect future hotkeys
    document.activeElement.blur();
  }

  showModal(e) {
    this.show = true;
  }

  updated(changedProperties) {
    // https://lit.dev/docs/components/shadow-dom/
    const input = this.shadowRoot.querySelector("input[type=search]");
    if (input !== undefined && input !== null) {
      input.focus();
    }
  }

  queryInputFocus(e) {
    if (e.type === "focusin") {
      this.cssFormFocusClasses = {
        focus: true,
      };
    } else if (e.type === "focusout") {
      this.cssFormFocusClasses = {
        focus: false,
      };
    }
  }

  selectNextResult(forward) {
    const all = this.renderRoot.querySelectorAll("a.hit");
    let selected;
    let selectedIndex;
    for (const [index, element] of all.entries()) {
      if (element.classList.contains("active")) {
        selected = element;
        selectedIndex = index;
        break;
      }
    }

    const lastIndex = all.length > 0 ? all.length - 1 : 0;

    let nextIndex = 0;
    if (selectedIndex !== undefined) {
      nextIndex = forward ? selectedIndex + 1 : selectedIndex - 1;
    }

    // Check if we're at the end/start of the list, and adjust accordingly
    if (nextIndex > lastIndex) {
      nextIndex = 0;
    } else if (nextIndex < 0) {
      nextIndex = lastIndex;
    }

    // Remove all active elements
    for (const active of this.renderRoot.querySelectorAll("a.hit.active")) {
      active.classList.remove("active");
    }

    // Add class for active element and scroll to it
    const newActive = all[nextIndex];
    newActive.classList.add("active");
    newActive.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }

  selectResultKeyboard(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.selectNextResult(true);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      this.selectNextResult(false);
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const selected = this.renderRoot.querySelector("a.hit.active");
      // if an item is selected, then redirect to its link
      if (selected !== null) {
        selected.click();
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      this.triggerCloseModal();
    }
  }

  getUserQuery() {
    return this.renderRoot.querySelector("input[type=search]").value;
  }

  showSpinIcon() {
    if (this.inputIcon.iconName !== "circle-notch") {
      this.inputIcon = icon(faCircleNotch, {
        title: "Spinner",
        classes: ["spinner", "fa-spin"],
      });
    }
  }

  showMagnifierIcon() {
    this.inputIcon = icon(faMagnifyingGlass, { title: "Search" });
  }

  removeAllResults() {
    this.results = null;
  }

  fetchResults(query) {
    this.removeAllResults();
    this.showSpinIcon();

    let deboucedFetchResults = () => {
      this.hideRecentSearches = true;
      let url =
        API_ENDPOINT + "?" + new URLSearchParams({ q: query }).toString();

      // Retrieve a static JSON file when working in development mode
      if (window.location.href.startsWith("http://localhost")) {
        url = "/_/readthedocs-search.json";
      }

      fetch(url, {
        method: "GET",
        headers: { "X-RTD-Hosting-Integrations-Version": CLIENT_VERSION },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error();
          }
          return response.json();
        })
        .then((data) => {
          if (data.results.length > 0) {
            this.renderResults(data);
          } else {
            this.renderNoResultsFound();
          }
          this.showMagnifierIcon();
        })
        .catch((error) => {
          // TODO: create a page similar to noResultsFound when there is an
          // error hitting the API.
          console.error(error);
          this.removeAllResults();
        });
    };

    return debounce(deboucedFetchResults, FETCH_RESULTS_DELAY);
  }

  getCurrentFilter() {
    let filters = [];
    const filterElements = this.renderRoot.querySelectorAll(
      ".filters input[type=checkbox]:checked",
    );
    for (const e of filterElements) {
      filters.push(e.value);
    }
    return filters.join(" ") || this.defaultFilter.value;
  }

  queryInput(e) {
    let query = this.getUserQuery();
    if (query.length >= MIN_CHARACTERS_QUERY) {
      if (this.currentQueryRequest !== null) {
        // cancel previous ajax request.
        this.currentQueryRequest.cancel();
      }
      const filter = this.getCurrentFilter();
      query = filter + " " + query;
      this.currentQueryRequest = this.fetchResults(query);
      this.currentQueryRequest();
    } else {
      // if the last request returns the results,
      // the suggestions list is generated even if there
      // is no query. To prevent that, this function
      // is debounced here.
      let func = () => {
        this.removeAllResults();
      };
      this.hideRecentSearches = false;
      debounce(func, CLEAR_RESULTS_DELAY)();
    }
  }

  filterClicked(e) {
    this.queryInput();
  }

  mouseenterResultHit(e) {
    const activeElements = this.renderRoot.querySelectorAll("a.hit.active");
    for (const element of activeElements) {
      element.classList.remove("active");
    }
  }

  triggerCloseModal() {
    const event = new CustomEvent(EVENT_READTHEDOCS_SEARCH_HIDE);
    document.dispatchEvent(event);
  }

  _handleCloseModal = (e) => {
    e.preventDefault();
    this.closeModal();
  };

  _handleShowModal = (e) => {
    e.preventDefault();
    this.showModal();
  };

  connectedCallback() {
    super.connectedCallback();

    // The READTHEDOCS_SEARCH_SHOW event is triggered by "readthedocs-flyout" input
    document.addEventListener(
      EVENT_READTHEDOCS_SEARCH_SHOW,
      this._handleShowModal,
    );
    document.addEventListener(
      EVENT_READTHEDOCS_SEARCH_HIDE,
      this._handleCloseModal,
    );
  }

  disconnectedCallback() {
    document.removeEventListener(
      EVENT_READTHEDOCS_SEARCH_SHOW,
      this._handleShowModal,
    );

    document.removeEventListener(
      EVENT_READTHEDOCS_SEARCH_HIDE,
      this._handleCloseModal,
    );

    super.disconnectedCallback();
  }
}

export class SearchAddon extends AddonBase {
  static jsonValidationURI =
    "http://v1.schemas.readthedocs.org/addons.search.json";
  static addonEnabledPath = "addons.search.enabled";
  static addonName = "Search";
  static enabledOnHttpStatus = [200, 404];

  constructor(config) {
    super();

    // If there are no elements found, inject one
    let elems = document.querySelectorAll("readthedocs-search");
    if (!elems.length) {
      elems = [new SearchElement()];

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

customElements.define("readthedocs-search", SearchElement);
