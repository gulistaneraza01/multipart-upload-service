export const initiateUpload = async (req, res) => {
  const { contentType, fileName } = req.body;

  const { uploadId } = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      ContentType: contentType,
    }),
  );

  console.log(uploadId);
  res.status(200).json({ uploadId });
};
