// "[Service] near me" landing pages (Phase 3).
//
// Each entry is one indexable landing page targeting a high-intent "near me"
// query proven in our own GSC data (see data/seo-research.md). The page lists
// suppliers grouped by emirate (pulled from `service_tags`), so a single page
// answers "X near me" for every emirate at once and internally links down to the
// per-emirate /<service>-in-<location> combo pages.
//
// Routing note: these live as explicit single-segment routes (e.g.
// /ppf-near-me). Explicit routes take precedence over the root [combo] catch-all
// (see STATUS.md gotcha #4), so they resolve before the combo parser sees them.

export type NearMeService = {
  // Route + URL slug, e.g. "ppf-near-me" → /ppf-near-me.
  slug: string;
  // The query we target, used verbatim in copy/JSON-LD, e.g. "PPF near me".
  query: string;
  // Full service name for prose, e.g. "Paint protection film (PPF)".
  service: string;
  // Short label for headings/breadcrumbs, e.g. "PPF".
  short: string;
  // service_tags to filter listings on (a business is tagged with every service it offers).
  categorySlugs: string[];
  // Primary category — used for the /business-category hub link and /<cat>-in-<emirate> combos.
  primaryCategory: string;
  // Unique, fact-grounded intro paragraph (UAE specifics from research).
  intro: string;
  // "What to check" bullets — unique per service, genuinely useful.
  checklist: string[];
};

export const NEAR_ME_SERVICES: NearMeService[] = [
  {
    slug: "car-recovery-near-me",
    query: "car recovery near me",
    service: "Car recovery & towing",
    short: "Car recovery",
    categorySlugs: ["towing-service"],
    primaryCategory: "towing-service",
    intro:
      "A breakdown, flat battery or accident on a UAE highway needs a recovery truck fast — and in the summer heat, battery and tyre failures spike. This page gathers car recovery and towing operators across all seven emirates so you can find the closest 24/7 service, call straight away and get your car moved. Listings are ranked by the Easy Auto Score, which blends real Google ratings, review volume and how complete each profile is.",
    checklist: [
      "Confirm they operate 24/7 — most breakdowns happen at night or in peak heat.",
      "Check the truck type matches your vehicle (flatbed for low/luxury cars, wheel-lift for standard).",
      "Ask for the call-out fee up front — sedans typically run AED 300–500, larger 4x4s and luxury cars more.",
      "On a highway after an accident, only police-authorised recovery may move the vehicle — call the police first.",
    ],
  },
  {
    slug: "car-detailing-near-me",
    query: "car detailing near me",
    service: "Car detailing & polishing",
    short: "Car detailing",
    categorySlugs: ["car-detailing-service"],
    primaryCategory: "car-detailing-service",
    intro:
      "UAE roads put cars through sand, dust and relentless UV, so regular detailing keeps paintwork sharp and protected. Whether you want an interior deep-clean, a wash-and-wax, paint correction or a full detail before applying a coating, this page brings together detailing specialists across the emirates. Each is ranked by the Easy Auto Score from genuine Google ratings, review counts and profile completeness so you can compare trusted studios quickly.",
    checklist: [
      "Decide the level you need — interior valet, exterior polish, paint correction, or a full detail.",
      "Ask whether paint correction is single- or multi-stage; deeper swirl removal costs more.",
      "Full standard details in the UAE typically run AED 600–1,200; premium or detail-plus-ceramic packages 1,500–4,500.",
      "Larger SUVs usually carry a 25–50% surcharge over a sedan rate.",
    ],
  },
  {
    slug: "car-wash-near-me",
    query: "car wash near me",
    service: "Car wash",
    short: "Car wash",
    categorySlugs: ["car-wash", "self-service-car-wash"],
    primaryCategory: "car-wash",
    intro:
      "From quick automatic washes to steam, hand and mobile at-home washes, this page lists car-wash options across every emirate. Demand climbs after sandstorms and through the summer, and many UAE washes shift to late-night slots during Ramadan. Compare nearby washes ranked by the Easy Auto Score — built from real Google ratings, review volume and profile completeness — and pick one that fits your routine.",
    checklist: [
      "Choose the wash type — automatic, hand, steam, or a mobile wash that comes to you.",
      "Basic washes run roughly AED 20–35; full valets AED 50–75; premium mobile washes from AED 99.",
      "Steam washing uses less water and is gentler on paint than high-pressure jets.",
      "If you wash often, ask about monthly subscriptions — several UAE operators offer them from around AED 79.",
    ],
  },
  {
    slug: "ppf-near-me",
    query: "PPF near me",
    service: "Paint protection film (PPF)",
    short: "PPF",
    categorySlugs: ["paint-protection-film"],
    primaryCategory: "paint-protection-film",
    intro:
      "Paint protection film (PPF) is a clear, self-healing layer that shields paint from stone chips, sand abrasion and UV — protection that matters in the Gulf, where surface temperatures can hit 80–95°C. This page lists PPF installers across the UAE so you can compare specialists, check whether they fit partial or full-body film, and find a studio near you. Listings are ranked by the Easy Auto Score from real Google ratings, reviews and profile completeness.",
    checklist: [
      "Decide on coverage — partial/front kit, or full-body for maximum protection.",
      "Ask which film and tier they fit; premium brands like XPEL, STEK and SunTek carry 10-year warranties.",
      "Expect AED 3,500–6,000 for a front/partial kit and AED 6,900–15,500+ for full-body, depending on film grade.",
      "Quality film is aliphatic TPU; very cheap 'full body' offers often use inferior PVC that yellows.",
    ],
  },
  {
    slug: "ceramic-coating-near-me",
    query: "ceramic coating near me",
    service: "Ceramic coating",
    short: "Ceramic coating",
    categorySlugs: ["ceramic-coating-service"],
    primaryCategory: "ceramic-coating-service",
    intro:
      "A ceramic coating bonds a hard, hydrophobic layer to your paint that resists UV, chemical staining and water spotting — and makes the relentless UAE dust far easier to rinse off. This page brings together ceramic coating specialists across the emirates so you can compare tiers, durability and warranty. Each studio is ranked by the Easy Auto Score, built from genuine Google ratings, review volume and profile completeness.",
    checklist: [
      "Coatings range from entry (1–2 years) to professional 10-year systems — match the tier to how long you keep the car.",
      "UAE pricing typically runs AED 1,499 entry, AED 3,000–5,000 mid-tier, and AED 7,000+ for premium 10-year coatings.",
      "Most warranties require proper prep (paint correction first) and annual inspections — ask what's included.",
      "Brands to know: Ceramic Pro, Gtechniq, Gyeon, Feynlab and IGL.",
    ],
  },
  {
    slug: "window-tinting-near-me",
    query: "car window tinting near me",
    service: "Car window tinting",
    short: "Window tinting",
    categorySlugs: ["auto-window-tinting-service", "window-tinting-service"],
    primaryCategory: "auto-window-tinting-service",
    intro:
      "In the UAE heat, quality window film cuts cabin temperature, blocks UV and protects interiors — but it has to stay within RTA limits. This page lists window-tinting specialists across the emirates so you can compare heat-rejection films and find a fitter near you. Listings are ranked by the Easy Auto Score from real Google ratings, reviews and profile completeness.",
    checklist: [
      "Know the law: UAE rules commonly allow up to 50% tint darkness on side and rear windows, with the windshield kept clear — over-tinting risks an AED 1,500 fine.",
      "Ceramic and nano-ceramic films reject more heat (infrared) than basic dyed film at the same shade.",
      "Premium brands (3M, V-KOOL, LLumar) run roughly AED 1,500–3,200; standard films from AED 500.",
      "Good film carries a lifetime warranty against bubbling, peeling and purpling — ask for it in writing.",
    ],
  },
  {
    slug: "car-wrapping-near-me",
    query: "car wrapping near me",
    service: "Car wrapping",
    short: "Car wrapping",
    categorySlugs: ["vehicle-wrapping-service"],
    primaryCategory: "vehicle-wrapping-service",
    intro:
      "A vinyl wrap changes your car's colour or finish — gloss, matte, satin or carbon — while protecting the original paint underneath, and it's fully reversible. Wraps are also the standard for fleet and business branding. This page lists vehicle-wrapping specialists across the UAE so you can compare finishes and find an installer near you, ranked by the Easy Auto Score from real ratings, reviews and profile completeness.",
    checklist: [
      "A full-colour-change wrap in Dubai needs an RTA/CID colour-change permit and a Mulkiya update — unauthorised colour changes can be fined (around AED 800).",
      "Chrome, fluorescent and retroreflective wraps are not permitted on private cars.",
      "Expect roughly AED 3,500–8,000 for a full sedan wrap and AED 5,000–12,000 for an SUV, by film and finish.",
      "Quality cast vinyl typically lasts 3–7 years; ask about the brand and warranty.",
    ],
  },
];

const BY_SLUG = new Map(NEAR_ME_SERVICES.map((s) => [s.slug, s]));

export function getNearMeService(slug: string): NearMeService | undefined {
  return BY_SLUG.get(slug);
}

export function nearMeSlugs(): string[] {
  return NEAR_ME_SERVICES.map((s) => s.slug);
}
