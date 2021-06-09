module.exports = {
  plugins: [
    [
      'vuepress-plugin-typedoc',

      // Plugin / TypeDoc options
      {
        entryPoints: ['../src/index.ts'],
        tsconfig: '../tsconfig.json'
      },
    ],
  ],
};
