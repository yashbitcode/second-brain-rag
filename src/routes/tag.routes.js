import express from "express";

import {
  createTag,
  getTags,
  updateTag,
  deleteTag,
} from "../controllers/tag.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createTag);

router.get("/", getTags);

router.patch("/:id", updateTag);

router.delete("/:id", deleteTag);

export default router;