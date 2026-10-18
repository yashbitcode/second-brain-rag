import { Content } from "../models/content.model.js";
import "../models/tag.model.js";

class ContentService {
    async createContent(contentData, session = null) {
        return await Content.create(contentData, {session});
    }

    async findContentById(id, userId) {
        return await Content.findOne({
            _id: id,
            user: userId,
        });
    }

    async getContents(userId, page, limit) {
        const skip = (page - 1) * limit;

        return await Content.aggregate([
            {
                $match: {
                    user: userId,
                },
            },

            {
                $sort: {
                    createdAt: -1,
                },
            },

            {
                $facet: {
                    contents: [
                        {
                            $skip: skip,
                        },
                        {
                            $limit: limit,
                        },
                        {
                            $lookup: {
                                from: "tags",
                                localField: "tags",
                                foreignField: "_id",
                                pipeline: [
                                    {
                                        $project: {
                                            _id: 1,
                                            name: 1
                                        }
                                    }
                                ],
                                as: "tags",
                            },
                        },
                    ],

                    totalCount: [
                        {
                            $count: "count",
                        },
                    ],
                },
            },
        ]);
    }

    async updateContent(id, userId, updateData, session = null) {
        return await Content.findOneAndUpdate(
            {
                _id: id,
                user: userId,
            },
            updateData,
            {
                returnDocument: "after",
                session,
                populate: {path: "tags"}
            },
        )
    }

    async deleteContent(id, userId, session = null) {
        return await Content.findOneAndDelete({
            _id: id,
            user: userId,
        }).session(session);
    }
}

const contentService = new ContentService();

export default contentService;
