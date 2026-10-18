import Groq from "groq-sdk";

class GroqService {
    constructor() {
        this.client = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });
    }

    async getImageAnalysis(imageUrl, brief) {
        console.log({
            imageUrl,
            brief
        })
        
        const chatCompletion = await this.client.chat.completions.create({
            model: process.env.GROQ_VISION_MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "You extract searchable text from images for a personal knowledge base. Your output is used to create embeddings, so be factual and specific. " +
                        "Transcribe all visible text verbatim. Describe what the image shows, using the user's note to decide what to focus on. " +
                        "Describe only what is visible; never invent text, numbers or details. " +
                        "Return only JSON matching the schema.",
                },
                {
                    role: "user",
                    content: [
                        (brief && { type: "text", text: `User note: ${brief}` }),
                        { type: "image_url", image_url: { url: imageUrl } },
                    ].filter(Boolean),
                },
            ],
            temperature: 0.2,
            top_p: 1,
            max_completion_tokens: 10000,
            stream: false,
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "image_analysis",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            extractedText: {
                                type: "string",
                                description:
                                    "All text visible in the image, verbatim (titles, labels, axis names, handwriting). Empty string if there is no text.",
                            },
                            briefDescription: {
                                type: "string",
                                description:
                                    "Detailed description of what the image shows and the idea it conveys, guided by the user's note. Include key labels, structure, and trends. Visible content only.",
                            },
                        },
                        required: ["extractedText", "briefDescription"],
                        additionalProperties: false,
                    },
                },
            },
        });

        // console.log("-------------")
        // console.log(chatCompletion)
        // console.log("-------------")

        return JSON.parse(chatCompletion?.choices?.[0]?.message?.content || "{}");
    }

    async generateResponse(query = "", context = []) {
        if (!query || context.length === 0) return;

        console.log("query: ", query);
        console.log("context: ", context);

        const normalisedContext = context
            .map((item, index) => {
                return `Context ${index + 1}:\n${item.content}`;
            })
            .join("\n\n");

        return await this.client.chat.completions.create({
            model: process.env.GROQ_MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a RAG-based assistant. Answer the user's question using only the provided context. If the context is insufficient to answer, clearly state that. Do not invent facts. Keep your response concise and write it as a plain-text paragraph. Do not use Markdown, headings, bullet points, numbered lists, or any other formatting.",
                },
                {
                    role: "user",
                    content: `Context:\n${normalisedContext}\n\nQuestion: ${query}`,
                },
            ],
        });
    }
}

const groqService = new GroqService();

export default groqService;
