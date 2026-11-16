# astro-netlifecity-template

A small template for a personal website with its own RSS feed. The feed is picked
up by [feed.netlife.com](https://feed.netlife.com), so everything you post here
shows up there too.

## Getting started

You need [Node.js](https://nodejs.org) (version 26).

1. Make a copy of this repo (fork or "Use this template" on GitHub) and download it.
2. Open a terminal in the folder and run:

   ```sh
   npm install
   cp .env.example .env
   npm run dev
   ```

3. Open [localhost:4321](http://localhost:4321) in your browser.

## Writing posts

Each post is a Markdown file in the `src/content/` folder. Create a new file, for
example `src/content/my-first-post.md`:

```md
---
title: my first post
pubDate: 2026-11-06
---

Write whatever you like here. **Bold text**, [links](https://example.com),
lists and images work like regular Markdown.

![a gif](../assets/wink.gif)
```

## What you need to know

- **`title`** and **`pubDate`** must be present at the top of the file.
- Posts are shown newest first on the front page and in the feed.
- Put images in `src/assets/` and link to them with `../assets/<filename>`.
- The build stops if an image is wider or taller than 4000 px or larger than
  10 MB, so scale such images down before adding them.
- Posts also appear in RSS readers. The feed strips scripts and anything other
  than plain text, links and images.
- The filename becomes part of the link to the post, so use lowercase letters
  and hyphens.

## Changing the look and pages

- `src/pages/index.astro` is the front page.
- `src/layouts/Layout.astro` is the frame around every page (header, footer, RSS button).
- `src/styles/global.css` holds the styles. The project uses [Tailwind](https://tailwindcss.com).
- Want a new page? Create a new `.astro` file in `src/pages/`. `hemmelig.astro`
  becomes `/hemmelig`, for example.

## The RSS feed

The feed lives at `/rss.xml` and is generated automatically from the posts. You
change the feed's title and description in `src/pages/rss.xml.ts`. This is the
address you submit to feed.netlife.com.

## Publishing

`npm run build` creates a finished static version in `dist/`. It can be hosted
anywhere that serves static files, such as Netlify, Vercel or GitHub Pages.
Wherever you publish, `SITE_URL` must be set as an environment variable in the
service's build settings (for example `https://myname.vercel.app`). It is the
address the site lives at, and the links in the RSS feed are built from it. If
it is missing, the build stops. Locally it is enough to have run
`cp .env.example .env` as shown above.

The easiest route is to push the project to GitHub and connect the repo to
[Vercel](https://vercel.com) or [Netlify](https://netlify.com), for example.
The site is then built and published automatically every time you push a change.

## Commands

| Command           | What it does                  |
| ----------------- | ----------------------------- |
| `npm run dev`     | Starts the local dev server   |
| `npm run build`   | Builds the site into `dist/`  |
| `npm run preview` | Serves the built site locally |

Curious about Astro? See [docs.astro.build](https://docs.astro.build).
