const path = require('path');
const fs = require('fs');
const setupCompiler = require('./setupCompiler');
const WebpackDllConfigFactory = require('./WebpackDllConfigFactory');

const MANIFEST = 'manifest.json';

function getDependenciesManifest(paths, dependencies) {
  const packageJson = require(paths.appPackageJson);
  const packageDependencies = Object.assign({},
    packageJson.devDependencies,
    packageJson.dependencies,
  );

  const result = {};
  dependencies.forEach(function(dependency) {
    const dependencyPacakgePath  = path.resolve(paths.appNodeModules, `${dependency}/package.json`);
    const dependencyPackage = require(dependencyPacakgePath);
    result[dependency] = dependencyPackage.version;
  });
  return result;
}

function isCacheExpired(paths, dependencies) {
  const newManifest = getDependenciesManifest(paths, dependencies);
  const oldManifestPath = path.resolve(paths.appPrebuild, MANIFEST);
  if (fs.existsSync(oldManifestPath)) {
    const oldManifest = require(oldManifestPath);
    return Object.keys(newManifest).some(function(key) {
      return newManifest[key] !== oldManifest[key];
    }) || (Object.keys(newManifest).length !== Object.keys(oldManifest).length);
  }
  return true;
}

function recordCache(paths, dependencies) {
  const result = getDependenciesManifest(paths, dependencies);
  fs.writeFileSync(path.resolve(paths.appPrebuild, MANIFEST), JSON.stringify(result));
}

function buildDependencies(paths, dependencies, callback) {
  const config = WebpackDllConfigFactory({
    paths,
    dependencies,
  }, true);
  const compiler = setupCompiler(config);
  compiler.run(function(err, stats) {
    if (err) {
      console.error(err);
      return;
    }
    callback && callback();
  });
}

function runPrebuild(paths, dependencies, callback) {
  if (!isCacheExpired(paths, dependencies)) {
    callback && callback(WebpackDllConfigFactory.entry);
    return;
  }
  console.log('--------------------------------');
  console.log();
  console.log('Prebuilding...')
  buildDependencies(paths, dependencies, function() {
    recordCache(paths, dependencies);
    console.log('Prebuil done.')
    console.log()
    console.log('--------------------------------');
    callback && callback(WebpackDllConfigFactory.entry);
  });
}

module.exports = runPrebuild;
