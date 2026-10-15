import contentService from "../services/content.service.js";
import qdrantService from "../services/qdrant.service.js";
import tagService from "../services/tag.service.js";
import groqService from "../services/groq.service.js";
import mongoose from "mongoose";
import { chunkContent } from "../utils/helpers.js";
import cloudinaryService from "../services/cloudinary.service.js";

export const createContent = async (req, res) => {
    const session = await mongoose.startSession();
    const file = req.file;

    let imgRes = null;

    try {
        const {
            title,
            documentType,
            content,
            tags = [],
            imageShortNote,
        } = req.body;

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
                const payload = {
                    title,
                    documentType,
                    tags,
                    user: req.user._id,
                };

                if (file) {
                    const result = await cloudinaryService.uploadImage(
                        file,
                        allTags,
                        {
                            userId: req.user._id,
                        },
                    );

                    imgRes = payload.image = result;
                    
                    const aiImageRes = await groqService.getImageAnalysis(imgRes.imageUrl, imageShortNote)

                    payload.image = imgRes;
                    payload.imageShortNote = imageShortNote || "";
                    payload.imageDescription = aiImageRes.briefDescription || "";
                    payload.imageExtractText = aiImageRes.extractedText || "";
                } else if (content) payload.content = content;

                const [baseContent] = await contentService.createContent(
                    [payload],
                    session,
                );

                const chunkPoints = await chunkContent({
                    contentId: baseContent._id,
                    title: baseContent.title,
                    user: baseContent.user,
                    tags: allTags,
                    content: baseContent.documentType === "text" ? baseContent.content : (baseContent.imageShortNote + " " + baseContent.imageDescription + " " + baseContent.imageExtractText)
                });

                console.log(chunkPoints)

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

        const { updatedContent, qdrantRes } = await session.withTransaction(
            async () => {
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

                const qdrantRes =
                    await qdrantService.upsertContentVectorPoints(chunkPoints);

                return { updatedContent, qdrantRes };
            },
        );

        if (!updatedContent) {
            return res.status(404).json({
                message: "Content not found",
            });
        }

        return res.status(200).json({
            message: "Content updated successfully",
            content: updatedContent,
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

        const result = await qdrantService.queryContent(query, req.user._id);

        const aiResult = await groqService.generateResponse(query, result);

        return res.status(200).json({
            aiResult: aiResult?.choices[0]?.message?.content || "I don't have the required context to answer this question",
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
        // console.log(req.file);

        res.json({
            message: "Image received",
            file: {
                originalname: req.file.originalname,
                mimetype: req.file.detectedMimeType,
                ext: req.file.detectedExtension,
                size: req.file.size,
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};
