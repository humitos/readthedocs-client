CHANGELOG
=========

.. The text for the changelog is manually generated for now.


Version v0.8.0
--------------

:date: November 7, 2023

* Make flyout header sticky when there are many versions
* NodeJS packages updated

Version v0.7.2
--------------

:date: October 31, 2023

* Show notification only if ``stable`` version is available (bugfix in logic)
* Typos on notification
* NodeJS packages updated

Version v0.7.1
--------------

:date: October 25, 2023

* Show non-stable notification only if ``stable`` is enabled
* Fix issue shown on JS console for global Read the Docs analytics
* Handle ``/`` keyboard shortcut properly when inside on an input

Version v0.7.0
--------------

:date: October 24, 2023

* Use ``objectPath`` on DocDiff addon to protect ourselves on ``isEnabled``
* Grab ``project-slug=`` and ``version-slug=`` from ``meta`` HTML tags and send them to the API.
* Update all the NPM package dependencies

Version v0.6.0
--------------

:date: September 26, 2023

* Update ``pre-commit`` configuration
* Update all the NPM package dependencies
* Don't show "Versions" section in flyout if the project is single version
* Make notification style better on mobile
* Don't show notification on single version projects
* Don't show version name on closed flyout when project is single version
* Use ``bumpver`` to update version on ``src/utils.js``
* Move HTTP header on requests to API endpoint to GET attribute
* Switch to ``web-test-runner`` to run tests

Version v0.5.0
--------------

:date: September 17, 2023

* Add support for scrolling vertically the flyout when there are too many versions
* Collapse flyout when clicking outside of it
* Change warning notification logic to show a notification on ``latest`` and non-``stable`` versions


Version v0.4.0
--------------

:date: September 12, 2023

* Trigger search addon from flyout input
* Focus search input in the modal immediately after showing it
* New addons: hotkeys
* Migrate search hotkeys to be managed by the new hotkeys addon.

Version v0.3.0
--------------

:date: September 6, 2023

This is the initial published version.
Users can access to the addon features by using Read the Docs' config key ``build.commands``.
See https://docs.readthedocs.io/en/latest/build-customization.html
