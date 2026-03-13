import {
  S3Client,
  PutObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
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
    const bucket = config?.bucket ?? process.env.S3_BUCKET ?? '';
    this.region = region;
    this.bucket = bucket;
    this.client = new S3Client({
      region,
      ...(config?.accessKeyId && config?.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
      ...(config?.endpoint ? { endpoint: config.endpoint } : {}),
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
