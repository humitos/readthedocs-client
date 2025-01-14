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
  getMetadataValue,
} from "./utils";

/**
 * Get the Addons API endpoint URL to hit.
 *
 * It uses META HTML tags to get project/version slugs and `sendUrlParam` to
 * decide whether or not sending `url=`.
 */
function _getApiUrl(sendUrlParam, apiVersion) {
  const metaProject = getMetadataValue("readthedocs-project-slug");
  const metaVersion = getMetadataValue("readthedocs-version-slug");

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
    params["project-slug"] = metaProject;
    params["version-slug"] = metaVersion;
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
    const metadataAddonsAPIVersion = getMetadataValue(
      "readthedocs-addons-api-version",
    );

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
          return reject(
            "Error hitting addons API endpoint for user api-version",
          );
        }
        // Return the data in the API version requested.
        return resolve(response.json());
      });
    }

    // If the API versions match, we return `undefined`.
    return resolve(undefined);
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
          return reject("Error hitting addons API endpoint");
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

        return resolve(data);
      });
  }).catch((error) => {
    console.error(error);
  });
}

export async function getReadTheDocsConfigUsingAPIv3(sendUrlParam) {
  const defaultApiUrl = _getApiUrl(sendUrlParam, ADDONS_API_VERSION);
  const addons = await (await fetch(defaultApiUrl)).json();

  const projectResponse = fetch(
    addons.readthedocs.urls.api.v3.projects.current,
  );
  const translationsResponse = fetch(
    addons.readthedocs.urls.api.v3.projects.translations,
  );

  const versionResponse = fetch(
    addons.readthedocs.urls.api.v3.versions.current,
  );
  const activeVersionsResponse = fetch(
    addons.readthedocs.urls.api.v3.versions.active,
  );
  const buildResponse = fetch(addons.readthedocs.urls.api.v3.builds.current);
  const filetreediffResponse = fetch(
    addons.readthedocs.urls.api.v3.filetreediff,
  );

  const responses = await Promise.all([
    projectResponse,
    translationsResponse,
    versionResponse,
    activeVersionsResponse,
    buildResponse,
    filetreediffResponse,
  ]);

  const [project, translations, version, activeVersions, build, filetreediff] =
    await Promise.all(responses.map((response) => response.json()));

  Object.assign(addons, {
    builds: {
      current: build,
    },
    projects: {
      current: project,
      translations: translations.results,
    },
    versions: {
      active: activeVersions.results,
      current: version,
    },
  });

  Object.assign(addons["addons"]["filetreediff"], filetreediff);

  // Trigger the addons data ready CustomEvent to with the data the user is expecting.
  dispatchEvent(
    EVENT_READTHEDOCS_ADDONS_DATA_READY,
    document,
    new ReadTheDocsEventData(addons),
  );

  return addons;
}

function dispatchEvent(eventName, element, data) {
  const event = new CustomEvent(eventName, { detail: data });
  element.dispatchEvent(event);
}
