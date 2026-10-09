import Groq from "groq-sdk";

class GroqService {
    constructor() {
        this.client = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });
    }

    async generateResponse(query = "", context = []) {
        if (!query || context.length === 0) return;

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
