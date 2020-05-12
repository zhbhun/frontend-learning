const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

module.exports = (phase, { defaultConfig }) => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next" : "build",
  webpack: (webpaclConfig, { dev, isServer }) => {
    if (dev && !isServer) {
      webpaclConfig.devtool = "eval";
    }
    const babelIncludeRegexes = [/aaa/];
    const babelLoader = webpaclConfig.module.rules[0];
    const oexcludue = babelLoader.exclude;
    babelLoader.include.push(...babelIncludeRegexes);
    babelLoader.exclude = (path) => {
      return oexcludue(path) && !babelIncludeRegexes.some((r) => r.test(path));
    };
    return webpaclConfig;
  },
});
