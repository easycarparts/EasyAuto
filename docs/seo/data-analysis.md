# Data Analysis — what the 2026-06-29 Semrush pull tells us

_Raw files in [`data/`](data/). This is the evidence behind [`ppf-detailing-domination-plan.md`](ppf-detailing-domination-plan.md)._

## Snapshot (Domain Overview)

- Organic traffic **3.2K** (+21% MoM), organic keywords **3.2K** (+23%)
- **Authority Score 11**, **6 referring domains**, **6 backlinks**
- AI visibility 25, 49 mentions, 131 cited pages (ChatGPT cites 107) — real AEO channel
- Traffic hockey-sticks from Nov 2025; market is **AE** (the US Organic Research panel is noise)

## Finding 1 — We rank for business *names*, not *services*

From `easyauto.ae-organic.Positions-ae-...41_00.csv` (3,044 AE keywords):
- Positions #1–#9 are dominated by **navigational brand queries** — "well done car wash",
  "shiners", "gwm abu dhabi", "pro wash motor city" — won by accidental business-listing matches.
- This is low strategic value but proves listing pages *can* reach page 1.

## Finding 2 — Every commercial category term ranks page 4–8

| Keyword | Vol | KD | Current pos |
|---|---|---|---|
| ppf dubai | 590 | 33 | 71 |
| paint protection film dubai | 590 | — | 68 |
| car ppf near me | 110 | 7–28 | 68 |
| ppf film | 140 | 14 | 55 |
| ceramic coating abu dhabi | 140 | 5 | 44 |
| ceramic coating sharjah | 30 | — | 66 |
| car detailing sharjah | 480 | — | 34 |
| car detailing ajman | 70 | — | 23–42 |
| car polishing sharjah | 140 | — | 53 |
| tinting dubai / dubai tinting | 170 | — | 67–68 |
| car tinting al quoz | 140 | 12 | 23 |
| tint shop near me | 320 | — | 70 |

**Conclusion:** thin toeholds on every money term, zero hub pages, nothing in the strike zone.
This is a textbook rank-depth problem and the entire opportunity.

## Finding 3 — Difficulty favors ceramic & tint over PPF

- **Ceramic coating:** KD 5–13 across geo terms; `ceramic coating` 1,600 KD 9, `ceramic coating dubai`
  390 KD 13, Abu Dhabi 140 **KD 5**, Sharjah 110 **KD 5**.
- **Tinting:** high volume, KD 10–19; `car tint near me` 2,900, `car tinting dubai` 1,600,
  `car tinting abu dhabi` 590 KD 10.
- **PPF:** the head terms are **KD 32–33** (`ppf dubai`, `ppf in dubai`) — hardest of the four,
  though highest CPC ($6–7) and strategically tied to the owner's Grand Touch shop.
- **Caveat:** raw `ppf`/`xpel` exports are polluted — "ppf" 2,900 is mostly India Public Provident
  Fund (calculators, interest rates, SBI/HDFC); "xpel" 720 is mostly pharma (ambroxol cough syrup).
  Ignore those; target only car + geo qualified terms.

## Finding 4 — Backlinks are a co-primary lever (base is 6)

From `easyauto.ae-backlinks_matrix.csv` and `... (1).csv`:
- easyauto.ae column is **0 across the board** — we share almost no referring domains with competitors.
- Competitor profiles (ppfdubai.ae AS 6, ceramicpro.com AS 37, 3mae.ae, lexus.ae) are **mostly spam**:
  `seo-anomaly-*.site`, `bhs-links-<greek-god>.*`, blogspot, `*.web.app`, `*.firebaseapp.com`.
  Do **not** replicate these.
- The legitimately useful domains linking to competitors but not us are the realistic targets:
  khaleejtimes (71), thenationalnews (65), almrsal (53), albawaba (37), esquireme (43),
  harpersbazaararabia (44), dubicars (44), arabwheels (45), hidubai (48), eyeofriyadh (51),
  foodiva (39), zawya (49).
- **ppfdubai.ae (AS 6, spam-only profile) is directly beatable** on PPF terms with real content + a
  handful of genuine links.

## Finding 5 — Directory competitor set (AE)

From organic-competitors + gap files: yellowpagesae, trippinuae, dayofdubai, bestthings.ae,
hidubai, dubicars, arabwheels, yallamotor, zigwheels, plus niche players (ppfdubai.ae, ceramicpro,
3mae, lexus.ae). None dominate the geo-service long tail — it's open.

## File index (`data/`)

| File | What it is |
|---|---|
| `easyauto.ae-organic.Positions-ae-...41_00.csv` | **Full AE rankings (3,044 kw)** — most valuable |
| `easyauto.ae-organic.Positions-ae-...40_25.csv` | PPF-filtered position slice |
| `ceramic-coating_broad-match_ae_*.csv` | Ceramic keyword universe (AE) |
| `Car-tinting_broad-match_ae_*.csv` | Tinting keyword universe (AE) |
| `PPF_broad-match_ae_*.csv` | PPF universe (polluted w/ finance intent) |
| `ppf-coating_broad-match_ae_*.csv` | PPF-coating subset |
| `xpel_broad-match_ae_*.csv` | XPEL brand (polluted w/ pharma) |
| `detailing_broad-match_ae_*.csv` | Detailing universe (large — re-pull filtered) |
| `gap.keywords_...36_10.csv` | Keyword gap vs directory competitors (3,173 rows) |
| `gap.keywords_...39_19.csv` | Keyword gap vs PPF/ceramic competitors (3,183 rows) |
| `easyauto.ae-backlinks_matrix.csv` | Backlink gap vs directory competitors |
| `easyauto.ae-backlinks_matrix (1).csv` | Backlink gap vs PPF/ceramic/3M/lexus |
| `easyauto.ae-organic.Competitors-us-*.csv` | Competitor set (US db — directional only) |
