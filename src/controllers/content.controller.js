import contentService from "../services/content.service.js";
import qdrantService from "../services/qdrant.service.js";
import tagService from "../services/tag.service.js";
import groqService from "../services/groq.service.js";
import mongoose from "mongoose";
import { chunkContent, isValidYouTubeUrl } from "../utils/helpers.js";
import cloudinaryService from "../services/cloudinary.service.js";
import bullMQEntryService from "../services/bullMQEntry.service.js";
import { contentQueue } from "../queues/content.queue.js";
import { fetchTranscript } from "youtube-transcript";

export const createContent = async (req, res) => {
    const session = await mongoose.startSession();
    let uploadedImage = null;

    try {
        const {
            title,
            documentType,
            content,
            tags = [],
            imageShortNote,
            link,
        } = req.body;

        const file = req.file;

        const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;

        let allTags = [];

        if (documentType === "image" && !file) {
            return res.status(400).json({
                message: "Image file is required",
            });
        }

        if (documentType === "yt-link" && !isValidYouTubeUrl(link)) {
            return res.status(400).json({
                message: "Valid YT link is required",
            });
        }

        if (documentType === "text" && !content) {
            return res.status(400).json({
                message: "Content is required",
            });
        }

        if (parsedTags.length > 0) {
            allTags = await tagService.getSpecificTags(parsedTags);

            if (allTags.length !== new Set(parsedTags).size) {
                return res.status(400).json({
                    message: "One or more tags do not exist",
                });
            }
        }

        const YTTranscripts = await fetchTranscript(link, { lang: "en" });
        const YTTranscriptsFomatted = YTTranscripts.map((el) => el.text).join(
            " ",
        );

        if (documentType === "image") {
            uploadedImage = await cloudinaryService.uploadImage(file, allTags, {
                userId: req.user._id,
            });
        }

        let baseContent;
        let bullMQEntry;

        await session.withTransaction(async () => {
            const payload = {
                title,
                documentType,
                tags: parsedTags,
                user: req.user._id,
            };

            if (documentType === "image") {
                payload.image = uploadedImage;
                payload.imageShortNote = imageShortNote || "";
            } else {
                payload.link = documentType === "yt-link" ? link : undefined;
                payload.content =
                    documentType === "yt-link"
                        ? YTTranscriptsFomatted
                        : content;
            }

            [baseContent] = await contentService.createContent(
                [payload],
                session,
            );

            console.log("BC: ", baseContent);

            const jobId = `content-${baseContent._id}`;

            bullMQEntry = await bullMQEntryService.createEntry(
                [
                    {
                        jobId,
                        contentId: baseContent._id,
                        status: "pending",
                    },
                ],
                session,
            );
        });

        try {
            await contentQueue.add(
                "process-content",
                {
                    contentId: baseContent._id.toString(),
                    allTags: allTags || [],
                    userId: req.user._id,
                    operation: bullMQEntry.operation,
                },
                {
                    jobId: bullMQEntry.jobId,
                    removeOnComplete: true,
                    removeOnFail: true,
                },
            );
        } catch (error) {
            console.log(error);
            await bullMQEntryService.updateStatus(bullMQEntry.jobId, "failed");

            return res.status(503).json({
                message:
                    "Content saved, but the processing job could not be queued",
                contentId: baseContent._id,
            });
        }

        return res.status(201).json({
            message: "Content created and queued for processing",
            content: baseContent,
            job: bullMQEntry,
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
        const { title, documentType, content, tags, imageShortNote, link } = req.body;

        const file = req.file;

        const existingContent = await contentService.findContentById(
            id,
            req.user._id,
        );

        console.log("EXsiting content: ", existingContent);

        if (!existingContent) {
            return res.status(404).json({
                message: "Content not found",
            });
        }

        if (documentType && documentType !== existingContent.documentType) {
            return res.status(400).json({
                message: "Document type cannot be changed",
            });
        }

        const type = existingContent.documentType;

        if (type === "text" && !content?.trim()) {
            return res.status(400).json({
                message: "Content is required",
            });
        }

        if (type === "image" && !file) {
            return res.status(400).json({
                message: "Image file is required",
            });
        }

        if (documentType === "yt-link" && !isValidYouTubeUrl(link)) {
            return res.status(400).json({
                message: "Valid YT link is required",
            });
        }

        const parsedTags = !tags
            ? existingContent.tags.map((tag) => tag?._id?.toString())
            : typeof tags === "string"
              ? JSON.parse(tags)
              : tags;

        console.log(parsedTags);

        const allTags =
            parsedTags && parsedTags.length > 0
                ? await tagService.getSpecificTags(parsedTags)
                : [];

        if (allTags.length !== new Set(parsedTags).size) {
            return res.status(400).json({
                message: "One or more tags do not exist",
            });
        }

        let uploadedImage;

        if (type === "image") {
            await cloudinaryService.deleteImage(existingContent.image.publicId);

            uploadedImage = await cloudinaryService.uploadImage(file, allTags, {
                userId: req.user._id,
            });
        }

        const YTTranscripts = await fetchTranscript(link, { lang: "en" });
        const YTTranscriptsFomatted = YTTranscripts.map((el) => el.text).join(
            " ",
        );

        const { bullMQEntry, updatedContent } = await session.withTransaction(
            async () => {
                const payload = {
                    title,
                    tags: parsedTags,
                };

                if (type === "image") {
                    payload.image = uploadedImage;
                    payload.imageShortNote = imageShortNote || "";
                    payload.imageDescription = "";
                    payload.imageExtractText = "";
                } else {
                    payload.link =
                        documentType === "yt-link" ? link : undefined;
                    payload.content =
                        documentType === "yt-link"
                            ? YTTranscriptsFomatted
                            : content;
                }

                console.log("PAYLOAD:  ", payload)

                const updatedContent = await contentService.updateContent(
                    id,
                    req.user._id,
                    payload,
                    session,
                );

                if (!updatedContent) throw new Error("Content not found");

                console.log("Updated content: ", updatedContent);

                const jobId = `content-update-${updatedContent._id}-${Date.now()}`;

                const bullMQEntry = await bullMQEntryService.createEntry(
                    [
                        {
                            jobId,
                            contentId: updatedContent._id,
                            status: "pending",
                            operation: "update",
                        },
                    ],
                    session,
                );

                return { bullMQEntry, updatedContent };
            },
        );

        // console.log({
        //     bullMQEntry,
        //     updatedContent,
        // });

        try {
            await contentQueue.add(
                "process-content",
                {
                    contentId: updatedContent._id.toString(),
                    allTags,
                    userId: req.user._id.toString(),
                    operation: bullMQEntry.operation,
                },
                {
                    jobId: bullMQEntry.jobId,
                    removeOnComplete: true,
                    removeOnFail: true,
                },
            );
        } catch (error) {
            await bullMQEntryService.updateStatus(bullMQEntry.jobId, "failed");

            return res.status(503).json({
                message: "Content updated, but processing could not be queued",
            });
        }

        return res.status(200).json({
            message: "Content updated and processing queued successfully",
            content: updatedContent,
            job: bullMQEntry,
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
            aiResult:
                aiResult?.choices[0]?.message?.content ||
                "I don't have the required context to answer this question",
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
        // console.log(await cloudinaryService.deleteImage("samples/zoom"));

        const ab = await contentService.updateContent(
            "6ad4ed50c5905c12aee45227",
            "6ac3de041ede7d6c17c0f446",
            {
                imageShortNote: "Image info",
                imageDescription: "Image info",
                imageExtractText: "Image info",
            },
        );

        res.json({
            ab,
            message: "Image received",
            // file: {
            //     originalname: req.file.originalname,
            //     mimetype: req.file.detectedMimeType,
            //     ext: req.file.detectedExtension,
            //     size: req.file.size,
            // },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};
