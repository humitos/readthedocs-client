import { default as fetch } from "unfetch";
import {
  EVENT_READTHEDOCS_ADDONS_DATA_READY,
  ReadTheDocsEventData,
} from "./events";
import {
  CLIENT_VERSION,
  IS_TESTING,
  ADDONS_API_VERSION,
  ADDONS_API_ENDPOINT,
} from "./utils";

/**
 * Get the Read the Docs API version supported by user's integrations.
 *
 */
export function getMetadataAddonsAPIVersion() {
  const meta = document.querySelector(
    "meta[name=readthedocs-addons-api-version]",
  );
  if (meta !== null) {
    return meta.getAttribute("content");
  }
  return undefined;
}

/**
 * Get the Addons API endpoint URL to hit.
 *
 * It uses META HTML tags to get project/version slugs and `sendUrlParam` to
 * decide whether or not sending `url=`.
 */
function _getApiUrl(sendUrlParam, apiVersion) {
  const metaProject = document.querySelector(
    "meta[name='readthedocs-project-slug']",
  );
  const metaVersion = document.querySelector(
    "meta[name='readthedocs-version-slug']",
  );

  let projectSlug;
  let versionSlug;
  let params = {
    "client-version": CLIENT_VERSION,
    "api-version": apiVersion,
  };

  if (sendUrlParam) {
    params["url"] = window.location.href;
  }

  if (metaProject && metaVersion) {
    projectSlug = metaProject.content;
    versionSlug = metaVersion.content;

    params["project-slug"] = projectSlug;
    params["version-slug"] = versionSlug;
  }

  let url = ADDONS_API_ENDPOINT + "?" + new URLSearchParams(params);

  // Retrieve a static JSON file when working in development mode
  if (window.location.href.startsWith("http://localhost") && !IS_TESTING) {
    url = "/_/readthedocs-addons.json";
  }

  return url;
}

function getReadTheDocsUserConfig(sendUrlParam) {
  // Create a Promise here to handle the user request in a different async task.
  // This allows us to start executing our integration independently from the user one.
  return new Promise((resolve, reject) => {
    // Note we force the user to define the `<meta>` tag to be able to use Read the Docs data directly.
    // This is to keep forward/backward compatibility without breaking integrations.
    const metadataAddonsAPIVersion = getMetadataAddonsAPIVersion();

    if (
      metadataAddonsAPIVersion !== undefined &&
      metadataAddonsAPIVersion !== ADDONS_API_VERSION
    ) {
      // When the addons API version doesn't match the one defined via `<meta>` tag by the user,
      // we perform another request to get the Read the Docs response in the structure
      // that's supported by the user and dispatch a custom event letting them know
      // this data is ready to be consumed under `event.detail.data()`.
      const userApiUrl = _getApiUrl(sendUrlParam, metadataAddonsAPIVersion);

      // TODO: revert this change and use the correct URL here
      const url = "/_/readthedocs-addons.json";
      fetch(url, {
        method: "GET",
      }).then((response) => {
        if (!response.ok) {
          reject("Error hitting addons API endpoint for user api-version");
        }
        // Return the data in the API version requested.
        resolve(response.json());
      });
    }

    // If the API versions match, we return `undefined`.
    resolve(undefined);
  }).catch((error) => {
    console.error(error);
  });
}

/**
 * Load Read the Docs configuration from API endpoint.
 *
 */
export function getReadTheDocsConfig(sendUrlParam) {
  return new Promise((resolve, reject) => {
    let dataUser;
    const defaultApiUrl = _getApiUrl(sendUrlParam, ADDONS_API_VERSION);

    fetch(defaultApiUrl, {
      method: "GET",
    })
      .then((response) => {
        if (!response.ok) {
          reject("Error hitting addons API endpoint");
        }
        return response.json();
      })
      .then((data) => {
        // Trigger a new task here to hit the API again in case the version
        // request missmatchs the one the user expects.
        getReadTheDocsUserConfig(sendUrlParam).then((dataUser) => {
          // Expose `dataUser` if available or the `data` already requested.
          const dataEvent = dataUser !== undefined ? dataUser : data;

          // Trigger the addons data ready CustomEvent to with the data the user is expecting.
          return dispatchEvent(
            EVENT_READTHEDOCS_ADDONS_DATA_READY,
            document,
            new ReadTheDocsEventData(dataEvent),
          );
        });

        return data;
      });
  }).catch((error) => {
    console.error(error);
  });
}

function dispatchEvent(eventName, element, data) {
  const event = new CustomEvent(eventName, { detail: data });
  element.dispatchEvent(event);
}
