module.exports = {
  chainWebpack(webpack) {
    console.log(webpack.toConfig().optimization.splitChunks);
    process.exit()
  }
}
