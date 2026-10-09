import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import contentRoutes from "./routes/content.routes.js";
import tagRoutes from "./routes/tag.routes.js";
import morgan from "morgan";

const app = express();
const PORT = process.env.PORT || 3000;

// app.use((req, _, next) => {
//     req.id = uuidv4();
//     next();
// });

// morgan.token("id", (req) => req.id);

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);


app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/tags", tagRoutes);

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    });
