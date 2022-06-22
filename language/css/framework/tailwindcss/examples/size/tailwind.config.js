function getCustomeSize(min, max) {
  const config = {};
  for (let i = min; i <= max; i++) {
    const size = i;
    if (typeof size === "number") {
      config[`${size}rpx`] = `${
        Math.round((size / 16) * 1000000) / 1000000
      }rem`;
    }
  }

  return config;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      borderRadius: getCustomeSize(0, 100),
      borderWidth: getCustomeSize(0, 100),
      fontSize: getCustomeSize(0, 100),
      lineHeight: getCustomeSize(0, 100),
      spacing: getCustomeSize(0, 1000),
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
