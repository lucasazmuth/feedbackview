import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/projects/', '/feedbacks/', '/settings/', '/team/', '/notifications/', '/reports/', '/p/'],
      },
    ],
    sitemap: 'https://buug.io/sitemap.xml',
  }
}
