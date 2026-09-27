export interface ProductSeoInput {
  id: string;
  title: string;
  artist_name?: string | null;
  description?: string | null;
  price: number;
  currency?: string | null;
  key_signature?: string | null;
  show_key_signature?: boolean | null;
  category?: string | null;
  vocal_ranges?: string[] | null;
  cut_description?: string | null;
  image_url?: string | null;
}

export declare const productSeo: (
  product: ProductSeoInput,
  siteUrl: string,
) => { title: string; description: string; url: string; jsonLd: object[] };
