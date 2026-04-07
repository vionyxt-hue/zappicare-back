import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';

export interface AzureBlobPresignedUploadResult {
  uploadUrl: string;
  blobUrl: string;
  blobName: string;
  containerName: string;
  expiresAt: string;
  expiresInSeconds: number;
  permission: 'cw';
  contentType: string;
}

export class AzureBlobService {
  private readonly accountName: string;
  private readonly accountKey: string;
  private readonly endpointSuffix: string;
  private readonly containerName: string;
  private readonly blobServiceClient: BlobServiceClient | null;
  private readonly sharedKeyCredential: StorageSharedKeyCredential | null;

  constructor(config?: {
    accountName?: string;
    accountKey?: string;
    endpointSuffix?: string;
    containerName?: string;
  }) {
    this.accountName = config?.accountName ?? process.env.AZURE_STORAGE_ACCOUNT_NAME ?? '';
    this.accountKey = config?.accountKey ?? process.env.AZURE_STORAGE_ACCOUNT_KEY ?? '';
    this.endpointSuffix =
      config?.endpointSuffix ?? process.env.AZURE_STORAGE_ENDPOINT_SUFFIX ?? 'core.windows.net';
    this.containerName = config?.containerName ?? process.env.AZURE_STORAGE_CONTAINER_NAME ?? '';

    if (!this.isConfigured()) {
      this.blobServiceClient = null;
      this.sharedKeyCredential = null;
      return;
    }

    const endpoint = `https://${this.accountName}.blob.${this.endpointSuffix}`;
    this.sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
    this.blobServiceClient = new BlobServiceClient(endpoint, this.sharedKeyCredential);
  }

  isConfigured(): boolean {
    return (
      this.accountName.length > 0 &&
      this.accountKey.length > 0 &&
      this.endpointSuffix.length > 0 &&
      this.containerName.length > 0
    );
  }

  async generatePresignedUrl(params: {
    blobName: string;
    contentType: string;
    permission?: 'read' | 'write' | 'readwrite';
    expiresInSeconds?: number;
  }): Promise<AzureBlobPresignedUploadResult> {
    if (!this.blobServiceClient || !this.sharedKeyCredential) {
      throw new Error(
        'Azure storage is not configured. Set AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_ENDPOINT_SUFFIX, and AZURE_STORAGE_CONTAINER_NAME.'
      );
    }

    const expiresInSeconds = Math.max(60, Math.min(60 * 60 * 24, params.expiresInSeconds ?? 900));
    const startsOn = new Date(Date.now() - 5 * 60 * 1000);
    const expiresOn = new Date(Date.now() + expiresInSeconds * 1000);

    let permissions: BlobSASPermissions;
    switch (params.permission ?? 'write') {
      case 'read':
        permissions = BlobSASPermissions.parse('r');
        break;
      case 'readwrite':
        permissions = BlobSASPermissions.parse('rw');
        break;
      default:
        permissions = BlobSASPermissions.parse('cw');
        break;
    }

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: params.blobName,
        permissions,
        startsOn,
        expiresOn,
        contentType: params.contentType,
      },
      this.sharedKeyCredential
    ).toString();

    const baseUrl = this.blobServiceClient.url.endsWith('/')
      ? this.blobServiceClient.url
      : `${this.blobServiceClient.url}/`;
    const blobUrl = `${baseUrl}${this.containerName}/${params.blobName}`;
    const uploadUrl = `${blobUrl}?${sasToken}`;

    return {
      uploadUrl,
      blobUrl,
      blobName: params.blobName,
      containerName: this.containerName,
      expiresAt: expiresOn.toISOString(),
      expiresInSeconds,
      permission: 'cw',
      contentType: params.contentType,
    };
  }

  async generateWritePresignedUrl(params: {
    blobName: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<AzureBlobPresignedUploadResult> {
    return this.generatePresignedUrl({
      ...params,
      permission: 'write',
    });
  }
}

let defaultInstance: AzureBlobService | null = null;

export function getAzureBlobService(): AzureBlobService {
  if (!defaultInstance) {
    defaultInstance = new AzureBlobService();
  }
  return defaultInstance;
}
