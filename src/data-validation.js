import Ajv from "ajv";

// Validator for Analytics Addon
const addons_analytics = {
  $id: "http://v1.schemas.readthedocs.org/addons.analytics.json",
  type: "object",
  required: ["addons", "projects", "versions"],
  properties: {
    addons: {
      type: "object",
      required: ["analytics"],
      properties: {
        analytics: {
          type: "object",
          required: ["code", "enabled"],
          properties: {
            code: { type: ["string", "null"] },
            enabled: { type: "boolean" },
          },
        },
      },
    },
    projects: {
      type: "object",
      required: ["current"],
      properties: {
        current: {
          type: "object",
          required: ["slug", "language", "programming_language"],
          properties: {
            slug: { type: "string" },
            // Optional
            language: {
              type: "object",
              required: ["code"],
              properties: {
                code: { type: "string" },
              },
            },
            programming_language: {
              type: "object",
              required: ["code"],
              properties: {
                code: { type: "string" },
              },
            },
          },
        },
      },
    },
    versions: {
      type: "object",
      required: ["current"],
      properties: {
        current: {
          type: "object",
          required: ["slug", "type"],
          properties: {
            slug: { type: "string" },
            type: { type: "string" },
          },
        },
      },
    },
  },
};

// Validator for DocDiff Addon
const addons_docdiff = {
  $id: "http://v1.schemas.readthedocs.org/addons.docdiff.json",
  type: "object",
  required: ["addons"],
  properties: {
    addons: {
      type: "object",
      required: ["options", "doc_diff"],
      properties: {
        options: {
          type: "object",
          required: ["root_selector"],
          properties: {
            root_selector: { type: ["string", "null"] },
          },
        },
        doc_diff: {
          type: "object",
          required: ["base_url", "enabled"],
          properties: {
            base_url: { type: "string" },
            enabled: { type: "boolean" },
          },
        },
      },
    },
  },
};

// Validator for EthicalAds Addon
const addons_ethicalads = {
  $id: "http://v1.schemas.readthedocs.org/addons.ethicalads.json",
  type: "object",
  required: ["addons"],
  properties: {
    addons: {
      type: "object",
      required: ["ethicalads"],
      properties: {
        ethicalads: {
          type: "object",
          required: [
            "ad_free",
            "campaign_types",
            "enabled",
            "keywords",
            "publisher",
          ],
          properties: {
            ad_free: { type: "boolean" },
            campaign_types: { type: "array" },
            enabled: { type: "boolean" },
            keywords: { type: "array" },
            publisher: { type: "string" },
          },
        },
      },
    },
  },
};

// Validator for Flyout Addon
const addons_flyout = {
  $id: "http://v1.schemas.readthedocs.org/addons.flyout.json",
  type: "object",
  required: ["addons", "projects", "versions", "readthedocs"],
  properties: {
    addons: {
      type: "object",
      required: ["flyout"],
      properties: {
        flyout: {
          type: "object",
          required: [
            "enabled",
            // TODO: make it required when we support VCS links
            // "vcs",
          ],
          properties: {
            enabled: { type: "boolean" },
            vcs: {
              type: "object",
              properties: {
                view_url: { type: "string" },
              },
            },
          },
        },
      },
    },
    projects: {
      type: "object",
      required: ["current", "translations"],
      properties: {
        current: {
          type: "object",
          required: ["slug", "urls", "versioning_scheme"],
          properties: {
            slug: { type: "string" },
            urls: {
              type: "object",
              required: ["home", "builds", "downloads"],
              properties: {
                home: { type: "string" },
                builds: { type: "string" },
                downloads: { type: "string" },
              },
            },
            versioning_scheme: {
              enum: [
                "multiple_versions_with_translations",
                "multiple_versions_without_translations",
                "single_version_without_translations",
              ],
            },
          },
        },
        translations: {
          type: "array",
          // TODO: validate each item of the array has the following structure
          //
          // items: { type: "object" },
          // required: ["slug", "urls", "language"],
          // properties: {
          //   slug: { type: "string" },
          //   language: {
          //     type: "object",
          //     required: ["code"],
          //     properties: {
          //       code: { type: "string" },
          //     },
          //   },
          //   urls: {
          //     type: "object",
          //     required: ["documentation"],
          //     properties: {
          //       documentation: { type: "string" },
          //     },
          //   },
          // },
        },
      },
    },
    versions: {
      type: "object",
      required: ["current", "active"],
      properties: {
        active: {
          type: "array",
          // TODO: validate each item of the array has the following structure
          //
          // items: { type: "object" },
          // required: ["slug", "urls"],
          // properties: {
          //   slug: { type: "string" },
          //   urls: {
          //     type: "object",
          //     required: ["documentation"],
          //     properties: {
          //       documentation: { type: "string" },
          //     },
          //   },
          // },
        },
        current: {
          type: "object",
          required: ["slug", "downloads"],
          properties: {
            slug: { type: "string" },
            downloads: {
              type: "object",
            },
          },
        },
      },
    },
    readthedocs: {
      type: "object",
      required: ["resolver"],
      properties: {
        resolver: {
          type: "object",
          required: ["filename"],
          properties: {
            filename: { type: "string" },
          },
        },
      },
    },
  },
};

// Validator for File Tree Diff Addon
const addons_filetreediff = {
  $id: "http://v1.schemas.readthedocs.org/addons.filetreediff.json",
  type: "object",
  required: ["addons", "versions"],
  properties: {
    addons: {
      type: "object",
      required: ["filetreediff"],
      properties: {
        filetreediff: {
          type: "object",
          required: ["enabled", "diff"],
          properties: {
            enabled: { type: "boolean" },
            diff: {
              type: "object",
              properties: {
                added: { type: "array" },
                deleted: { type: "array" },
                modified: { type: "array" },
              },
            },
          },
        },
      },
    },
    versions: {
      type: "object",
      required: ["current"],
      properties: {
        current: {
          type: "object",
          required: ["type"],
          properties: {
            type: { type: "string" },
          },
        },
      },
    },
  },
};

// Validator for Hotkeys Addon
const addons_hotkeys = {
  $id: "http://v1.schemas.readthedocs.org/addons.hotkeys.json",
  type: "object",
  required: ["addons"],
  properties: {
    addons: {
      type: "object",
      required: ["hotkeys"],
      properties: {
        hotkeys: {
          type: "object",
          required: ["enabled", "doc_diff", "search"],
          properties: {
            enabled: { type: "boolean" },
            doc_diff: {
              type: "object",
              required: ["enabled", "trigger"],
              properties: {
                enabled: { type: "boolean" },
                trigger: { type: "string" },
              },
            },
            search: {
              type: "object",
              required: ["enabled", "trigger"],
              properties: {
                enabled: { type: "boolean" },
                trigger: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

// Validator for Notifications Addon
const addons_notifications = {
  $id: "http://v1.schemas.readthedocs.org/addons.notifications.json",
  type: "object",
  required: ["addons", "readthedocs"],
  properties: {
    addons: {
      type: "object",
      required: ["notifications"],
      properties: {
        enabled: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
          },
        },
      },
    },
    builds: {
      type: "object",
      required: ["current"],
      properties: {
        current: {
          type: "object",
          required: ["urls"],
          properties: {
            urls: {
              type: "object",
              required: ["build"],
              properties: {
                build: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
    projects: {
      type: "object",
      properties: {
        current: {
          type: "object",
          properties: {
            slug: { type: "string" },
            versioning_scheme: {
              enum: [
                "multiple_versions_with_translations",
                "multiple_versions_without_translations",
                "single_version_without_translations",
              ],
            },
            // TODO: use ajv-formats URI type
            repository: {
              type: "object",
              required: ["url"],
              properties: {
                url: { type: "string" },
              },
            },
            language: {
              type: "object",
              required: ["code"],
              properties: {
                code: { type: "string" },
              },
            },
          },
        },
      },
    },
    versions: {
      type: "object",
      required: ["current", "active"],
      properties: {
        active: {
          type: "array",
          // TODO: validate each item of the array has the following structure
          //
          // items: { type: "object" },
          // required: ["slug", "urls", "aliases"],
          // properties: {
          //   slug: { type: "string" },
          //   urls: {
          //     type: "object",
          //     required: ["documentation"],
          //     properties: {
          //       documentation: { type: "string" },
          //     },
          //   },
          // },
        },
        current: {
          type: "object",
          required: ["slug", "urls", "type", "aliases"],
          properties: {
            aliases: { type: "array" },
            slug: { type: "string" },
            type: { enum: ["branch", "tag", "external"] },
            urls: {
              type: "object",
              required: ["documentation", "vcs"],
              properties: {
                documentation: {
                  type: "string",
                },
                vcs: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
    readthedocs: {
      type: "object",
      required: ["resolver"],
      properties: {
        resolver: {
          type: "object",
          required: ["filename"],
          properties: {
            filename: { type: "string" },
          },
        },
      },
    },
  },
};

// Validator for Search Addon
const addons_search = {
  $id: "http://v1.schemas.readthedocs.org/addons.search.json",
  type: "object",
  required: ["addons"],
  properties: {
    addons: {
      type: "object",
      required: ["search"],
      properties: {
        search: {
          type: "object",
          required: ["enabled", "default_filter", "filters"],
          properties: {
            enabled: { type: "boolean" },
            default_filter: { type: "string" },
            filters: { type: "array" },
          },
        },
      },
    },
    projects: {
      type: "object",
      required: ["current"],
      properties: {
        current: {
          type: "object",
          required: ["slug"],
          properties: {
            slug: { type: "string" },
          },
        },
      },
    },
  },
};

// Validator for LinkPreviews Addon
const addons_linkpreviews = {
  $id: "http://v1.schemas.readthedocs.org/addons.linkpreviews.json",
  type: "object",
  required: ["addons"],
  properties: {
    addons: {
      type: "object",
      required: ["options", "linkpreviews"],
      properties: {
        options: {
          type: "object",
          required: ["root_selector"],
          properties: {
            root_selector: { type: ["string", "null"] },
          },
        },
        linkpreviews: {
          type: "object",
          required: ["enabled"],
          properties: {
            enabled: { type: "boolean" },
          },
        },
      },
    },
  },
};

// Validator for CustomScript Addon
const addons_customscript = {
  $id: "http://v1.schemas.readthedocs.org/addons.customscript.json",
  type: "object",
  required: ["addons"],
  properties: {
    addons: {
      type: "object",
      required: ["customscript"],
      properties: {
        customscript: {
          type: "object",
          required: ["enabled"],
          properties: {
            enabled: { type: "boolean" },
            src: { type: ["string", "null"] },
          },
        },
      },
    },
  },
};

export const ajv = new Ajv({
  allErrors: true,
  schemas: [
    addons_analytics,
    addons_docdiff,
    addons_ethicalads,
    addons_flyout,
    addons_hotkeys,
    addons_notifications,
    addons_search,
    addons_linkpreviews,
    addons_filetreediff,
    addons_customscript,
  ],
});

// NOTE: export the ajv object for debugging purposes only.
// window.ajv = ajv;
