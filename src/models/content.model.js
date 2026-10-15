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
            enum: ["text", "image"],
            required: true,
            default: "text",
        },

        content: {
            type: String,
            required: function () {
                return this.documentType === "text";
            },
            validate: {
                validator: function (value) {
                    return this.documentType === "text" || value == null;
                },
                message: "content is only allowed for text documents",
            },
        },

        image: {
            type: {
                imageUrl: {
                    type: String,
                    trim: true,
                    required: function () {
                        return this.documentType === "image";
                    },
                },
                publicId: {
                    type: String,
                    trim: true,
                    required: function () {
                        return this.documentType === "image";
                    },
                },
            },
            default: undefined,
        },
        imageShortNote: {
            type: String,
            trim: true,
            validate: {
                validator: function (value) {
                    return this.documentType === "image" || value == null;
                },
                message: "imageShortNote is only allowed for image documents",
            },
        },

        imageDescription: {
            type: String,
            trim: true,
            // required: function () {
            //     return this.documentType === "image";
            // },
            validate: {
                validator: function (value) {
                    return this.documentType === "image" || value == null;
                },
                message: "imageDescription is only allowed for image documents",
            },
        },

        imageExtractText: {
            type: String,
            trim: true,
            validate: {
                validator: function (value) {
                    return this.documentType === "image" || value == null;
                },
                message: "imageExtractText is only allowed for image documents",
            },
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
