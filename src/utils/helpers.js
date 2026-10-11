import { v4 as uuidv4 } from "uuid";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const chunkContent = async (
    content,
    chunkSize = 500,
    chunkOverlap = 120,
) => {
    if (!content) return [];

    console.log(content)

    const tags = content.tags?.map((tag) => tag.name) || [];

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
    });

    const chunks = await splitter.splitText(content.content);

    return chunks.map((chunk, idx) => ({
        id: uuidv4(),
        vector: {
            text: chunk,
            model: process.env.EMBEDDING_MODEL,
        },
        payload: {
            chunkIdx: idx,
            content: chunk,
            contentId: content._id,
            title: content.title,
            userId: content.user,
            tags,
        },
    }));
};
