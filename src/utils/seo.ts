/**
 * Generates default and article-specific JSON-LD structured data.
 */
export function generateStructuredData(
  title: string,
  description: string,
  url: string,
  imageUrl: string,
  isArticle = false,
  publishedTime?: string
) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': isArticle ? 'Article' : 'WebSite',
    name: title,
    description: description,
    url: url,
    image: imageUrl,
  };

  if (isArticle && publishedTime) {
    return {
      ...baseData,
      datePublished: publishedTime,
      author: {
        '@type': 'Person',
        name: 'The Photographer',
      },
    };
  }

  return baseData;
}
