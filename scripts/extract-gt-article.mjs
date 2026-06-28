import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundle = readFileSync(resolve(root, ".tmp-gt-bundle.js"), "utf8");

const slug = process.argv[2] ?? "ppf-vs-ceramic-dubai";

const anchors = {
  "ppf-vs-ceramic-dubai": {
    start: "content:`Most Dubai car owners don",
    end: "most sensible plan (not the biggest spend).`",
    title: "PPF vs Ceramic in Dubai: Which One Do You Really Need (and Why)?",
    excerpt:
      "Understand the real difference between PPF and ceramic coating in Dubai so you choose the right protection for your car.",
    cover: "https://www.grandtouchauto.ae/blog-hero-ppf-ceramic-dubai-choice.png",
  },
};

const a = anchors[slug];
if (!a) {
  console.error("Unknown slug", slug);
  process.exit(1);
}

const startIdx = bundle.indexOf(a.start);
const endIdx = bundle.indexOf(a.end);
if (startIdx < 0 || endIdx < 0) {
  console.error("Could not locate article in bundle", { startIdx, endIdx });
  process.exit(1);
}

const tick = bundle.indexOf("`", startIdx + 7) + 1;
const contentMd = bundle.slice(tick, endIdx + a.end.length - 1);

function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let inList = false;

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }
    if (t.startsWith("## ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h2>${inline(t.slice(3))}</h2>`);
    } else if (t.startsWith("### ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h3>${inline(t.slice(4))}</h3>`);
    } else if (t.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(t.slice(2))}</li>`);
    } else if (/^\d+\. /.test(t)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p>${inline(t)}</p>`);
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p>${inline(t)}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function inline(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => {
      const url = href.startsWith("http")
        ? href
        : href.startsWith("/")
          ? `https://www.grandtouchauto.ae${href}`
          : href;
      return `<a href="${url}" rel="noopener noreferrer">${text}</a>`;
    });
}

const article = {
  title: a.title,
  excerpt: a.excerpt,
  cover_image_url: a.cover,
  og_image_url: a.cover,
  meta_title: "PPF vs Ceramic in Dubai: Which One Do You Really Need?",
  meta_description:
    "Understand the real difference between PPF and ceramic coating in Dubai so you choose the right protection for heat, sand, chips, and gloss.",
  author_name: "Sean, Grand Touch Studio",
  content: mdToHtml(contentMd),
  slug,
};

writeFileSync(resolve(root, ".tmp-gt-article.json"), JSON.stringify(article, null, 2));
console.log(JSON.stringify({ title: article.title, contentLen: article.content.length }));
