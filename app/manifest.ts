import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BolKhata",
    short_name: "BolKhata",
    description: "Kirana ka awaaz wala udhaar khata.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4ead7",
    theme_color: "#6d2c24",
    lang: "hi",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
