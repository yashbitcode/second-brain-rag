import { v4 as uuidv4 } from "uuid";
import { QdrantClient } from "@qdrant/js-client-rest";

class QdrantService {
    constructor() {
        this.collectionName = process.env.QDRANT_COLLECTION_NAME;
        this.embeddingModel = process.env.EMBEDDING_MODEL;

        this.client = new QdrantClient({
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY,
        });

        this.initialize();
    }

    async initialize() {
        const collections = await this.client.getCollections();

        const collectionExists = collections.collections.some(
            (collection) => collection.name === this.collectionName,
        );

        if (!collectionExists) {
            await this.client.createCollection(this.collectionName, {
                vectors: {
                    size: 384,
                    distance: "Cosine",
                },
            });

            console.log(`Qdrant collection "${this.collectionName}" created`);
        }
    }

    async queryContent(query) {
        if(!query) return [];

        const queryResult = await this.client.query(this.collectionName, {
            query: {
                text:  query,
                model: this.embeddingModel,
            },
            limit: 5,
            with_payload: ["content"],
            // with_vector: true
        });

        console.dir(queryResult, {depth: null})

        return queryResult.points.map((res) => ({score: res.score, content: res.payload?.content, vector: res.vector}))
    }

    async upsertContentVectorPoints(contents) {
        const points = contents.map((content) => ({
            id: uuidv4(),

            vector: {
                text: content.content,
                model: this.embeddingModel,
            },

            payload: {
                contentId: content._id.toString(),
                title: content.title,
                content: content.content,
                documentType: content.documentType,
                userId: content.user.toString(),
                updatedAt: content.updatedAt,
            },
        }));

        return await this.client.upsert(this.collectionName, {
            points,
        });
    }
}

const qdrantService = new QdrantService();

export default qdrantService;
