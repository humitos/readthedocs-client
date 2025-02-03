import { ajv } from "./data-validation";
import { AddonBase } from "./utils";
import { default as objectPath } from "object-path";
import styleSheet from "./ethicalads.css";
import { IS_TESTING, docTool } from "./utils.js";

// https://docs.readthedocs.io/en/stable/advertising/ad-customization.html#controlling-the-placement-of-an-ad
const EXPLICIT_PLACEMENT_SELECTORS = [
  "#ethical-ad-placement",
  "[data-ea-publisher]",
];

// https://ethical-ad-client.readthedocs.io/en/latest/
const AD_PLACEMENT_BOTTOM = "90px";
const AD_SIZE = 300; // pixels
const AD_SCRIPT_ID = "ethicaladsjs";

/**
 * EthicalAds addon
 *
 * Show an ad in the documentation page.
 *
 * Read more at:
 *  - https://docs.readthedocs.io/en/stable/advertising/ethical-advertising.html
 *
 * @param {Object} config - Addon configuration object
 */
export class EthicalAdsAddon extends AddonBase {
  static jsonValidationURI =
    "http://v1.schemas.readthedocs.org/addons.ethicalads.json";
  static addonEnabledPath = "addons.ethicalads.enabled";
  static addonName = "EthicalAds";

  loadConfig(config) {
    this.config = config;

    // Do not add another ad if we already added one
    if (document.querySelector(`#${AD_SCRIPT_ID}`) !== null) {
      return;
    }

    this.injectEthicalAds();
  }

  createAdPlacement() {
    let placement;

    // TODO: fix this on testing. It works fine on production/regular browser.
    // TypeError: Failed to execute 'indexed value' on 'ObservableArray<CSSStyleSheet>': Failed to convert value to 'CSSStyleSheet'.
    if (!IS_TESTING) {
      // Include CSS into the DOM so they can be read.
      document.adoptedStyleSheets.push(styleSheet);
    }

    for (const explicitSelector of EXPLICIT_PLACEMENT_SELECTORS) {
      placement = document.querySelector(explicitSelector);
      if (placement) break;
    }

    if (placement) {
      if (
        placement.getAttribute("data-ea-type") !== "image" &&
        placement.getAttribute("data-ea-type") !== "text"
      ) {
        placement.setAttribute("data-ea-type", "readthedocs-sidebar");
      }
    } else {
      // Inject our own floating element
      placement = document.createElement("div");
      placement.setAttribute("id", "readthedocs-ea");
      placement.classList.add("raised");

      // Define where to inject the Ad based on the theme and if it's above the fold or not.
      let selector;
      let element;
      let knownPlacementFound = false;

      if (docTool.isSphinxReadTheDocsLikeTheme()) {
        selector = "nav.wy-nav-side > div.wy-side-scroll";
        element = document.querySelector(selector);

        if (this.elementAboveTheFold(element)) {
          placement.setAttribute("data-ea-type", "readthedocs-sidebar");
          placement.classList.add("ethical-rtd");
          placement.classList.add("ethical-dark-theme");
          knownPlacementFound = true;
        }
      } else if (docTool.isSphinxFuroLikeTheme()) {
        // NOTE: The code to handle furo theme shouldn't be required,
        // since furo uses explicit placement.
        // However, the Jinja context variable READTHEDOCS is not injected anymore,
        // and furo does not includes the explicit placement due to this.
        // This is a temporal solution while they fix this.
        selector = ".sidebar-tree";
        element = document.querySelector(selector);

        if (this.elementAboveTheFold(element)) {
          placement.classList.add("ethical-alabaster");
          placement.setAttribute("data-ea-type", "readthedocs-sidebar");
          placement.setAttribute("id", "furo-sidebar-ad-placement");
          knownPlacementFound = true;
        }
      } else if (docTool.isSphinxBookThemeLikeTheme()) {
        selector = ".sidebar-primary-items__start.sidebar-primary__section";
        element = document.querySelector(selector);

        if (this.elementAboveTheFold(element)) {
          placement.classList.add("ethical-alabaster");
          placement.setAttribute("data-ea-type", "readthedocs-sidebar");
          knownPlacementFound = true;
        }
      } else if (docTool.isSphinxAlabasterLikeTheme()) {
        selector = "div.sphinxsidebar > div.sphinxsidebarwrapper";
        element = document.querySelector(selector);

        if (this.elementAboveTheFold(element)) {
          placement.classList.add("ethical-alabaster");
          placement.setAttribute("data-ea-type", "readthedocs-sidebar");
          knownPlacementFound = true;
        }
      } else if (docTool.isMaterialMkDocsTheme()) {
        selector = ".md-sidebar__scrollwrap";
        element = document.querySelector(selector);

        if (this.elementAboveTheFold(element)) {
          // TODO: use a more styled CSS class.
          // See https://github.com/readthedocs/ethical-ad-client/issues/193
          placement.classList.add("ethical-alabaster");

          placement.setAttribute("data-ea-type", "readthedocs-sidebar");
          knownPlacementFound = true;
        }
      } else if (docTool.isDocusaurusTheme()) {
        selector = ".menu.thin-scrollbar.menu_SIkG";
        element = document.querySelector(selector);

        if (this.elementAboveTheFold(element)) {
          // TODO: use a more styled CSS class.
          // See https://github.com/readthedocs/ethical-ad-client/issues/193
          placement.classList.add("ethical-alabaster");
          placement.classList.add("ethical-docusaurus");

          placement.setAttribute("data-ea-type", "readthedocs-sidebar");
          placement.setAttribute("data-ea-style", "image");
          knownPlacementFound = true;
        }
      } else if (docTool.isDocsify()) {
        selector = "main > aside > div.sidebar-nav";
        element = document.querySelector(selector);

        if (this.elementAboveTheFold(element)) {
          placement.classList.add("ethical-alabaster");
          placement.classList.add("ethical-docsify");

          placement.setAttribute("data-ea-type", "readthedocs-sidebar");
          placement.setAttribute("data-ea-style", "image");
          knownPlacementFound = true;
        }
      } else if (docTool.isAntora()) {
        selector = "aside nav.nav-menu";
        element = document.querySelector(selector);

        if (this.elementAboveTheFold(element)) {
          placement.classList.add("ethical-alabaster");

          placement.setAttribute("data-ea-type", "readthedocs-sidebar");
          placement.setAttribute("data-ea-style", "image");
          knownPlacementFound = true;
        }
      } else if (docTool.isMdBook()) {
        selector = "nav#sidebar mdbook-sidebar-scrollbox";
        element = document.querySelector(selector);

        if (this.elementAboveTheFold(element)) {
          placement.classList.add("ethical-alabaster");

          placement.setAttribute("data-ea-type", "readthedocs-sidebar");
          placement.setAttribute("data-ea-style", "image");
          knownPlacementFound = true;
        }
      } else if (docTool.isVitePress()) {
        selector = "aside";
        element = document.querySelector(selector);

        if (this.elementAboveTheFold(element)) {
          placement.classList.add("ethical-alabaster");

          placement.setAttribute("data-ea-type", "readthedocs-sidebar");
          placement.setAttribute("data-ea-style", "image");
          knownPlacementFound = true;
        }
      }

      if (selector && knownPlacementFound) {
        const elementToAppend = document.querySelector(selector);
        if (elementToAppend) {
          elementToAppend.append(placement);
        }
      } else if (window.innerWidth > 1300) {
        // https://ethical-ad-client.readthedocs.io/en/latest/#stickybox
        placement.setAttribute("data-ea-type", "image");
        placement.setAttribute("data-ea-style", "stickybox");
        this.addEaPlacementToElement(placement);
        // `document.body` here is not too much relevant, since we are going to
        // use this selector only for a floating stickybox ad
        const elementInsertBefore = document.body;
        elementInsertBefore.insertBefore(
          placement,
          elementInsertBefore.lastChild,
        );
      }
    }

    // Optional attributes coming from the API JSON response.
    // We get them if exists or return default values otherwise.
    const data = this.config.addons.ethicalads;
    const keywords = objectPath.get(data, "keywords", []);
    const campaign_types = objectPath.get(data, "campaign_types", []);

    if (placement !== null) {
      // This ensure us that all the `data-ea-*` attributes are already set in the HTML tag.
      placement.setAttribute("data-ea-manual", "true");

      // Set the keyword, campaign data, and publisher
      placement.setAttribute("data-ea-publisher", data.publisher);

      if (keywords.length) {
        placement.setAttribute("data-ea-keywords", keywords.join("|"));
      }
      if (campaign_types.length) {
        placement.setAttribute(
          "data-ea-campaign-types",
          campaign_types.join("|"),
        );
      }
    }

    return placement;
  }

  elementAboveTheFold(element) {
    // Determine if this element would be above the fold.
    // If this is off screen, instead create an ad in the footer.
    // Assumes the ad would be AD_SIZE pixels high.
    const div = document.createElement("div");

    // Append a temporary element to check if it's visible on the screen.
    element.append(div);
    const offsetTop = div.offsetTop;
    div.remove();

    if (
      !offsetTop ||
      offsetTop - window.scrollY + AD_SIZE > window.innerHeight
    ) {
      return false;
    }

    return true;
  }

  addEaPlacementToElement(element) {
    // Add `ea-placement-bottom` to the element only if the flyout is enabled.
    const flyoutEnabled = objectPath.get(
      this.config,
      "addons.flyout.enabled",
      false,
    );
    if (flyoutEnabled) {
      element.setAttribute("data-ea-placement-bottom", AD_PLACEMENT_BOTTOM);
    }
  }

  loadEthicalAdLibrary() {
    const library = document.createElement("script");
    library.setAttribute("id", AD_SCRIPT_ID);
    library.setAttribute("type", "text/javascript");
    library.setAttribute("async", true);

    // TODO: inject the stable version after we have tested this.
    // Inject the Ethical Ad client (beta) only for our own documentation.
    let src;
    if (
      window.location.hostname === "docs.readthedocs.io" ||
      window.location.hostname.endsWith(".devthedocs.org")
    ) {
      src = "https://media.ethicalads.io/media/client/beta/ethicalads.min.js";
    } else {
      src = "https://media.ethicalads.io/media/client/ethicalads.min.js";
    }

    library.setAttribute("src", src);
    document.head.appendChild(library);

    document.getElementById(AD_SCRIPT_ID).addEventListener("load", function () {
      if (typeof ethicalads !== "undefined") {
        ethicalads.load();
      }
    });
  }

  addWidthListener() {
    // Hide ad when the window is smaller than the stickybox width
    const placement = document.querySelector("#readthedocs-ea");
    if (placement && placement.dataset.eaStyle === "stickybox") {
      window.addEventListener("resize", function () {
        if (window.innerWidth <= 1300) {
          placement.style.display = "none";
        } else {
          placement.style.display = "";
        }
      });
    }
  }

  injectEthicalAds() {
    // Create the placement first and after that load the EthicalAd library.
    // This will automatically "load_placement" and render the ad properly.
    this.createAdPlacement();
    this.addWidthListener();
    this.loadEthicalAdLibrary();
  }

  static isEnabled(config, httpStatus) {
    return (
      super.isEnabled(config, httpStatus) &&
      config.addons.ethicalads.ad_free === false
    );
  }
}
