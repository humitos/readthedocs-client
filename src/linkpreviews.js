import { html, nothing, render, LitElement } from "lit";
import styleSheet from "./linkpreviews.css";

import { AddonBase, domReady, CLIENT_VERSION, IS_TESTING } from "./utils";
import {
  computePosition,
  autoPlacement,
  shift,
  offset,
  arrow,
} from "@floating-ui/dom";
import { default as objectPath } from "object-path";

const SHOW_TOOLTIP_DELAY = 300;
const HIDE_TOOLTIP_DELAY = 300;
const TOOLTIP_DATA_HREF = "data-linkpreview-href";

function setupTooltip(el, doctoolname, doctoolversion) {
  // Take the provided element and setup the listeners required to
  // make the linkpreviews work

  const anchorElement = el;
  let relatedTooltip;

  el.addEventListener("mouseenter", delayShowTooltip);
  el.addEventListener("mouseleave", delayHideTooltip);

  let showTooltipTimeoutId = null;
  let hideTooltipTimeoutId = null;

  function delayShowTooltip() {
    if (showTooltipTimeoutId === null) {
      showTooltipTimeoutId = setTimeout(() => {
        showTooltip();
      }, SHOW_TOOLTIP_DELAY);
    }
    // If there is a timeout on hiding, cancel it, otherwise it could hide a newly shown tooltip
    cancelHideDelay();
  }

  function cancelHideDelay() {
    if (hideTooltipTimeoutId !== null) {
      clearTimeout(hideTooltipTimeoutId);
      hideTooltipTimeoutId = null;
    }
  }

  function cancelShowDelay() {
    if (showTooltipTimeoutId !== null) {
      clearTimeout(showTooltipTimeoutId);
      showTooltipTimeoutId = null;
    }
  }

  function delayHideTooltip() {
    cancelShowDelay();
    const tooltip = getRelatedTooltip();
    if (hideTooltipTimeoutId === null) {
      hideTooltipTimeoutId = setTimeout(() => {
        hideTooltip();
      }, HIDE_TOOLTIP_DELAY);
    }
  }

  function showTooltip() {
    // First hide any other linkpreviews
    const existingLinkPreviews = document.querySelectorAll(
      `div[${TOOLTIP_DATA_HREF}]`,
    );
    existingLinkPreviews.forEach((tooltip) => (tooltip.style.display = "none"));

    // Then get the tooltip for this element, place it correctly and show it
    const newTooltip = getRelatedTooltip();

    if (newTooltip !== undefined) {
      const url = getEmbedURL(anchorElement.href);

      fetch(url, {
        method: "GET",
        headers: {
          "X-RTD-Hosting-Integrations-Version": CLIENT_VERSION,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Error hitting Read the Docs embed API");
          }
          return response.json();
        })
        .then((data) => {
          // TODO: decide whether or not to truncate the content
          // Do we want to have "modals" as well? are those useful?
          const content = data["content"];
          newTooltip.firstChild.innerHTML = content;
          newTooltip.style.display = "flex";
          const arrowElement = newTooltip.querySelector(".arrow");
          computePosition(anchorElement, newTooltip, {
            placement: "right",
            middleware: [
              offset(10),
              autoPlacement(),
              shift({
                padding: 10, // 0 by default
              }),
              arrow({ element: arrowElement }),
            ],
          }).then(({ x, y, middlewareData, placement }) => {
            Object.assign(newTooltip.style, {
              left: `${x}px`,
              top: `${y}px`,
            });
            const { x: arrowX, y: arrowY } = middlewareData.arrow;
            const staticSide = {
              top: "bottom",
              right: "left",
              bottom: "top",
              left: "right",
            }[placement.split("-")[0]];

            Object.assign(arrowElement.style, {
              left: arrowX != null ? `${arrowX}px` : "",
              top: arrowY != null ? `${arrowY}px` : "",
              right: "",
              bottom: "",
              [staticSide]: "-4px",
            });
          });
          newTooltip.classList.remove("hide");
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }

  function hideTooltip() {
    const tooltip = getRelatedTooltip();
    cancelShowDelay();
    tooltip.style.display = "";
  }

  function getRelatedTooltip() {
    // Return relatedTooltip, if already set, otherwise find it in DOM
    // or create a new one
    if (relatedTooltip) {
      return relatedTooltip;
    }

    const existingTooltip = anchorElement.parentElement.querySelector(
      `div[${TOOLTIP_DATA_HREF}="${anchorElement.href}"]`,
    );
    if (existingTooltip) {
      relatedTooltip = existingTooltip;
      return existingTooltip;
    } else {
      const newTooltip = document.createElement("div");
      newTooltip.insertAdjacentHTML("afterbegin", '<div class="arrow"></div>');
      newTooltip.insertAdjacentHTML(
        "afterbegin",
        '<div class="tooltip-content">Loading...</div>',
      );
      newTooltip.setAttribute(TOOLTIP_DATA_HREF, anchorElement.href);
      newTooltip.classList.add("tooltip");
      anchorElement.insertAdjacentElement("afterend", newTooltip);
      // Let's add event listeners on the tooltip as well, to prevent hiding, when
      // mouse moves away from the anchor element
      newTooltip.addEventListener("mouseenter", cancelHideDelay);
      newTooltip.addEventListener("mouseleave", delayHideTooltip);
      relatedTooltip = newTooltip;
      return newTooltip;
    }
  }

  function getEmbedURL(url) {
    const params = {
      url: url,
    };

    if (doctoolname !== null) {
      params["doctool"] = doctoolname;
    }

    if (doctoolversion !== null) {
      params["doctoolversion"] = doctoolversion;
    }

    const api_url =
      "/_/api/v3/embed/?" + new URLSearchParams(params).toString();
    return api_url;
  }
}

/**
 * LinkPreviews addon
 *
 * @param {Object} config - Addon configuration object
 */
export class LinkPreviewsAddon extends AddonBase {
  static jsonValidationURI =
    "http://v1.schemas.readthedocs.org/addons.linkpreviews.json";
  static addonEnabledPath = "addons.linkpreviews.enabled";
  static addonName = "LinkPreviews";

  constructor(config) {
    super();
    this.config = config;

    if (!IS_TESTING) {
      // Include CSS into the DOM so they can be read.
      document.adoptedStyleSheets.push(styleSheet);
    }

    // Autodetect if the page is built with Sphinx and send the `doctool=` attribute in that case.
    let doctoolName = "unknown";
    const sphinxHtmlElement = document.querySelector(
      "html[data-content_root], html.writer-html5",
    );
    if (sphinxHtmlElement) {
      doctoolName = "sphinx";
    }

    // TODO: decide what's the correct selector.
    // Our Sphinx extension is adding a class depending on the configuration.
    // However, we won't have this for other doctools or when the extension is not installed.
    const rootSelector = this.config.addons.options.root_selector;

    let selector;
    if (doctoolName === "sphinx") {
      selector = `:is(${rootSelector}) a.internal`;
    } else {
      // Fallback to a more generic selector that only accepts links inside paragraphs.
      selector = `:is(${rootSelector}) p a`;
    }
    console.debug(
      `${LinkPreviewsAddon.addonName}: Using '${selector}' as CSS selector.`,
    );

    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      try {
        // Do not create Link Previews on elements where:
        //
        //  1. The hostname is outside the current domain
        //  2. The URL points to the same page the user is reading
        let elementUrl = new URL(element.href);
        let elementHostname = elementUrl.hostname;
        const pointToSamePage =
          window.location.pathname.replace("/index.html", "") ==
          elementUrl.pathname.replace("/index.html");
        if (elementHostname === window.location.hostname && !pointToSamePage) {
          element.classList.add("link-preview");
          setupTooltip(element, doctoolName, null);
        }
      } catch (error) {
        console.debug(
          `Skipping link preview on element due to invalid URL: ${element}`,
        );
      }
    }
  }
}
