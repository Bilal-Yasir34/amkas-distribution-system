import type { Product, ProductArticle } from './types';

/**
 * Extracts and deduplicates all unique article names registered across the store.
 */
export function getAllArticles(
  universalArticles: string[] | undefined = [],
  products: Product[] = [],
  productArticles: ProductArticle[] = []
): string[] {
  const set = new Set<string>();

  (universalArticles || []).forEach((art) => {
    const trimmed = art?.trim();
    if (trimmed) set.add(trimmed);
  });

  (products || []).forEach((p) => {
    if (p.article_name) {
      p.article_name.split(',').forEach((seg) => {
        const trimmed = seg.trim();
        if (trimmed) set.add(trimmed);
      });
    }
  });

  (productArticles || []).forEach((pa) => {
    const trimmed = pa.name?.trim();
    if (trimmed) set.add(trimmed);
  });

  return Array.from(set).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

/**
 * Returns all products that belong to a given article name.
 */
export function getProductsForArticle(
  articleName: string,
  products: Product[] = [],
  productArticles: ProductArticle[] = []
): Product[] {
  if (!articleName) return [];
  const lower = articleName.toLowerCase().trim();

  return products.filter((p) => {
    if (p.article_name) {
      const parts = p.article_name.split(',').map((s) => s.trim().toLowerCase());
      if (parts.includes(lower)) return true;
    }
    if (productArticles && productArticles.length > 0) {
      if (
        productArticles.some(
          (pa) => pa.product_id === p.id && pa.name.toLowerCase().trim() === lower
        )
      ) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Resolves the primary article name for a given product ID.
 */
export function getArticleForProduct(
  productId: string | null | undefined,
  products: Product[] = [],
  productArticles: ProductArticle[] = []
): string {
  if (!productId) return '';
  const prod = products.find((p) => p.id === productId);
  if (!prod) return '';

  if (prod.article_name) {
    const firstPart = prod.article_name.split(',')[0]?.trim();
    if (firstPart) return firstPart;
  }

  const art = (productArticles || []).find((pa) => pa.product_id === productId);
  if (art?.name) return art.name.trim();

  return '';
}
