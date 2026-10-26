/**
 * URLs of pages that show one record. The id goes in the query string (not a
 * path segment) so the site can be exported as static files and hosted on S3.
 */

export function productHref(id: string): string {
  return `/product?id=${encodeURIComponent(id)}`;
}

export function orderHref(id: string): string {
  return `/order?id=${encodeURIComponent(id)}`;
}
