import express from "express";

import {
  createContent,
  getContents,
  updateContent,
  deleteContent,
  sampleSeed,
  queryContent,
} from "../controllers/content.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createContent);

router.post("/sample-seed", sampleSeed);

router.post("/query", queryContent);

router.get("/", getContents);

router.patch("/:id", updateContent);

router.delete("/:id", deleteContent);

export default router;