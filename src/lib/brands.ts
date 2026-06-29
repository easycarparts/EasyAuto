// Brand landing pages (Phase 4).
//
// Content-led pages for the major PPF / ceramic / window-film brands in the UAE
// (see data/seo-research.md). Brand mentions in our listing data are sparse, so
// these pages are editorial: what the brand is, its product tiers, warranty and
// UAE presence — then they link to the matching service hub + near-me page so the
// reader can find specialists. All facts are sourced in the research file; figures
// reflect manufacturer/authorised-installer info and should be confirmed with a
// local distributor before being treated as a guarantee.

export type BrandTier = { name: string; note: string };

export type Brand = {
  slug: string;
  name: string;
  // Short type line, e.g. "Paint protection film".
  type: string;
  // Service hub + near-me page this brand belongs to (internal linking).
  serviceCategory: string; // /business-category/<serviceCategory>
  nearMeSlug: string; // /<nearMeSlug>
  serviceLabel: string; // human label, e.g. "PPF"
  origin: string;
  positioning: string;
  // 2–3 sentence "what it is".
  summary: string;
  tiers: BrandTier[];
  warranty: string;
  // Editorial UAE distributor / installer note (sourced).
  uaePresence: string;
  // Build priority from the research (1 = build first).
  priority: 1 | 2;
};

export const BRANDS: Brand[] = [
  {
    slug: "xpel",
    name: "XPEL",
    type: "Paint protection film",
    serviceCategory: "paint-protection-film",
    nearMeSlug: "ppf-near-me",
    serviceLabel: "PPF",
    origin: "XPEL, Inc. — founded 1997, San Antonio, Texas, USA (Nasdaq: XPEL)",
    positioning: "Premium — the market-leading PPF brand in the UAE",
    summary:
      "XPEL is the best-known paint protection film brand in Dubai, valued for film clarity, durability and heat-activated self-healing — which works quickly in Gulf temperatures. It also offers window film and ceramic coatings, but PPF is its flagship.",
    tiers: [
      { name: "Ultimate Plus", note: "Clear gloss self-healing film — the flagship" },
      { name: "Stealth", note: "Satin/matte finish over factory paint" },
      { name: "Ultimate Fusion", note: "PPF with a built-in ceramic-style hydrophobic topcoat" },
    ],
    warranty:
      "10 years on Ultimate Plus and Stealth (against yellowing, cracking, blistering and delamination); Ultimate Fusion adds cover for oxidation and gloss.",
    uaePresence:
      "Backed by XPEL Middle East, with an official installer locator covering Dubai and Abu Dhabi. Known Dubai installers include PPS Dubai (Al Quoz), Dbmize, Wrapco and MAX WAX.",
    priority: 1,
  },
  {
    slug: "ceramic-pro",
    name: "Ceramic Pro",
    type: "Ceramic coating",
    serviceCategory: "ceramic-coating-service",
    nearMeSlug: "ceramic-coating-near-me",
    serviceLabel: "ceramic coating",
    origin: "Nanoshine Group Corp., USA — launched 2010",
    positioning: "Mass-premium, tiered — the most recognised ceramic brand globally",
    summary:
      "Ceramic Pro is a tiered nano-ceramic coating system that consumers often search for by package name (Gold, Silver, Bronze). Its ION line uses newer 'ION Exchange' chemistry, and the brand also offers KAVACA paint protection film.",
    tiers: [
      { name: "Gold", note: "Multi-layer flagship package — lifetime warranty" },
      { name: "Silver", note: "Mid package — 5-year warranty" },
      { name: "Bronze", note: "Entry package — 2-year warranty" },
      { name: "ION", note: "Newer ION-Exchange ceramic line (7-year)" },
    ],
    warranty:
      "Package-dependent: Gold = lifetime, Silver = 5 years, Bronze = 2 years, ION = 7 years. Like most professional ceramics, warranty requires annual inspections.",
    uaePresence:
      "Operates an official Dubai centre (Ceramic Pro Auto Detailing Services, Al Quoz Industrial 2), including a premium 'Millionaire's Club' studio.",
    priority: 1,
  },
  {
    slug: "3m",
    name: "3M",
    type: "Paint protection film & window tint",
    serviceCategory: "paint-protection-film",
    nearMeSlug: "ppf-near-me",
    serviceLabel: "PPF",
    origin: "3M Company, USA",
    positioning: "Premium global materials brand — strong recall in both PPF and tint",
    summary:
      "3M brings a global materials reputation to both paint protection (Scotchgard Pro Series) and window film (Crystalline, Ceramic IR, Color Stable). Its Crystalline tint is a prestige clear film with high heat rejection — popular for staying within UAE tint limits while cutting cabin heat.",
    tiers: [
      { name: "Scotchgard Pro Series (PPF)", note: "Self-healing paint protection film" },
      { name: "Crystalline (tint)", note: "Multilayer optical film — clear, high heat rejection" },
      { name: "Ceramic IR / Color Stable (tint)", note: "Nano-ceramic and fade-resistant dyed films" },
    ],
    warranty:
      "10-year PPF warranty when fitted by a 3M Certified Installer; limited lifetime warranty on window film against bubbling, peeling and purpling.",
    uaePresence:
      "3M UAE runs an Authorized Car Care network. Known dealers include Safa Automotive, Samrat Auto and CarPro3M.",
    priority: 1,
  },
  {
    slug: "v-kool",
    name: "V-KOOL",
    type: "Window film",
    serviceCategory: "auto-window-tinting-service",
    nearMeSlug: "window-tinting-near-me",
    serviceLabel: "window tinting",
    origin: "Brand of Eastman Chemical, USA",
    positioning: "Premium — a long-established prestige tint name in the Gulf",
    summary:
      "V-KOOL is a spectrally-selective sputtered window film especially popular in the UAE, where its clear-but-cool VK70 suits the climate and legal-shade preferences. It is sold on high optical clarity combined with strong heat rejection rather than darkness.",
    tiers: [
      { name: "VK70", note: "Flagship near-clear film (~70% VLT) with high solar rejection" },
      { name: "X-Series", note: "Darker shade options" },
      { name: "Solitaire", note: "Premium XIR tier" },
    ],
    warranty: "Manufacturer limited warranty (UAE terms commonly quoted from ~5 years — confirm locally).",
    uaePresence:
      "Long-established in the UAE via V-KOOL (Emirates) Trading, part of the KAPICO Group, with branches in Dubai, Abu Dhabi, Al Ain and Sharjah.",
    priority: 1,
  },
  {
    slug: "gtechniq",
    name: "Gtechniq",
    type: "Ceramic coating",
    serviceCategory: "ceramic-coating-service",
    nearMeSlug: "ceramic-coating-near-me",
    serviceLabel: "ceramic coating",
    origin: "UK — founded 2001, designed and made in Britain",
    positioning: "Premium / professional — a top enthusiast ceramic brand",
    summary:
      "Gtechniq makes professional 10H ceramic coatings favoured by detailing enthusiasts. Its flagship Crystal Serum Ultra is applied only by accredited installers and carries a long durability guarantee.",
    tiers: [
      { name: "Crystal Serum Ultra (CSU)", note: "Accredited-installer-only flagship" },
      { name: "Crystal Serum Light (CSL)", note: "Professional coating, up to ~5-year durability" },
      { name: "EXOv5", note: "Hydrophobic topcoat, often layered over CSL" },
    ],
    warranty: "Crystal Serum Ultra carries a 9-year guarantee when applied by an accredited installer.",
    uaePresence:
      "Distributed in the Middle East via Nasser Al Meraikhi Distribution; accredited applicators include MAX WAX, Apex Detail Studio and Abu Dhabi Motors.",
    priority: 1,
  },
  {
    slug: "stek",
    name: "STEK",
    type: "Paint protection film",
    serviceCategory: "paint-protection-film",
    nearMeSlug: "ppf-near-me",
    serviceLabel: "PPF",
    origin: "Korean-engineered; marketed via STEK USA",
    positioning: "Premium — a rising high-end PPF name",
    summary:
      "STEK's DYNO line is a premium Korean-engineered paint protection film sold on its thickness (~190 microns) and room-temperature self-healing. It is offered in gloss and matte finishes.",
    tiers: [
      { name: "DYNOshield", note: "Gloss, hydrophobic, self-healing" },
      { name: "DYNOmatte", note: "Matte finish PPF" },
    ],
    warranty: "10 years against delamination, yellowing, bubbling and cracking.",
    uaePresence:
      "Supported by official distributor STEK UAE-Oman (Dubai, established 2015); known installers include Detailing Dynamics, IPD and Pro Master.",
    priority: 2,
  },
  {
    slug: "gyeon",
    name: "Gyeon",
    type: "Ceramic coating",
    serviceCategory: "ceramic-coating-service",
    nearMeSlug: "ceramic-coating-near-me",
    serviceLabel: "ceramic coating",
    origin: "South Korea",
    positioning: "Premium / professional",
    summary:
      "Gyeon makes professional SiO₂/polysilazane ceramic coatings under its Q² EVO range, with Mohs as the flagship. Coatings are applied by certified detailers and offered with tiered durability or certified warranties.",
    tiers: [
      { name: "Q² Mohs EVO", note: "Flagship professional coating" },
      { name: "Q² Syncro EVO", note: "Two-layer system, up to ~50-month durability" },
      { name: "Q² Pro (Mohs+, Infinite)", note: "Certified-detailer pro tier" },
    ],
    warranty:
      "Durability up to ~50 months/50,000 km; formal certified-detailer warranties of 5 years, with an Infinite (maintenance-dependent) option.",
    uaePresence:
      "Distributed by Gyeon GCC (Dubai Investment Park) with a dedicated UAE store; detailers include Smart Auto UAE and Apex Detail Studio.",
    priority: 2,
  },
  {
    slug: "suntek",
    name: "SunTek",
    type: "Paint protection film & window tint",
    serviceCategory: "paint-protection-film",
    nearMeSlug: "ppf-near-me",
    serviceLabel: "PPF",
    origin: "Eastman Performance Films (Eastman Chemical), USA",
    positioning: "Mid-to-premium — strong value positioning",
    summary:
      "SunTek offers both paint protection film and window tint, marketed on value and 2-in-1 PPF/hydrophobic technology. Its Reaction film is an ultra-clear premium option.",
    tiers: [
      { name: "Ultra", note: "Gloss self-healing PPF" },
      { name: "Reaction", note: "Premium ultra-clear PPF" },
      { name: "Evolve (tint)", note: "Premium ceramic window film" },
    ],
    warranty: "10 years on Ultra PPF; 12 years on Reaction; limited lifetime on window film.",
    uaePresence:
      "Distributed in the UAE via Al Ghurair Motors, which opened Dubai's first exclusive authorised SunTek car-care centre.",
    priority: 2,
  },
  {
    slug: "llumar",
    name: "LLumar",
    type: "Window tint & paint protection film",
    serviceCategory: "auto-window-tinting-service",
    nearMeSlug: "window-tinting-near-me",
    serviceLabel: "window tinting",
    origin: "Eastman Performance Films (Eastman Chemical), USA",
    positioning: "Mainstream-premium — established tint name with a PPF line",
    summary:
      "LLumar is a widely-fitted window-film brand spanning entry dyed film to infrared-rejecting ceramic, and also makes the Valor paint protection film. Its CTX and IRX ceramic tints target high heat rejection.",
    tiers: [
      { name: "IRX (tint)", note: "Infrared ceramic film, ~88% IR rejection" },
      { name: "CTX (tint)", note: "Nano-ceramic film, ~70% IR rejection" },
      { name: "Valor (PPF)", note: "Premium self-healing paint protection film" },
    ],
    warranty: "Limited lifetime warranty on window film; Valor PPF up to 12 years.",
    uaePresence:
      "Distributed in the UAE via CPF Emirates, with a LLumar Professional Film presence on Sheikh Zayed Road.",
    priority: 2,
  },
  {
    slug: "igl-coatings",
    name: "IGL Coatings",
    type: "Ceramic coating",
    serviceCategory: "ceramic-coating-service",
    nearMeSlug: "ceramic-coating-near-me",
    serviceLabel: "ceramic coating",
    origin: "Malaysia",
    positioning: "Premium (Kenzo) to DIY entry — eco-friendly, low-VOC differentiator",
    summary:
      "IGL Coatings makes low-VOC ceramic coatings, with graphene-reinforced flagship lines. Ecocoat Kenzo is its professional-only top coating, alongside more accessible Quartz and graphene options.",
    tiers: [
      { name: "Ecocoat Kenzo", note: "Graphene-reinforced professional flagship" },
      { name: "Ecocoat Quartz+", note: "Professional ceramic, up to ~8-year" },
      { name: "Graphene / EZ Graphene", note: "More accessible graphene options" },
    ],
    warranty: "Kenzo up to 10 years (5-year standard); Quartz+ up to 8 years, with mandatory annual maintenance.",
    uaePresence:
      "Applied via certified studios in Dubai and Sharjah, including Aesthetic Detail Studio (a Kenzo specialist), Smart Auto UAE and Apex Detail Studio.",
    priority: 2,
  },
];

const BY_SLUG = new Map(BRANDS.map((b) => [b.slug, b]));

export function getBrand(slug: string): Brand | undefined {
  return BY_SLUG.get(slug);
}

export function brandSlugs(): string[] {
  return BRANDS.map((b) => b.slug);
}
