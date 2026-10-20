import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import { connectDB } from "../config/db.js";
import groqService from "../services/groq.service.js";
import mongoose from "mongoose";
import bullMQEntryService from "../services/bullMQEntry.service.js";
import contentService from "../services/content.service.js";
import { chunkContent } from "../utils/helpers.js";
import qdrantService from "../services/qdrant.service.js";

const startContentWorker = async () => {
    await connectDB();

    const worker = new Worker(
        "content-processing",
        async (job) => {
            console.log("JOB: ", job.name + " " + job.id);
            console.log("JOB-Data: ", job.data);
            const session = await mongoose.startSession();

            const { contentId, allTags, userId, operation } = job.data;

            await bullMQEntryService.updateStatus(job.id, "processing");

            const baseContent = await contentService.findContentById(
                contentId,
                userId,
            );

            console.log("BaseContent: ", baseContent);
            console.log("----------------");

            if (!baseContent) throw new Error("Content not found");

            if(operation === "update") {
                const delRes = await qdrantService.deleteContent(contentId, userId);
                console.log("delRes: ", delRes)
            }

            return await session.withTransaction(async () => {
                let updatedBaseContent = baseContent;

                await bullMQEntryService.updateStatus(job.id, "completed", session);

                if (baseContent.documentType === "image") {
                    const aiImageRes = await groqService.getImageAnalysis(
                        baseContent?.image?.imageUrl,
                        baseContent.imageShortNote,
                    );
                    // const aiImageRes = {
                    //     briefDescription:
                    //         "Page 34 of a document discussing testimonies of a hominid called 'basajaun' in the Basque region, featuring a photograph of a footprint in snow.",
                    //     extractedText:
                    //         'The first half of the past 20th century surprised us with some testimonies on encounters with this hominid. Thus, in 1920, the Basque anthropologist Jose Miguel assured us that there was basajaun in the neighbourhood of Azkoaga, in the province of Guipúzcoa. Years later, the anthropologist and Navarrese ethnographer Jose Maria Satrústegui gathered several cases in his book Myths and Beliefs. In this work it narrates how several shepherds of Valcar and Ondarrola affirmed that they had seen it. Also an old agriculturist told him that these beings used to go to their small village in Aitzurre, although for a long time he had not seen them. Other testimonies confirmed the sighting by him of a young member of this species in the entrance of the cave of Mailuxe. Curiously the small being - who was dozing in the sun had very blond hair. In the last years, a spurt again of the interest in basajaun occurred due to the supposed presence of this type of being in very recent times has taken place. Thus, in April of 2011, two hikers (father and daughter) took a walk by the rough wooded place of Arkitutza when - about 200 meters in the distance they saw something that called for their attention. At the outset they thought that it was a dog,a person, a monkey or even a bear despite those disappearing from the area for a century. But what witnesses saw everywhere was a hairy man , he wore"a kind of fur poncho" moving at incredible speed running uphill while emitting loud whistles. These sounds, long and sustained, seemed to be answered from a hill nearby and also from the surrounding woods. After a couple of minutes, the being known as the Yeti of Irun disappeared without a trace .. Fig 3 Footprint found in Aralar 2011 34',
                    // };

                    console.log(aiImageRes);
                    console.log("-------------------");

                    updatedBaseContent = await contentService.updateContent(
                        contentId,
                        userId,
                        {
                            imageShortNote: baseContent?.imageShortNote || "",
                            imageDescription:
                                aiImageRes?.briefDescription || "",
                            imageExtractText: aiImageRes?.extractedText || "",
                        },
                    );
                }

                console.log("UpdateDContent: ", updatedBaseContent);

                console.log("----------------");

                const chunkPoints = await chunkContent({
                    contentId: updatedBaseContent._id,
                    title: updatedBaseContent.title,
                    user: updatedBaseContent.user,
                    tags: allTags,
                    content:
                        updatedBaseContent.documentType !== "image" 
                            ? updatedBaseContent.content
                            : updatedBaseContent.imageShortNote +
                              " " +
                              updatedBaseContent.imageDescription +
                              " " +
                              updatedBaseContent.imageExtractText,
                });

                console.log("Chunks: ", chunkPoints);

                console.log("----------------");

                const qdrantRes =
                    await qdrantService.upsertContentVectorPoints(chunkPoints);

                console.log(qdrantRes);

                console.log("----------------");

                return { baseContent, qdrantRes };
            });
        },
        {
            connection,
        },
    );

    worker.on("failed", async (job, error) => {
        console.log(error);
        console.log(job.id + " job is failed");
        await bullMQEntryService.updateStatus(job.id, "failed");
    });
    worker.on("completed", (job, returnValue) => {
        console.log(job.id + " job is completed");
        console.log(returnValue);
    });

    console.log("Content worker started");

    return worker;
};

startContentWorker().catch((error) => {
    console.error("Failed to start content worker: ", error);
    process.exit(1);
});
