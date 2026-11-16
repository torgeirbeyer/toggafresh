import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { findOversizedImages } from "./check-assets.ts";

let dir = "";
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "check-assets-"));
  await sharp({
    create: { width: 4001, height: 10, channels: 3, background: "#000" },
  })
    .png()
    .toFile(join(dir, "wide.png"));
  await sharp({
    create: { width: 10, height: 10, channels: 3, background: "#000" },
  })
    .png()
    .toFile(join(dir, "ok.png"));
  await writeFile(join(dir, "broken.jpg"), "not an image");
  await writeFile(join(dir, "notes.txt"), "ignored");
});
after(() => rm(dir, { recursive: true, force: true }));

test("flags images over 4000px on the longest side", async () => {
  const problems = await findOversizedImages(dir);
  assert.ok(problems.some((p) => p.includes("wide.png") && p.includes("4000")));
});

test("flags files that cannot be read as images", async () => {
  const problems = await findOversizedImages(dir);
  assert.ok(problems.some((p) => p.includes("broken.jpg")));
});

test("ignores ok images and non-image files", async () => {
  const problems = await findOversizedImages(dir);
  assert.ok(
    !problems.some((p) => p.includes("ok.png") || p.includes("notes.txt")),
  );
});

test("missing dir is not an error", async () => {
  assert.deepEqual(await findOversizedImages(join(dir, "nope")), []);
});
