import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import contentService from "../services/content.service.js";
import qdrantService from "../services/qdrant.service.js";
import tagService from "../services/tag.service.js";
import groqService from "../services/groq.service.js";
import mongoose from "mongoose";
import { chunkContent } from "../utils/helpers.js";

export const createContent = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { title, documentType, content, tags = [] } = req.body;

        let allTags = [];

        if (tags.length > 0) {
            allTags = await tagService.getSpecificTags(tags);

            if (allTags.length !== tags.length) {
                return res.status(400).json({
                    message: "One or more tags do not exist",
                });
            }
        }

        const { baseContent, qdrantRes } = await session.withTransaction(
            async () => {
                const [baseContent] = await contentService.createContent(
                    [
                        {
                            title,
                            documentType,
                            content,
                            tags,
                            user: req.user._id,
                        },
                    ],
                    session,
                );

                baseContent.tags = allTags;

                const chunkPoints = await chunkContent(baseContent);

                const qdrantRes =
                    await qdrantService.upsertContentVectorPoints(chunkPoints);

                return { baseContent, qdrantRes };
            },
        );

        return res.status(201).json({
            message: "Content created successfully",
            content: baseContent,
            qdrantRes,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Something went wrong",
        });
    } finally {
        await session.endSession();
    }
};

export const getContents = async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.max(Number(req.query.limit) || 10, 1);

        const result = await contentService.getContents(
            req.user._id,
            page,
            limit,
        );

        const contents = result[0]?.contents || [];
        const totalCount = result[0]?.totalCount[0]?.count || 0;

        return res.status(200).json({
            contents,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

export const updateContent = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id } = req.params;
        const { title, documentType, content, tags } = req.body;

        const {updatedContent, qdrantRes} = await session.withTransaction(async () => {
            const updatedContent = await contentService.updateContent(
                id,
                req.user._id,
                {
                    title,
                    documentType,
                    content,
                    tags,
                },
                session,
            );
            
            if (!updatedContent) return null;

            console.log(updatedContent);

            const chunkPoints = await chunkContent(updatedContent);

            await qdrantService.deleteContent(id, req.user._id);

            const qdrantRes = await qdrantService.upsertContentVectorPoints(chunkPoints);

            return {updatedContent, qdrantRes};
        });

        if (!updatedContent) {
            return res.status(404).json({
                message: "Content not found",
            });
        }

        return res.status(200).json({
            message: "Content updated successfully",
            content: updatedContent,
            qdrantRes
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Something went wrong",
        });
    } finally {
        await session.endSession();
    }
};

export const deleteContent = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await mongoose.startSession();

        const result = await session.withTransaction(async () => {
            const deletedContent = await contentService.deleteContent(
                id,
                req.user._id,
            );

            if (!deletedContent) return;

            await qdrantService.deleteContent(id, req.user._id);

            return deletedContent;
        });

        if (!result) {
            return res.status(404).json({
                message: "Content not found",
            });
        }

        return res.status(200).json({
            message: "Content deleted successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong",
        });
    } finally {
        await session.endSession();
    }
};

export const queryContent = async (req, res) => {
    try {
        const { query } = req.body;

        const result = await qdrantService.queryContent(query);

        const aiResult = await groqService.generateResponse(query, result);

        // console.log(aiResult.choices[0]?.message?.content || "");
        return res.status(200).json({
            aiResult: aiResult.choices[0]?.message?.content || "",
            result,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

export const sampleSeed = async (req, res) => {
    try {
        // const allTags = await Tag.insertMany(tags, { ordered: false });
        // const allContents = await Content.insertMany(
        //     moreContentData,
        //     {
        //         ordered: false
        //     }
        // )

        // const qdrantRes = await qdrantService.upsertContentVectorPoints(allContents)

        // res.status(200).json({
        //     qdrantRes,
        //     allContents,
        //     message: "Tags added successfully",
        // });

        // const response = await groqService.generateResponse(
        //     "Explain the importance of low latency LLMs",
        // );

        // const resp = await qdrantService.sample();
        // console.log(req.body.text)
        const parentDoc = {
            content: `Wikipedia[e] is a free online encyclopedia written and maintained by a community of volunteer editors, known as Wikipedians, through open collaboration and the wiki software MediaWiki. Founded by Jimmy Wales and Larry Sanger in 2001, Wikipedia has been hosted since 2003 by the Wikimedia Foundation, an American nonprofit organization funded mainly by donations from readers.[1] Wikipedia is the largest and most read reference work in history. Initially available only in English, Wikipedia has grown to over 300 languages and is one of the world's most visited websites as of 2026. The English Wikipedia, with over 7 million articles, remains the largest of the editions, which together comprise more than 68 million articles and attract more than 1.5 billion unique device visits and 13 million edits per month (about five edits per second on average) as of April 2024.[4] As of December 2025, over 25% of Wikipedia's traffic comes from the United States, while Japan accounts for nearly 7%, and the United Kingdom, Germany, and Russia each represent around 5%.[5]`,

            _id: "6ac52508961417142339f45d",
            title: "sample-updated",
            documentType: "text",
            user: "6ac3de041ede7d6c17c0f446",
            tags: [
                {
                    name: "Sample-tag",
                },
                {
                    name: "Sample-tag",
                },
                {
                    name: "Sample-tag",
                },
            ],
        };

        const resp = await chunkContent(parentDoc);

        res.json(resp);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};
