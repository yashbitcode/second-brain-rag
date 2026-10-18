import BullMQEntry from "../models/bullmqEntries.model.js";

class BullMQEntryService {
    async createEntry(data, session = null) {
        const [entry] = await BullMQEntry.create(
            data,
            session ? { session } : {},
        );

        return entry;
    }

    async findByJobId(jobId) {
        return await BullMQEntry.findOne({ jobId });
    }

    async findByContentId(contentId) {
        return await BullMQEntry.findOne({ contentId });
    }

    async updateStatus(jobId, status, session = null) {
        return await BullMQEntry.findOneAndUpdate(
            { jobId },
            { status },
            { returnDocument: "after", runValidators: true, session },
        );
    }

    async deleteByContentId(contentId, session = null) {
        return await BullMQEntry.findOneAndDelete({ contentId }).session(
            session,
        );
    }

    async findPendingEntries() {
        return await BullMQEntry.find({ status: "queued" });
    }
}

const bullMQEntryService = new BullMQEntryService();

export default bullMQEntryService;
