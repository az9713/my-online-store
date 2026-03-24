/**
 * Commerce provider interface.
 *
 * This abstraction allows the storefront to work with different
 * commerce backends (local/seed data, Printify, Shopify, etc.)
 * without changing the storefront code.
 *
 * Currently only the "local" provider is implemented.
 * Printify and Shopify providers can be added as EP-016 and future epics.
 */
export interface CommerceProvider {
  name: string;
  getProducts(options: { featured?: boolean; page?: number; pageSize?: number }): Promise<ProductList>;
  getProductBySlug(slug: string): Promise<Product | null>;
  searchProducts(query: string, options: { page?: number; pageSize?: number }): Promise<ProductList>;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  basePrice: number;
  currency: string;
  featured: boolean;
  tags: string[];
  commerceProvider: string;
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  imageUrl: string | null;
  inStock: boolean;
  optionValues: Record<string, string>;
}

export interface ProductList {
  products: Product[];
  total: number;
}
