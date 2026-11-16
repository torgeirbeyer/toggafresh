import { readdir, stat } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { AstroIntegration } from "astro";

const MAX_SIDE_PX = 4000;
const MAX_FILE_MB = 10;
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

const listImages = async (dir: string) => {
  try {
    return (await readdir(dir, { recursive: true })).filter((name) =>
      IMAGE_EXTENSIONS.has(extname(name).toLowerCase()),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

export const findOversizedImages = async (dir: string) => {
  const problems: string[] = [];
  for (const name of await listImages(dir)) {
    const path = relative(process.cwd(), join(dir, name));
    const sizeMb = (await stat(path)).size / 1024 / 1024;
    if (sizeMb > MAX_FILE_MB) {
      problems.push(
        `${path} is ${sizeMb.toFixed(1)} MB, the limit is ${MAX_FILE_MB} MB.\n` +
          `  Compress or scale down the image before adding it.`,
      );
    }

    let width: number | undefined;
    let height: number | undefined;
    try {
      ({ width, height } = await sharp(path).metadata());
    } catch (error) {
      problems.push(
        `${path} could not be read as an image: ${(error as Error).message}`,
      );
      continue;
    }
    if (!width || !height) {
      problems.push(`${path} has no dimensions, cannot check its size.`);
      continue;
    }
    if (Math.max(width, height) > MAX_SIDE_PX) {
      problems.push(
        `${path} is ${width}×${height} px, the limit is ${MAX_SIDE_PX} px on the longest side.\n` +
          `  Scale it down, e.g.: magick ${path} -resize ${MAX_SIDE_PX}x${MAX_SIDE_PX}\\> ${path}`,
      );
    }
  }
  return problems;
};

export default (): AstroIntegration => {
  let assetsDir = "";
  return {
    name: "check-assets",
    hooks: {
      "astro:config:done": ({ config }) => {
        assetsDir = fileURLToPath(new URL("assets/", config.srcDir));
      },
      "astro:build:start": async ({ logger }) => {
        const problems = await findOversizedImages(assetsDir);
        if (problems.length === 0) return;
        for (const problem of problems) logger.error(problem);
        throw new Error(
          `Build stopped: ${problems.length} image(s) in ${relative(process.cwd(), assetsDir)} are too large or invalid.`,
        );
      },
    },
  };
};
