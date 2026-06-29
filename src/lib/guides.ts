// SEO guide cluster (Phase 4).
//
// Fact-grounded, genuinely useful guides targeting the informational queries UAE
// car owners actually search (see data/seo-research.md track C). Each guide links
// to the relevant near-me page, service hub and/or brand pages so the cluster
// feeds crawl depth and routes research-intent readers toward listings. Prices are
// indicative AED ranges from the research; regulations use the conservative
// reading where sources conflict.

export type GuideSection = { heading: string; body: string[] };

export type Guide = {
  slug: string;
  title: string;
  description: string;
  // Stable date for Article dateModified (no runtime Date needed).
  updated: string;
  intro: string;
  sections: GuideSection[];
  faqs: { question: string; answer: string }[];
  related: { label: string; href: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "ppf-vs-ceramic-coating",
    title: "PPF vs ceramic coating: which is right in the UAE?",
    description:
      "Paint protection film and ceramic coating do different jobs. A UAE-focused comparison of protection, cost, durability and when to combine both.",
    updated: "2026-06-29",
    intro:
      "Paint protection film (PPF) and ceramic coating are the two most popular ways to protect car paint in the UAE — but they are not the same thing, and the right choice depends on what you are protecting against. Here is how they compare for Gulf conditions.",
    sections: [
      {
        heading: "What each one actually does",
        body: [
          "PPF is a thick, clear, self-healing urethane film physically applied over the paint. It absorbs impacts — stone chips, sand abrasion and light scratches — which matters on UAE highways and in sandy conditions.",
          "A ceramic coating is a thin, hard, hydrophobic layer that chemically bonds to the paint. It does not stop stone chips, but it resists UV, chemical staining and water spotting, and makes dust and dirt far easier to rinse off — a real benefit given how quickly cars get dusty here.",
        ],
      },
      {
        heading: "Cost and durability",
        body: [
          "PPF is the bigger investment: roughly AED 3,500–6,000 for a front/partial kit and AED 6,900–15,500+ for full-body, with premium films (XPEL, STEK, SunTek) carrying 10-year warranties.",
          "Ceramic coating is cheaper: around AED 1,499 for entry coatings, AED 3,000–5,000 mid-tier, and AED 7,000+ for premium 10-year professional systems. Durability ranges from 1–2 years at the entry level to 10 years for top coatings, usually with annual inspections required.",
        ],
      },
      {
        heading: "Which should you choose — or do you need both?",
        body: [
          "If your priority is preventing physical damage to paint, choose PPF, at least on high-impact areas (bonnet, bumper, mirrors). If your priority is gloss, easy cleaning and UV/chemical resistance, choose a ceramic coating.",
          "Many UAE owners combine the two: PPF on impact zones, then a ceramic coating over the top (or PPF with a built-in ceramic topcoat like XPEL Ultimate Fusion) for the best of both. A good detailer will recommend a combination based on your car and budget.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is PPF or ceramic coating better for the UAE climate?",
        answer:
          "They protect against different things. PPF resists stone chips and sand abrasion; ceramic coating resists UV, staining and water spots and makes dust easier to wash off. Combining both is common in the UAE.",
      },
      {
        question: "Can you apply ceramic coating over PPF?",
        answer:
          "Yes. Applying a ceramic coating over PPF is a popular combination — the film handles impacts while the coating adds gloss, UV resistance and easier cleaning. Some films also include a ceramic-style topcoat.",
      },
    ],
    related: [
      { label: "PPF specialists near me", href: "/ppf-near-me" },
      { label: "Ceramic coating near me", href: "/ceramic-coating-near-me" },
      { label: "PPF cost in Dubai", href: "/guides/ppf-cost-in-dubai" },
    ],
  },
  {
    slug: "ppf-cost-in-dubai",
    title: "PPF cost in Dubai: what you should pay in 2026",
    description:
      "Realistic paint protection film prices in Dubai and the UAE — partial vs full-body, brand tiers, and how to spot film that is too cheap to be good.",
    updated: "2026-06-29",
    intro:
      "Paint protection film pricing in Dubai varies widely by coverage and film grade. These are realistic ranges so you can judge a quote and avoid both overpaying and buying inferior film.",
    sections: [
      {
        heading: "Typical PPF prices in Dubai",
        body: [
          "Partial or front kits (bonnet, bumper, mirrors, headlights) typically run AED 3,500–6,000. Full-body coverage in standard film generally runs AED 6,900–15,500, depending on the car's size and the film used.",
          "Premium full-body packages in top-tier film — for example XPEL Ultimate Plus or Stealth — commonly run AED 16,000–22,000. SUVs cost more than sedans because there is more surface area to cover.",
        ],
      },
      {
        heading: "Why the range is so wide",
        body: [
          "Film grade is the biggest factor. Quality PPF is aliphatic TPU with self-healing and a 10-year warranty; very cheap 'full body' offers often use inferior PVC that can yellow and is harder to remove cleanly.",
          "Installation quality matters just as much: proper coverage with wrapped edges and clean panel gaps takes skill and time. Certified installers will rarely quote full-body clear PPF on a sedan below about AED 6,500 — a much lower 'full body' price is a warning sign about the film or the workmanship.",
        ],
      },
      {
        heading: "How to get a fair quote",
        body: [
          "Decide your coverage first (partial vs full-body), then ask each installer which film brand and tier they fit and what the warranty covers. Compare like-for-like film, not just the headline price.",
          "Because much of the cost is labour and film grade, it pays to compare a few specialists. Browse PPF installers across the emirates and ask each for a written quote.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much does full-body PPF cost in Dubai?",
        answer:
          "Full-body PPF in standard film generally runs AED 6,900–15,500, and AED 16,000–22,000 for premium tiers like XPEL Ultimate Plus or Stealth. SUVs cost more than sedans.",
      },
      {
        question: "Why is some PPF so cheap?",
        answer:
          "Very low 'full body' prices usually mean inferior PVC film rather than quality self-healing TPU, or rushed installation. Certified installers rarely quote full-body sedan PPF below about AED 6,500.",
      },
    ],
    related: [
      { label: "PPF specialists near me", href: "/ppf-near-me" },
      { label: "XPEL PPF in the UAE", href: "/brands/xpel" },
      { label: "PPF vs ceramic coating", href: "/guides/ppf-vs-ceramic-coating" },
    ],
  },
  {
    slug: "ceramic-coating-price-uae",
    title: "Ceramic coating price in the UAE: a 2026 guide",
    description:
      "What ceramic coating costs in the UAE by tier and durability, what the price includes, and why very cheap coatings rarely last.",
    updated: "2026-06-29",
    intro:
      "Ceramic coating prices in the UAE span a wide range because 'ceramic coating' covers everything from a one-year entry product to a professional 10-year system. Here is what each tier costs and includes.",
    sections: [
      {
        heading: "Price by tier",
        body: [
          "Entry coatings (1–2 year durability) start around AED 1,499. Mid-tier coatings (roughly 5-year) typically run AED 3,000–5,000. Premium professional systems with up to 10-year durability run AED 7,000 and up.",
          "Luxury and performance cars cost more across the board because they need more careful preparation and often more correction work before coating.",
        ],
      },
      {
        heading: "What the price should include",
        body: [
          "A coating is only as good as the prep beneath it. A proper job includes a decontamination wash and at least single-stage paint correction so the coating bonds to clean, corrected paint — not over swirls and bonded contaminants.",
          "Most professional coatings require annual inspections to keep the warranty valid. Ask what is included: number of layers, paint correction stages, the brand and tier, and the maintenance schedule.",
        ],
      },
      {
        heading: "Why very cheap coatings rarely last",
        body: [
          "Sub-AED-900 'ceramic' deals are usually short-life entry products applied with minimal prep. They can look good for a few months, then degrade — especially under intense UAE UV.",
          "Brands to know at the professional end include Ceramic Pro, Gtechniq, Gyeon, Feynlab and IGL. The brand and tier, plus the prep, are what you are really paying for.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much does ceramic coating cost in the UAE?",
        answer:
          "Roughly AED 1,499 for entry (1–2 year) coatings, AED 3,000–5,000 mid-tier (~5 year), and AED 7,000+ for premium 10-year professional systems. Prep quality and the brand drive the price.",
      },
      {
        question: "How long does ceramic coating last?",
        answer:
          "From about 1–2 years for entry products up to 10 years for premium professional coatings — usually conditional on annual inspections and correct maintenance.",
      },
    ],
    related: [
      { label: "Ceramic coating near me", href: "/ceramic-coating-near-me" },
      { label: "Ceramic Pro in the UAE", href: "/brands/ceramic-pro" },
      { label: "PPF vs ceramic coating", href: "/guides/ppf-vs-ceramic-coating" },
    ],
  },
  {
    slug: "car-detailing-cost-dubai",
    title: "Car detailing cost in Dubai: 2026 price guide",
    description:
      "Typical car detailing prices in Dubai and the UAE by service level — interior, exterior, paint correction and full details — and what affects the price.",
    updated: "2026-06-29",
    intro:
      "Car detailing in Dubai ranges from a quick interior valet to multi-stage paint correction, and prices follow the level of work. Here is what to expect so you can match the service to your car's needs.",
    sections: [
      {
        heading: "Detailing prices by service level",
        body: [
          "Interior detailing typically runs AED 199–500, and exterior polishing around AED 349–650. A standard full detail generally costs AED 600–1,200.",
          "Premium full details run AED 1,500–3,000, and a full detail combined with a ceramic coating AED 2,000–4,500. A two-step paint correction adds roughly AED 600–1,200 depending on paint condition.",
        ],
      },
      {
        heading: "What affects the price",
        body: [
          "Vehicle size is the biggest factor — large SUVs commonly carry a 25–50% surcharge over a sedan rate. Paint condition is next: heavier swirl and scratch removal means more correction stages and more labour.",
          "Add-ons such as engine bay cleaning, leather conditioning, headlight restoration or a coating all add to the total. Always confirm exactly what is included before booking.",
        ],
      },
      {
        heading: "Getting the right service",
        body: [
          "Decide whether you need cleaning (a valet or wash-and-wax), correction (removing swirls and scratches), or protection (a wax, sealant or ceramic coating) — many full details combine all three.",
          "Compare a few detailing studios near you and ask each what their 'full detail' actually covers, since the term varies between shops.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much does a full car detail cost in Dubai?",
        answer:
          "A standard full detail typically runs AED 600–1,200; premium full details AED 1,500–3,000; and a full detail with ceramic coating AED 2,000–4,500. Large SUVs usually cost 25–50% more.",
      },
      {
        question: "Why do detailing prices vary so much?",
        answer:
          "The level of work drives the price — a quick valet is far cheaper than multi-stage paint correction. Vehicle size, paint condition and add-ons like coatings all affect the total.",
      },
    ],
    related: [
      { label: "Car detailing near me", href: "/car-detailing-near-me" },
      { label: "Ceramic coating price in the UAE", href: "/guides/ceramic-coating-price-uae" },
      { label: "Detailing & protection in the UAE", href: "/business-category/detailing-and-protection" },
    ],
  },
  {
    slug: "window-tint-law-uae",
    title: "Window tint law in the UAE: how dark can you go?",
    description:
      "A plain-English guide to UAE car window tint rules — the legal darkness limit, the windshield rule, fines and medical exemptions.",
    updated: "2026-06-29",
    intro:
      "Window tint is almost essential in the UAE heat, but it has to stay within the law. Here is what the rules commonly state — confirm the current limits with the RTA, as enforcement details can change.",
    sections: [
      {
        heading: "The legal tint limit",
        body: [
          "UAE rules commonly allow up to 50% tint darkness on the side and rear windows of private cars. The front windshield must be kept clear of dark tint (a clear heat-rejection film is the usual workaround).",
          "Some sources quote the limit in VLT (visible light transmission) terms instead, so if you want maximum legal darkness, ask the installer to confirm the film meets the current RTA standard and to keep proof of the film's rating.",
        ],
      },
      {
        heading: "Fines and enforcement",
        body: [
          "Exceeding the permitted darkness can lead to a fine commonly reported at AED 1,500, and you may be asked to remove the non-compliant film. Because figures and thresholds can be updated, treat the RTA as the authority.",
          "Tint is checked during vehicle testing and can be flagged in traffic stops, so it is worth staying within the limit rather than risking repeat fines.",
        ],
      },
      {
        heading: "Medical exemptions and choosing film",
        body: [
          "Drivers with certain medical conditions can apply for a darker-tint exemption, which requires approval through the RTA (typically supported by an approved doctor's report).",
          "For heat without going darker, choose a ceramic or nano-ceramic film: at the same legal shade it rejects far more infrared heat than basic dyed film. Premium brands (3M, V-KOOL, LLumar) cost more but reject more heat and carry stronger warranties.",
        ],
      },
    ],
    faqs: [
      {
        question: "How dark can car windows be tinted in the UAE?",
        answer:
          "UAE rules commonly allow up to 50% tint darkness on side and rear windows, with the windshield kept clear. Some sources state the limit in VLT terms — confirm the current RTA standard with your installer.",
      },
      {
        question: "What is the fine for illegal window tint in the UAE?",
        answer:
          "Over-tinting is commonly reported to carry a fine of AED 1,500, and you may be required to remove the film. Check the RTA for the current figure, as it can change.",
      },
    ],
    related: [
      { label: "Window tinting near me", href: "/window-tinting-near-me" },
      { label: "V-KOOL window film in the UAE", href: "/brands/v-kool" },
      { label: "Tinting & wrapping in the UAE", href: "/business-category/tinting-and-wrapping" },
    ],
  },
  {
    slug: "car-wrapping-cost-dubai",
    title: "Car wrapping cost in Dubai (and the rules)",
    description:
      "What a vinyl wrap costs in Dubai by car size and finish, how long it lasts, and the RTA colour-change rules you need to know.",
    updated: "2026-06-29",
    intro:
      "A vinyl wrap can change your car's colour or finish and protect the paint underneath — but in Dubai a colour change also has legal steps. Here is what wrapping costs and the rules to follow.",
    sections: [
      {
        heading: "Wrapping prices by size and finish",
        body: [
          "A full sedan wrap typically runs AED 3,500–8,000, and a full SUV wrap AED 5,000–12,000, depending on the vinyl brand and finish (gloss, matte, satin or carbon). Partial wraps and decals are cheaper, usually AED 1,500–3,000.",
          "Specialty finishes cost more, and quality cast vinyl typically lasts 3–7 years. Ask which brand of vinyl the installer uses and what warranty comes with it.",
        ],
      },
      {
        heading: "The RTA colour-change rules",
        body: [
          "If a wrap changes your car's colour, Dubai requires an RTA/CID colour-change permit and an update to your Mulkiya (registration), generally within about 30 days. Driving a colour-changed car without updating the registration can result in a fine (commonly reported around AED 800).",
          "Chrome, fluorescent and retroreflective wraps are not permitted on private vehicles. A reputable wrap shop will know the current process and can guide you through it.",
        ],
      },
      {
        heading: "Wrap, PPF or paint?",
        body: [
          "A wrap is for appearance with some paint protection and is fully reversible. PPF is for maximum impact protection and is usually clear. A full respray permanently changes the colour. Choose based on whether your goal is looks, protection, or a permanent change.",
          "If you mainly want to protect the original paint rather than restyle, compare wrapping against paint protection film before deciding.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much does it cost to wrap a car in Dubai?",
        answer:
          "A full sedan wrap typically runs AED 3,500–8,000 and a full SUV wrap AED 5,000–12,000, depending on the vinyl and finish. Partial wraps and decals are usually AED 1,500–3,000.",
      },
      {
        question: "Do I need to tell the RTA if I wrap my car a different colour?",
        answer:
          "Yes. A colour-change wrap in Dubai needs an RTA/CID colour-change permit and a Mulkiya update, generally within about 30 days. Unauthorised colour changes can be fined, and chrome or fluorescent wraps are not allowed on private cars.",
      },
    ],
    related: [
      { label: "Car wrapping near me", href: "/car-wrapping-near-me" },
      { label: "PPF vs ceramic coating", href: "/guides/ppf-vs-ceramic-coating" },
      { label: "Tinting & wrapping in the UAE", href: "/business-category/tinting-and-wrapping" },
    ],
  },
];

const BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]));

export function getGuide(slug: string): Guide | undefined {
  return BY_SLUG.get(slug);
}

export function guideSlugs(): string[] {
  return GUIDES.map((g) => g.slug);
}
