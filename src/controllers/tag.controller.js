import tagService from "../services/tag.service.js";

export const createTag = async (req, res) => {
    try {
        const { name } = req.body;
        console.log(req.body)

        const existingTag = await tagService.findTag({
            name,
        });

        if (existingTag) {
            return res.status(409).json({
                message: "Tag already exists",
            });
        }

        const tag = await tagService.createTag({
            name,
        });

        return res.status(201).json({
            message: "Tag created successfully",
            tag,
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

export const getTags = async (req, res) => {
    try {
        const tags = await tagService.getTags();

        return res.status(200).json({
            tags,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

export const updateTag = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const tag = await tagService.updateTag(id, {
            name,
        });

        if (!tag) {
            return res.status(404).json({
                message: "Tag not found",
            });
        }

        return res.status(200).json({
            message: "Tag updated successfully",
            tag,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

export const deleteTag = async (req, res) => {
    try {
        const { id } = req.params;

        const tag = await tagService.findTagById(id);

        if (!tag) {
            return res.status(404).json({
                message: "Tag not found",
            });
        }

        const isAttached = await tagService.isTagAttachedToContent(id);

        if (isAttached) {
            return res.status(409).json({
                message:
                    "Tag cannot be deleted because it is attached to content",
            });
        }

        await tagService.deleteTag(id);

        return res.status(200).json({
            message: "Tag deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};
