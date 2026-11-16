import type { HastPluginDefinition } from "satteri";
import type { SatteriAstroData } from "@astrojs/markdown-satteri";

const isLocalPath = (src: string) => !URL.canParse(src) && !src.startsWith("/");

// astro only optimizes images written as markdown, so raw <img> tags are registered as local images here
export const htmlImages = (): HastPluginDefinition => ({
  name: "html-images",
  element: {
    filter: ["img"],
    visit(node, ctx) {
      const props = node.properties ?? {};
      const src = typeof props.src === "string" ? props.src : undefined;
      if (!src || !isLocalPath(src)) return;
      const astro = ctx.data.astro as SatteriAstroData | undefined;
      astro?.localImagePaths.add(decodeURI(src));
      // the image service needs numeric sizes, so css-style values like 100% are dropped
      for (const key of ["width", "height"]) {
        const value = props[key];
        if (value !== undefined && !/^\d+$/.test(String(value))) ctx.setProperty(node, key, null);
      }
    },
  },
});
