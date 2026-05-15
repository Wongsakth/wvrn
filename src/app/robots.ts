import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/og', '/apply-editor'],
      },
      {
        // Allow Facebook/social crawlers to scrape event pages
        userAgent: 'facebookexternalhit',
        allow: '/',
        disallow: ['/admin/'],
      },
      {
        userAgent: 'Twitterbot',
        allow: '/',
        disallow: ['/admin/'],
      },
    ],
    sitemap: 'https://wvrn.vercel.app/sitemap.xml',
  }
}
