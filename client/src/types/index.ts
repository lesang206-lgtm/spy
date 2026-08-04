export interface Product {
  source: string;
  name: string;
  price: number;
  salePrice: number;
  image: string;
  image_url: string;
  url: string;
  product_url: string;
  brand: string;
  manufacturer: string;
  unit: string;
  activeIngredient: string;
  dosageForm: string;
  registrationNumber: string;
  sku: string;
}

export interface MatchGroup {
  name: string;
  products: {
    thuocsi?: Product;
    longchau?: Product;
    pharmart?: Product;
    medigo?: Product;
  };
  prices: {
    thuocsi: number;
    longchau: number;
    pharmart: number;
    medigo: number;
  };
  cheapest: string;
  priceDiff: number | null;
  sourceCount: number;
}

export interface SearchResponse {
  keyword: string;
  source: string;
  matches: MatchGroup[];
  products: {
    thuocsi: Product[];
    longchau: Product[];
    pharmart: Product[];
    medigo: Product[];
  };
  status: {
    thuocsiOk: boolean;
    longchauOk: boolean;
    pharmartOk: boolean;
    medigoOk: boolean;
  };
  warnings: string[];
  responseTimeMs: number;
}
