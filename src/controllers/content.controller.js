import { contentData, moreContentData, tags } from "../utils/dummy.js";
import { Tag } from "../models/tag.model.js";
import contentService from "../services/content.service.js";
import qdrantService from "../services/qdrant.service.js";
import tagService from "../services/tag.service.js";
import { Content } from "../models/content.model.js";
import groqService from "../services/groq.service.js";
import mongoose from "mongoose";

export const createContent = async (req, res) => {
    try {
        const { title, documentType, content, tags = [] } = req.body;

        if (tags.length > 1) {
            const allTagsExist = await tagService.doAllTagsExist(tags);

            if (!allTagsExist) {
                return res.status(400).json({
                    message: "One or more tags do not exist",
                });
            }
        }

        const newContent = await contentService.createContent({
            title,
            documentType,
            content,
            tags,
            user: req.user._id,
        });

        const qdrantRes = await qdrantService.upsertContentVectorPoints([
            newContent,
        ]);

        return res.status(201).json({
            message: "Content created successfully",
            content: newContent,
            qdrantRes,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong",
        });
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

        const result = await session.withTransaction(async () => {
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
            

            console.log(updatedContent)

            const a = await qdrantService.deleteContent(id, req.user._id);
            console.log(a)
            const b = await qdrantService.upsertContentVectorPoints([updatedContent]);
            console.log(b)
            return updatedContent;
        });

        if (!result) {
            return res.status(404).json({
                message: "Content not found",
            });
        }

        return res.status(200).json({
            message: "Content updated successfully",
            content: result,
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

        const resp = await qdrantService.sample();

        res.json(resp);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};
