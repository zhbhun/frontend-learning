module.exports = {
  hot: true,
  historyApiFallback: true,
  noInfo: true,
  quiet: false,
  reporter(stats) {
    if (stats.state) {
      const {
        hash,
        startTime,
        endTime,
      } = stats.stats;
      console.log('');
      console.log(`Hash: ${hash}`);
      console.log(`Time: ${endTime - startTime}ms`);
    }
  },
  stats: {
    colors: true,
  },
};
