import sanitizeHtml from "sanitize-html";
import { parseDocument } from "htmlparser2";

type Attributes = Record<string, string>;

type HtmlNode = {
  type: string;
  data?: string;
  name?: string;
  attribs?: Attributes;
  children?: HtmlNode[];
};

const MAX_FEED_IMAGE_WIDTH = 1280;
const DESCRIPTION_MAX_LENGTH = 300;

const parseSrcset = (srcset: string) =>
  srcset
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/))
    .filter(([url, descriptor]) => url && /^\d+w$/.test(descriptor ?? ""))
    .map(([url, descriptor]) => ({ url: url!, width: parseInt(descriptor!, 10) }));

// feed readers ignore srcset, so the single src must be a bounded variant rather than the intrinsic-size fallback
export const pickFeedImage = (
  attribs: Attributes,
  maxWidth = MAX_FEED_IMAGE_WIDTH,
): Attributes | null => {
  const { srcset, sizes: _sizes, ...rest } = attribs;
  if (!rest.src) return null;
  const candidates = srcset ? parseSrcset(srcset) : [];
  if (candidates.length === 0) return rest;

  const fitting = candidates.filter((c) => c.width <= maxWidth);
  const chosen = fitting.length
    ? fitting.reduce((a, b) => (b.width > a.width ? b : a))
    : candidates.reduce((a, b) => (b.width < a.width ? b : a));

  const width = Number(rest.width);
  const height = Number(rest.height);
  const out: Attributes = { ...rest, src: chosen.url };
  if (width > 0 && height > 0) {
    out.width = String(chosen.width);
    out.height = String(Math.round((height * chosen.width) / width));
  } else {
    delete out.width;
    delete out.height;
  }
  return out;
};

const toAbsolute = (value: string, site: URL | string) => {
  try {
    return new URL(value, site).href;
  } catch {
    return undefined;
  }
};

export const toFeedHtml = (html: string, site: URL | string) =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height"],
    },
    transformTags: {
      img: (tagName, attribs) => {
        const picked = pickFeedImage(attribs);
        const src = picked && toAbsolute(picked.src!, site);
        if (!src) return { tagName, attribs: {} };
        return { tagName, attribs: { ...picked, src } };
      },
      a: (tagName, attribs) => {
        const href = attribs.href && toAbsolute(attribs.href, site);
        if (href) return { tagName, attribs: { ...attribs, href } };
        const { href: _dropped, ...rest } = attribs;
        return { tagName, attribs: rest };
      },
    },
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  });

const BLOCK_TAGS = new Set([
  "p", "div", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "br", "hr", "tr", "td", "th", "table", "figure", "figcaption",
]);

// inline tags like strong and a must not introduce spaces, or punctuation after them drifts
const collectText = (node: HtmlNode, parts: string[]): void => {
  if (node.type === "text") {
    parts.push(node.data ?? "");
    return;
  }
  if (node.name === "img") {
    parts.push(" ", node.attribs?.alt ?? "", " ");
    return;
  }
  if (node.name === "script" || node.name === "style") return;
  const block = node.name !== undefined && BLOCK_TAGS.has(node.name);
  if (block) parts.push(" ");
  for (const child of node.children ?? []) collectText(child, parts);
  if (block) parts.push(" ");
};

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  const cut = text.lastIndexOf(" ", maxLength);
  return text.slice(0, cut > 0 ? cut : maxLength) + "…";
};

export const toFeedText = (html: string, maxLength = DESCRIPTION_MAX_LENGTH) => {
  const parts: string[] = [];
  collectText(parseDocument(html), parts);
  return truncate(parts.join("").replace(/\s+/g, " ").trim(), maxLength);
};
