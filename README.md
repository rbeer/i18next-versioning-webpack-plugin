# i18next-versioning-webpack-plugin
("i18next-versioning")

This [webpack](https://https://webpack.js.org) plugin detects changes in your i18n files and increments the language's version for the [i18next-localstorage-backend](https://github.com/i18next/i18next-localstorage-backend).

The localstorage backend of [i18next](https://www.i18next.com/) takes an option `versions` to determine whether the language definitions have been updated and should be pulled from the backend.  

## Install
`npm i git+https://github.com/shadowban-eu/i18next-versioning-webpack-plugin.git`

## Use

Assuming an i18next setup using a combination of localstorage- and XHR-backend:
```js
{
  fallbackLng: 'en-US',
  ns: ['common', 'buttons'],
  defaultNS: 'common',
  backend: {
    backends: [LocalStorageBackend, XHRBackend],
    backendOptions: [
      {
        // LocalStorageBackend options
        versions: i18nVersions
      },
      {
        // XHRBackend options
        loadPath: '/i18n/{{lng}}/{{ns}}.json',
        crossDomain: false
      }
    ]
  }
}
```

and a language source folder structure of `/i18n/{{lng}}/{{ns}}.json`:
```
i18n/       <-- `langsRoot` in config
├── de
│   ├── common.json
│   └── buttons.json
├── en-US
│   ├── common.json
│   └── buttons.json
└── es
    ├── common.json
    └── buttons.json
```

`versions: i18nVersions` would be an object, containing:

```js
{
  'en-US': '1',
  'de': '1',
  'es': '1'
}
```

Instead of changing the version strings by hand whenever you change one of the files,
i18next-versioning hashes each `{{lng}}` directory and compares that hash with the one from the last build.

To use i18next-versioning, simply add it to your `webpack.config.js`:
```js
const { DefinePlugin } = require('webpack'); // required!
const I18nextVersioningPlugin = require('i18next-versioning-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV,
  entry: { ... },
  output: { ... },
  infrastructureLogging: {
    level: 'info' // i18next-versioning logs to the 'info' level
  },
  plugins: [
    new I18nextVersioningPlugin({
      langsRoot: './src/i18n',
      hashFileName: './i18nVersionHashes.json'
    }),
    new DefinePlugin({
      // i18nVersions - added by i18next-versioning
    })
  ]
```

i18next-versioning taps into webpack's `beforeRun` hook, does its thing and
adds the versions object with the name `i18nVersions` to the DefinePlugin definitions,
to make it available to whereever your init({...}) i18next.

## Options
|     Name     |         Default        |                                                                                                                    |
|:------------:|:----------------------:|--------------------------------------------------------------------------------------------------------------------|
|   langsRoot  |            -           | Root folder of translations. Expects one folder per language as children.                                          |
| hashFileName | i18nVersionHashes.json | Filename where hashes should be stored. Commit this file! |

NOTE: i18next-versioning does not care whether you've undone changes. It will always increment the version number of changed languages.
