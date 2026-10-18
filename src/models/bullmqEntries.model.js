
import mongoose from "mongoose";

const bullMQEntrySchema = new mongoose.Schema(
    {
        jobId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        contentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Content",
            required: true,
        },

        status: {
            type: String,  
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

const BullMQEntry = mongoose.model("BullMQEntry", bullMQEntrySchema);

export default BullMQEntry;
