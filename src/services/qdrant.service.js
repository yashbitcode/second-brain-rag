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

    async sample() {
        // const re = await this.client.createPayloadIndex(this.collectionName, {
        //     field_name: "title",
        //     field_schema: {
        //         type: "keyword",
        //         prefix: true
        //     },
        //     wait: true
        // })
        // console.log(re)

        // return await this.client.delete(this.collectionName, {
        //     filter: {
        //         must: [
        //             {
        //                 key: "contentId",
        //                 match: {
        //                     value: "6ac856162c5972f7dc9c30b2",
        //                 },
        //             },
        //         ],
        //     },
        //     wait: true
        // });

        // return this.client.deletePayloadIndex(this.collectionName, "title_lower")
        // return await this.client.query(this.collectionName, {
        //     // query: {
        //     //     text: "Docker",
        //     //     model: this.embeddingModel,
        //     // },
        //     with_payload: true,
        //     filter: {
        //         must: [
        //             {
        //                 key: "userId",
        //                 match: { value: "6ac3de041ede7d6c17c0f446" },
        //             },
        //         ],
        //     },
        //     limit: 5,
        // });
    }

    async deleteContent(contentId, userId) {
        if(!contentId || !userId) return;

        return await this.client.delete(this.collectionName, {
            filter: {
                must: [
                    {
                        key: "contentId",
                        match: {
                            value: contentId,
                        },
                    },
                    {
                        key: "userId",
                        match: {
                            value: userId,
                        },
                    },
                ],
            },
            wait: true
        });
    }

    async queryContent(query) {
        if (!query) return [];

        const queryResult = await this.client.query(this.collectionName, {
            query: {
                text: query,
                model: this.embeddingModel,
            },
            limit: 5,
            with_payload: ["content"],
            // with_vector: true
        });

        console.dir(queryResult, { depth: null });

        return queryResult.points.map((res) => ({
            score: res.score,
            content: res.payload?.content,
            vector: res.vector,
        }));
    }



    async upsertContentVectorPoints(points) {
        return await this.client.upsert(this.collectionName, {
            points,
            wait: true
        });
    }
}

const qdrantService = new QdrantService();

export default qdrantService;
