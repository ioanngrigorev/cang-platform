export type SortOption = "relevance" | "newest" | "price_asc" | "price_desc" | "moq_asc" | "rating" | "popular";

export type ProductSearchFilters = {
  q?: string;
  categorySlug?: string; // includes descendants
  categoryId?: string;
  companyId?: string;
  provinceSlug?: string;
  countryCode?: string;
  minPrice?: number;
  maxPrice?: number;
  maxMoq?: number;
  maxLeadTimeDays?: number;
  certifications?: string[]; // certification codes
  verifiedOnly?: boolean;
  oem?: boolean;
  odm?: boolean;
  customizable?: boolean;
  hasSample?: boolean;
  minRating?: number;
  featuredOnly?: boolean;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
};

export type SupplierSearchFilters = {
  q?: string;
  industrySlug?: string;
  categorySlug?: string;
  provinceSlug?: string;
  countryCode?: string;
  businessTypes?: string[];
  certifications?: string[];
  verifiedOnly?: boolean;
  badgeCodes?: string[];
  oem?: boolean;
  odm?: boolean;
  exportCountry?: string; // ISO code the supplier exports to
  minRating?: number;
  minEmployees?: string; // EmployeeRange code
  maxLeadTimeDays?: number;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
};

export type ProductHit = {
  id: string;
  slug: string;
  title: string;
  titleVi: string | null;
  shortDescription: string | null;
  priceType: string;
  currency: string;
  basePrice: number | null;
  minTierPrice: number | null;
  maxTierPrice: number | null;
  moq: number;
  unit: string;
  leadTimeDays: number | null;
  oemAvailable: boolean;
  odmAvailable: boolean;
  customizable: boolean;
  hasSample: boolean;
  isFeatured: boolean;
  primaryImageUrl: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  company: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    verificationStatus: string;
    ratingAvg: number;
    provinceName: string | null;
    provinceSlug: string | null;
    countryCode: string;
    badgeCodes: string[];
  };
  rank: number;
};

export type SupplierHit = {
  id: string;
  slug: string;
  name: string;
  nameVi: string | null;
  tagline: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  businessType: string;
  verificationStatus: string;
  ratingAvg: number;
  ratingCount: number;
  transactionCount: number;
  responseRate: number | null;
  yearEstablished: number | null;
  employeeRange: string | null;
  countryCode: string;
  provinceName: string | null;
  provinceSlug: string | null;
  city: string | null;
  oemCapable: boolean;
  odmCapable: boolean;
  avgLeadTimeDays: number | null;
  exportCountries: string[];
  productCount: number;
  badgeCodes: string[];
  certificationCodes: string[];
  industrySlugs: string[];
  isFeatured: boolean;
  rank: number;
};

export type SearchResult<T> = {
  hits: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tookMs: number;
};

export interface SearchProvider {
  searchProducts(filters: ProductSearchFilters): Promise<SearchResult<ProductHit>>;
  searchSuppliers(filters: SupplierSearchFilters): Promise<SearchResult<SupplierHit>>;
  suggest(q: string, limit?: number): Promise<Array<{ type: "product" | "supplier" | "category"; label: string; slug: string }>>;
}
