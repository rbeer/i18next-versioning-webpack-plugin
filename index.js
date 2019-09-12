const fs = require('fs');
const path = require('path');

const { DefinePlugin } = require('webpack');
const { hashElement } = require('folder-hash');

const pluginName = 'I18nextVersioningPlugin';

class I18nextVersioningPlugin {
  constructor(options) {
    this.langsRoot = path.resolve(process.cwd(), options.langsRoot);
    this.hashFilePath = path.resolve(process.cwd(), options.hashFileName || 'i18nVersionHashes.json');
    this.hashes = I18nextVersioningPlugin.loadHashes(this.hashFilePath);
    this.hashingOptions = {
      files: { include: ['*.json'] }
    };
  }

  static loadHashes(file) {
    if (!fs.existsSync(file)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(file));
  }

  static compareAndUpdate(loaded, generated) {
    const log = I18nextVersioningPlugin.logger.info;

    Object.keys(generated).forEach((langKey) => {
      // ignore, if language didn't exist, yet
      if (!loaded[langKey]) {
        log(`Initializing new language ${langKey} with version ${generated[langKey].version}`);
        return;
      }
      // increment version by one, if language does exist
      // and hashes don't match
      if (loaded[langKey].hash !== generated[langKey].hash) {
        generated[langKey].version += 1;
        log(`Incremented '${langKey}' to ${generated[langKey].version}`);
      } else {
        log(`Leaving '${langKey}'   at ${generated[langKey].version}`);
      }
    });
  }

  static getDefinePluginOptions(compiler) {
    const defineOptions = compiler.options.plugins.filter(plugin => plugin instanceof DefinePlugin);
    console.log(defineOptions)
    if (defineOptions.length === 0) {
      throw new ReferenceError(`${pluginName} needs DefinePlugin to work!`);
    }
    return defineOptions[0];
  }

  async run(compiler, production) {
    const developmentVersion = !production && Date.now();
    const defineOptions = I18nextVersioningPlugin.getDefinePluginOptions(compiler);
    const hashes = await hashElement(this.langsRoot, this.hashingOptions);
    const generated = hashes.children.reduce((langs, child) => ({
      ...langs,
      [child.name]: {
        hash: child.hash,
        version: production
          ? (this.hashes[child.name] && this.hashes[child.name].version) || 1
          : developmentVersion
      }
    }), {});
    // increment version and write hashes in production, only
    if (production) {
      I18nextVersioningPlugin.compareAndUpdate(this.hashes, generated);
      compiler.outputFileSystem.writeFile(
        this.hashFilePath, JSON.stringify(generated),
        () => {}
      );
    } else {
      I18nextVersioningPlugin.logger
        .info(`Using current timestamp (${developmentVersion}) as version string for non-production build`);
    }
    const i18nVersions = Object.keys(generated).reduce((versions, langKey) => ({
      ...versions,
      [langKey]: generated[langKey].version
    }), {});
    // pass versions to DefinePlugin
    defineOptions.definitions.i18nVersions = JSON.stringify(i18nVersions);
  };

  apply(compiler) {
    I18nextVersioningPlugin.logger = compiler.getInfrastructureLogger(pluginName);
    const production = compiler.options.mode === 'production';
    const watching = !!compiler.options.watch;
    const devServer = !!process.env.WEBPACK_DEV_SERVER;

    // `beforeRun` event doesn't fire in watch mode
    if (watching || devServer) {
      compiler.hooks.watchRun.tapPromise(
        pluginName,
        this.run.bind(this, compiler, production)
      );
    } else {
      compiler.hooks.beforeRun.tapPromise(
        pluginName,
        this.run.bind(this, compiler, production)
      );
    }
  }
}

module.exports = I18nextVersioningPlugin;
