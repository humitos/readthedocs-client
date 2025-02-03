import { default as objectPath } from "object-path";
import { AddonBase } from "./utils";

const SCRIPT_ID = "readthedocs-addons-custom-script";

/**
 * User JavaScript file.
 *
 * Allow a user to inject a custom JavaScript file in all the pages.
 */
export class CustomScriptAddon extends AddonBase {
  static jsonValidationURI =
    "http://v1.schemas.readthedocs.org/addons.customscript.json";
  static addonEnabledPath = "addons.customscript.enabled";
  static addonName = "CustomScript";
  static enabledOnHttpStatus = [200, 403, 404, 500];

  loadConfig(config) {
    this.config = config;

    if (objectPath.get(this.config, "addons.customscript.src")) {
      this.injectJavaScriptFile();
    }
  }

  injectJavaScriptFile() {
    // Do not add the script if it already exists in the page.
    if (document.querySelector(`#${SCRIPT_ID}`) !== null) {
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = objectPath.get(this.config, "addons.customscript.src");
    script.async = true;

    document.body.appendChild(script);
  }
}
