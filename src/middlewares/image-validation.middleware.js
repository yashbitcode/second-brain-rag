import { fileTypeFromBuffer } from "file-type";
import { ALLOWED_IMAGE_TYPES } from "../utils/constants.js";

const validateImage = async (req, res, next) => {
    try {
        if (req.file) {
            const detectedType = await fileTypeFromBuffer(req.file.buffer);

            if (
                !detectedType ||
                !ALLOWED_IMAGE_TYPES.includes(detectedType.mime)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid image. Only JPEG, PNG, and WebP are allowed",
                });
            }
            req.file.detectedMimeType = detectedType.mime;
            req.file.detectedExtension = detectedType.ext;
        }

        next();
    } catch (error) {
        next(error);
    }
};

export default validateImage;
