# 2.0.0 [IN PROGRESS]
#### 💥 Breaking
* Updated minimum Node.js requirement to v6.10 (oldest LTS).
* Updated Inquirer.js to v3.1 from v0.11.
* Removed `Command#autocompletion` method.

#### 🚀 New
* Added `Vorpal#title`, `Vorpal#version`, `Vorpal#description`, and `Vorpal#banner` descriptor methods.
  * Renders in the header of help and menu screens.
* Added a new options object as the 3rd argument to `Vorpal#command`.
  * Supports a new `default` option.
  * Supports the old autocomplete functionality as a fallback.
* Added a new `vorpal_exit` event.

#### 🐞 Fixed
* Will now properly exit all scenarios if Ctrl + C is pressed.
* Now supports slashes in autocomplete list values.
* Improvements to variadic argument parsing.

#### 🛠 Internal
* Migrated to 100% ES2015 syntax.
* Migrated to Yarn from NPM.
* Migrated to Yarn scripts from Gulp.
* Updated to no longer require or build with Babel.
* Updated to the latest ESLint (based off Airbnb config).
* Removed the `dist` folder from the repository.
