import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        documentType: {
            type: String,
            enum: ["text"],
            required: true,
            default: "text",
        },

        content: {
            type: String,
            required: true,
        },

        tags: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Tag",
            },
        ],

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

export const Content = mongoose.model("Content", contentSchema);
