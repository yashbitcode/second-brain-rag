import { Tag } from "../models/tag.model.js";
import { Content } from "../models/content.model.js";

class TagService {
    async createTag(tagData) {
        return await Tag.create(tagData);
    }

    async getSpecificTags(tags) {
        if(tags.length === 0) return 0;

        const tagSet = new Set(tags);

        const tagsDoc = await Tag.find({
            _id: {
                $in: [...tagSet],
            },
        });

        return tagsDoc;
    }

    async getTags() {
        return await Tag.find().sort({ name: 1 });
    }

    async findTagById(id) {
        return await Tag.findById(id);
    }

    async findTag(filters) {
        return await Tag.findOne(filters);
    }

    async updateTag(id, updateData) {
        return await Tag.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });
    }

    async isTagAttachedToContent(tagId) {
        return await Content.exists({
            tags: tagId,
        });
    }

    async deleteTag(id) {
        return await Tag.findByIdAndDelete(id);
    }
}

const tagService = new TagService();

export default tagService;
