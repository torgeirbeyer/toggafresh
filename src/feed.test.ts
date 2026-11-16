import { test } from "node:test";
import assert from "node:assert/strict";
import { toFeedHtml, toFeedText, pickFeedImage } from "./feed.ts";

const SITE = "https://example.com";

test("text is not entity-escaped", () => {
  assert.equal(toFeedText("<p>R&amp;B &lt; jazz</p>"), "R&B < jazz");
});

test("description keeps alt text", () => {
  assert.equal(
    toFeedText('<p><img src="/a.webp" alt="en hund"></p><p>[kilde]</p>'),
    "en hund [kilde]",
  );
});

test("description has no stray spaces around inline markup", () => {
  assert.equal(
    toFeedText('<p><strong>fet</strong>, <a href="/">lenke</a>. Fet<em>kursiv</em>ord</p>'),
    "fet, lenke. Fetkursivord",
  );
});

test("description separates block elements with a space", () => {
  assert.equal(
    toFeedText("<h2>Tittel</h2><ul><li>en</li><li>to</li></ul>"),
    "Tittel en to",
  );
});

test("description is truncated at a word boundary", () => {
  const long = "<p>" + "ord ".repeat(100) + "</p>";
  const text = toFeedText(long, 20);
  assert.ok(text.length <= 21);
  assert.ok(text.endsWith("…"));
  assert.ok(!text.includes(" …"));
});

test("picks the largest candidate at or under the max width", () => {
  const out = pickFeedImage({
    src: "/full.webp",
    srcset: "/a.webp 640w, /b.webp 1280w, /c.webp 1920w",
    width: "3999",
    height: "3000",
    sizes: "100vw",
  });
  assert.ok(out);
  assert.equal(out.src, "/b.webp");
  assert.equal(out.width, "1280");
  assert.equal(out.height, "960");
  assert.equal(out.srcset, undefined);
  assert.equal(out.sizes, undefined);
});

test("picks the only candidate when all are smaller", () => {
  const out = pickFeedImage({
    src: "/w.webp",
    srcset: "/w.webp 19w",
    width: "19",
    height: "19",
  });
  assert.ok(out);
  assert.equal(out.src, "/w.webp");
  assert.equal(out.width, "19");
});

test("picks the smallest candidate when all are wider", () => {
  const out = pickFeedImage({
    src: "/x.webp",
    srcset: "/a.webp 1500w, /b.webp 2000w",
    width: "2000",
    height: "1000",
  });
  assert.ok(out);
  assert.equal(out.src, "/a.webp");
  assert.equal(out.height, "750");
});

test("feed html makes image src absolute and bounded", () => {
  const html = toFeedHtml(
    '<p><img src="/full.webp" srcset="/a.webp 640w, /c.webp 1920w" alt="x" width="1920" height="1080"></p>',
    SITE,
  );
  assert.match(html, /src="https:\/\/example\.com\/a\.webp"/);
  assert.match(html, /width="640"/);
  assert.doesNotMatch(html, /srcset=/);
});

test("feed html drops an image with an unparseable src", () => {
  const html = toFeedHtml(
    '<p>før <img src="http://exa mple.com/a.png" alt="x"> etter</p>',
    SITE,
  );
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /før\s+etter/);
});

test("feed html keeps link text when href is unparseable", () => {
  const html = toFeedHtml('<p><a href="http://[bad">tekst</a></p>', SITE);
  assert.match(html, /tekst/);
  assert.doesNotMatch(html, /href=/);
});

test("feed html strips scripts", () => {
  assert.doesNotMatch(
    toFeedHtml("<p>hei</p><script>alert(1)</script>", SITE),
    /script/,
  );
});
