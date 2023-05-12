import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.ionic.starter",
  appName: "hello-tab",
  webDir: "dist",
  server: {
    androidScheme: "https",
    url: "http://172.21.29.186:5173/",
  },
};

export default config;
