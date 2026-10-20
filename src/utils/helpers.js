import { v4 as uuidv4 } from "uuid";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const chunkContent = async (
    baseContent,
    chunkSize = 500,
    chunkOverlap = 120,
) => {
    if (!baseContent) return [];

    const { contentId, title, user, tags, content } = baseContent;

    const allTags = tags?.map((tag) => tag.name) || [];

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
    });

    const chunks = await splitter.splitText(content);

    return chunks.map((chunk, idx) => ({
        id: uuidv4(),
        vector: {
            text: chunk,
            model: process.env.EMBEDDING_MODEL,
        },
        payload: {
            chunkIdx: idx,
            content: chunk,
            contentId,
            title,
            userId: user,
            tags: allTags,
        },
    }));
};

export const isValidYouTubeUrl = (value) => {
    try {
        const url = new URL(value);

        return (
            ["http:", "https:"].includes(url.protocol) &&
            [
                "youtube.com",
                "www.youtube.com",
                "m.youtube.com",
                "youtu.be",
                "www.youtu.be",
            ].includes(url.hostname) &&
            ((url.pathname === "/watch" && !!url.searchParams.get("v")) ||
                /^\/(shorts|embed|live)\/[a-zA-Z0-9_-]{11}\/?$/.test(
                    url.pathname,
                ) ||
                (/^\/[a-zA-Z0-9_-]{11}\/?$/.test(url.pathname) &&
                    url.hostname.endsWith("youtu.be"))) &&
            (url.searchParams.get("v")?.match(/^[a-zA-Z0-9_-]{11}$/) ||
                url.pathname.match(/\/([a-zA-Z0-9_-]{11})\/?$/))
        );
    } catch {
        return false;
    }
};

export const extractTranscripts = async (url) => {
    const content = await fetchTranscript(url, { lang: "en" });
    const text = content.map((el) => el.text).join(" ");

    fs.writeFileSync("content.txt", text);
};
