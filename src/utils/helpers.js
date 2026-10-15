import { v4 as uuidv4 } from "uuid";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const chunkContent = async (
    baseContent,
    chunkSize = 500,
    chunkOverlap = 120,
) => {
    if (!baseContent) return [];

    const {contentId, title, user, tags, content} = baseContent;

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
