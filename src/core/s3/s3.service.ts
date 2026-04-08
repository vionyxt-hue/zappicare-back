import {
  S3Client,
  PutObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export interface S3PresignedUploadResult {
  uploadUrl: string;
  objectUrl: string;
  key: string;
  bucket: string;
  expiresAt: string;
  expiresInSeconds: number;
  permission: 'put';
  contentType: string;
}

export class S3Service {
  private client: S3Client;
  private bucket: string;
  private region: string;
  /** Base URL for stored objects (e.g. https://bucket.s3.region.amazonaws.com or custom domain) */
  private publicBaseUrl: string;

  constructor(config?: {
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
    /** Optional: custom base URL for object links (e.g. CloudFront). If not set, uses default S3 object URL. */
    publicBaseUrl?: string;
  }) {
    const region = config?.region ?? process.env.AWS_REGION ?? 'us-east-1';
    const bucket =
      config?.bucket ??
      process.env.AWS_S3_BUCKET_NAME ??
      process.env.S3_BUCKET ??
      '';
    this.region = region;
    this.bucket = bucket;
this.client = new S3Client({
  region,

  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",

  ...((config?.accessKeyId && config?.secretAccessKey) ||
  (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    ? {
        credentials: {
          accessKeyId: config?.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID ?? '',
          secretAccessKey: config?.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY ?? '',
        },
      }
    : {}),
});
    this.publicBaseUrl =
      config?.publicBaseUrl ??
      process.env.S3_PUBLIC_BASE_URL ??
      `https://${bucket}.s3.${region}.amazonaws.com`;
  }

  /**
   * Upload a file to S3 and return the public URL.
   * Key format: prefix/providerId/documentType/timestamp-originalName
   */
  async upload(params: {
    keyPrefix: string;
    fileName: string;
    body: Buffer | Uint8Array;
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<S3UploadResult> {
    const sanitized = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${params.keyPrefix}/${Date.now()}-${sanitized}`;

    const input: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: params.body,
      ContentType: params.contentType ?? 'application/octet-stream',
      ...(params.metadata && { Metadata: params.metadata }),
    };

    await this.client.send(new PutObjectCommand(input));

    const url = this.publicBaseUrl.endsWith('/')
      ? `${this.publicBaseUrl}${key}`
      : `${this.publicBaseUrl}/${key}`;

    return { url, key, bucket: this.bucket };
  }

  async generatePresignedPutUrl(params: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<S3PresignedUploadResult> {
    const expiresInSeconds = Math.max(60, Math.min(60 * 60 * 24, params.expiresInSeconds ?? 900));

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });

    const objectUrl = this.publicBaseUrl.endsWith('/')
      ? `${this.publicBaseUrl}${params.key}`
      : `${this.publicBaseUrl}/${params.key}`;

    return {
      uploadUrl,
      objectUrl,
      key: params.key,
      bucket: this.bucket,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      expiresInSeconds,
      permission: 'put',
      contentType: params.contentType,
    };
  }

  getBucket(): string {
    return this.bucket;
  }

  isConfigured(): boolean {
    return !!this.bucket && this.bucket.length > 0;
  }
}

let defaultInstance: S3Service | null = null;

export function getS3Service(): S3Service {
  if (!defaultInstance) {
    defaultInstance = new S3Service();
  }
  return defaultInstance;
}
