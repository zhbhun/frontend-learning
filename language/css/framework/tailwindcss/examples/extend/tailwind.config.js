/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      width: {
        lg: "100px",
      },
    },
    height: {
      lg: "100px",
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
