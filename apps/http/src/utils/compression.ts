import sharp from "sharp";

const compressImage = async (buffer: Buffer): Promise<Buffer> => {
    return await sharp(buffer)
        .webp({
            effort: 1,
            lossless: false,
            quality: 85,
        })
        .toBuffer();
};
export default compressImage;
