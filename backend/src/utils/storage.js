const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} = require('@aws-sdk/client-s3');

/**
 * StorageProvider для DoskaDel (MinIO/S3) — прокси-модель (ревью Клода 2026-10-17):
 * файлы грузятся/скачиваются через backend (multer -> putObject, getObject -> pipe),
 * MinIO наружу не публикуется, presigned не используется.
 * Конфиг из env: S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET.
 */

const cfg = () => ({
  endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
  region: process.env.S3_REGION || 'us-east-1',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  bucket: process.env.S3_BUCKET || 'doskadel-files',
});

let _client = null;
const getClient = () => {
  if (_client) return _client;
  const c = cfg();
  _client = new S3Client({
    endpoint: c.endpoint,
    region: c.region,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
    forcePathStyle: true,
  });
  return _client;
};

const bucket = () => cfg().bucket;

/** Идемпотентно создаёт бакет. Возвращает true/false (не роняет старт). */
async function ensureBucket() {
  const client = getClient();
  const b = bucket();
  try {
    await client.send(new HeadBucketCommand({ Bucket: b }));
    return true;
  } catch (e) {
    try {
      await client.send(new CreateBucketCommand({ Bucket: b }));
      return true;
    } catch (err) {
      if (err?.name === 'BucketAlreadyOwnedByYou' || err?.name === 'BucketAlreadyExists') return true;
      console.error('ensureBucket failed:', err?.message || err);
      return false;
    }
  }
}

async function upload(key, buffer, mime) {
  const client = getClient();
  await client.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: buffer, ContentType: mime }));
  return key;
}

/** Возвращает { stream, contentType, contentLength } или null. */
async function getStream(key) {
  const client = getClient();
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return { stream: res.Body, contentType: res.ContentType, contentLength: res.ContentLength };
  } catch (e) {
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NoSuchKey' || e?.name === 'NotFound') return null;
    throw e;
  }
}

async function head(key) {
  const client = getClient();
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { exists: true, size: res.ContentLength, mime: res.ContentType };
  } catch (e) {
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound') return { exists: false };
    throw e;
  }
}

async function remove(key) {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

module.exports = { getClient, bucket, ensureBucket, upload, getStream, head, remove };
