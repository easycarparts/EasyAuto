// Shared domain types — mirror the Supabase schema (supabase/schema.sql) so the
// data layer can swap from local JSON (Step 2) to Supabase (Step 4) with no churn.

export type Business = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category_slug: string | null;
  rating: number | null;
  review_count: number | null;
  google_reviews: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  hours: string | null;
  place_id: string | null;
  google_link: string | null;
  review_keywords: string | null;
  competitors: string | null;
  thumbnail_url: string | null;
  claimed: boolean;
  featured: boolean;
  status: string;
  owner_id: string | null;
  easy_auto_score: number | null;
  score_breakdown: ScoreBreakdown | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ScoreBreakdown = {
  completeness: number; // /40
  reputation: number; // /40
  trust: number; // /20
  bayesian_rating: number | null;
  penalised: boolean;
};

export type Category = {
  slug: string;
  name: string;
  listing_count: number;
};

export type BusinessMedia = {
  id: string;
  business_id: number;
  kind: "image" | "video";
  url: string;
  thumbnail_url: string | null;
  public_id: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at?: string | null;
};

export type NewsPost = {
  id: number;
  slug: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
};
