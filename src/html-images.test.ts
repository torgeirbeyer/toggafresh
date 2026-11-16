import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownToHtml } from "satteri";
import type { SatteriAstroData } from "@astrojs/markdown-satteri";
import { htmlImages } from "./html-images.ts";

const render = async (markdown: string) => {
  const astro: SatteriAstroData = {
    frontmatter: {},
    headings: [],
    localImagePaths: new Set(),
    remoteImagePaths: new Set(),
  };
  const seen: Record<string, unknown>[] = [];
  await markdownToHtml(markdown, {
    features: { rawHtml: true },
    hastPlugins: [
      htmlImages(),
      {
        name: "spy",
        element: {
          filter: ["img"],
          visit(node) {
            seen.push(node.properties ?? {});
          },
        },
      },
    ],
    data: { astro },
  });
  return { astro, seen };
};

test("raw img with a relative src is collected as a local image", async () => {
  const { astro } = await render('<img src="../assets/x.jpg" alt="x">');
  assert.ok(astro.localImagePaths.has("../assets/x.jpg"));
});

test("raw img inside a paragraph is collected too", async () => {
  const { astro } = await render('hei <img src="../assets/y.gif" alt="y"> der');
  assert.ok(astro.localImagePaths.has("../assets/y.gif"));
});

test("remote and root-relative srcs are left alone", async () => {
  const { astro } = await render(
    '<img src="https://example.com/a.jpg" alt="a">\n\n<img src="/b.jpg" alt="b">',
  );
  assert.equal(astro.localImagePaths.size, 0);
});

test("non-numeric width and height are dropped, numeric ones kept", async () => {
  const { seen } = await render(
    '<img src="../assets/x.jpg" alt="x" width="100%" height="auto">\n\n<img src="../assets/x.jpg" alt="x" width="320" height="200">',
  );
  // satteri hands a removed property to the next plugin as an empty string
  assert.ok(!seen[0]?.width);
  assert.ok(!seen[0]?.height);
  assert.equal(seen[1]?.width, 320);
  assert.equal(seen[1]?.height, 200);
});
