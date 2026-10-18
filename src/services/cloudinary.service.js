import { v2 as cloudinary } from "cloudinary";

class CloudinaryService {
    async uploadImage(file, tags = [], metadata = {}) {
        const b64 = Buffer.from(file.buffer).toString("base64");
        let dataURI = "data:" + file.mimetype + ";base64," + b64;

        const result = await cloudinary.uploader.upload(
            dataURI,
            {
                resource_type: "auto",
                folder: "second-brain/sample",
                tags,
                context: metadata,
            },
        );

        return { publicId: result.public_id, imageUrl: result.secure_url };
    }

    async deleteImage(publicId) {
        return await cloudinary.uploader.destroy(publicId, {
            invalidate: true,
        }) 
    }
}

const cloudinaryService = new CloudinaryService();

export default cloudinaryService;
