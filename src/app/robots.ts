import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://merch-store.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account/", "/login", "/signup", "/reset-password/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
