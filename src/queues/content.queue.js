import "dotenv/config";
import { Queue } from "bullmq";
import {connection} from "../config/redis.js";

export const contentQueue = new Queue("content-processing", {
    connection
});
