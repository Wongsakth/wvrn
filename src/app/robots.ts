import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/apply-editor'],
    },
    sitemap: 'https://wvrn.vercel.app/sitemap.xml',
  }
}
