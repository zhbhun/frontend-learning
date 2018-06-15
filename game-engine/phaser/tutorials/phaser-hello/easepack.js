module.exports = {
  presets: [
    [
      require.resolve("easepack/lib/config/es"),
      {
        input: "src/index.html"
      },
    ],
  ],
  devServer: {
    index: 'index.html'
  }
};
