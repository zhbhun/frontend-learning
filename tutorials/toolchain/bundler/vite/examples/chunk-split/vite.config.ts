import { defineConfig, splitVendorChunkPlugin } from "vite";

const temp = [];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [splitVendorChunkPlugin()],
  experimental: {
    renderBuiltUrl(filename, options) {
      const { type } = options;
      temp.push({ filename, options });
      if (type === "asset") {
        if (filename.endsWith(".js") || filename.endsWith(".css")) {
          return `/${filename}`;
        }
        return `https://static.fe.pixocial.com/miniapp.snapid.ai/${filename}`;
      }
      return `${filename}`;
    },
  },
});

setTimeout(() => {
  console.log(temp)
}, 3000);
