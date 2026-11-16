import { getCollection } from "astro:content";

export const getPosts = async () =>
	(await getCollection("posts")).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
