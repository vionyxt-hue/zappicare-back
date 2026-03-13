import multer from 'multer';
import { Request } from 'express';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, PDF.`));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

/** Form field names for document file uploads (one file per type) */
export const DOCUMENT_FILE_FIELDS: { name: string; maxCount: 1 }[] = [
  { name: 'medicalRegistrationCertificate', maxCount: 1 },
  { name: 'qualificationProof', maxCount: 1 },
  { name: 'governmentId', maxCount: 1 },
  { name: 'profilePicture', maxCount: 1 },
  { name: 'licenseCertificate', maxCount: 1 },
  { name: 'labEntrancePhoto', maxCount: 1 },
  { name: 'vehicleRegistrationPapers', maxCount: 1 },
  { name: 'driverLicense', maxCount: 1 },
  { name: 'hospitalLicense', maxCount: 1 },
  { name: 'hospitalLogo', maxCount: 1 },
];

export const uploadDocumentsMiddleware = upload.fields(DOCUMENT_FILE_FIELDS);
