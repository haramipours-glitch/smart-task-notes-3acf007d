import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.d7e345911914455da5aa800df1140813",
  appName: "ARSHNAZ",
  webDir: "dist",
  server: {
    // برای hot-reload از سندباکس Lovable. هنگام بیلد نهایی برای Play Store این بخش را حذف کن
    // یا آدرس را به دامنه خودت تغییر بده.
    url: "https://d7e34591-1914-455d-a5aa-800df1140813.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  android: {
    backgroundColor: "#0F172A",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F172A",
      overlaysWebView: false,
    },
    SplashScreen: {
      backgroundColor: "#0F172A",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
