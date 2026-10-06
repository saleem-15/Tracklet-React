/**
 * Tracklet Extension IndexedDB Storage Utility for Tailored CV Blobs
 * Database: TrackletExtensionDB (v1)
 * Object Store: tailored_resumes
 * Primary Key: blobId
 */

(function (global) {
  const DB_NAME = 'TrackletExtensionDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'tailored_resumes';

  /**
   * Open IndexedDB instance with upgrade handling.
   * @returns {Promise<IDBDatabase>}
   */
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'blobId' });
          store.createIndex('by_applicationId', 'applicationId', { unique: false });
          store.createIndex('by_uploadedAt', 'uploadedAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open TrackletExtensionDB'));
    });
  }

  /**
   * Save or update a tailored resume blob in IndexedDB.
   * @param {Object} resume
   * @param {string} [resume.blobId]
   * @param {string} [resume.applicationId]
   * @param {string} resume.fileName
   * @param {number} resume.fileSize
   * @param {string} resume.mimeType
   * @param {Blob} resume.fileData
   * @param {string} [resume.uploadedAt]
   * @returns {Promise<string>} The blobId
   */
  async function saveResumeBlob(resume) {
    if (!resume || !resume.fileData) {
      throw new Error('Invalid resume payload: missing fileData blob');
    }

    const blobId = resume.blobId || `res_blob_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const uploadedAt = resume.uploadedAt || new Date().toISOString();

    const record = {
      blobId,
      applicationId: resume.applicationId || undefined,
      fileName: resume.fileName || 'resume.pdf',
      fileSize: resume.fileSize || resume.fileData.size || 0,
      mimeType: resume.mimeType || resume.fileData.type || 'application/pdf',
      fileData: resume.fileData,
      uploadedAt
    };

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);

      tx.oncomplete = () => {
        db.close();
        resolve(blobId);
      };
      tx.onerror = () => {
        const err = tx.error || new Error('Failed to save resume blob');
        db.close();
        reject(err);
      };
      tx.onabort = () => {
        const err = tx.error || new Error('Save resume blob transaction aborted');
        db.close();
        reject(err);
      };
    });
  }

  /**
   * Retrieve a stored resume blob by blobId.
   * @param {string} blobId
   * @returns {Promise<Object|null>}
   */
  async function getResumeBlob(blobId) {
    if (!blobId) return null;
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(blobId);

      req.onsuccess = () => {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = () => {
        const err = req.error || new Error(`Failed to retrieve resume blob: ${blobId}`);
        db.close();
        reject(err);
      };
    });
  }

  /**
   * Delete a stored resume blob by blobId.
   * @param {string} blobId
   * @returns {Promise<boolean>}
   */
  async function deleteResumeBlob(blobId) {
    if (!blobId) return false;
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(blobId);

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        const err = tx.error || new Error(`Failed to delete resume blob: ${blobId}`);
        db.close();
        reject(err);
      };
      tx.onabort = () => {
        const err = tx.error || new Error('Delete resume blob transaction aborted');
        db.close();
        reject(err);
      };
    });
  }

  /**
   * Export stored resume as a data URL (e.g. for preview or download).
   * @param {string} blobId
   * @returns {Promise<string>} Data URL
   */
  async function exportResumeAsDataUrl(blobId) {
    const record = await getResumeBlob(blobId);
    if (!record || !record.fileData) {
      throw new Error(`Resume blob not found: ${blobId}`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read blob as data URL'));
      reader.readAsDataURL(record.fileData);
    });
  }

  const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
  const ALLOWED_RESUME_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/octet-stream'
  ];

  /**
   * Format file size in bytes to human-readable string (B, KB, MB).
   * @param {number} bytes
   * @returns {string}
   */
  function formatResumeFileSize(bytes) {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  }

  /**
   * Sanitize resume file name for safe storage and display.
   * @param {string} fileName
   * @returns {string}
   */
  function sanitizeResumeFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') return 'resume.pdf';
    let clean = fileName.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ');
    if (clean.length > 120) {
      const extMatch = clean.match(/\.[a-zA-Z0-9]+$/);
      const ext = extMatch ? extMatch[0] : '';
      clean = clean.slice(0, 120 - ext.length) + ext;
    }
    return clean || 'resume.pdf';
  }

  /**
   * Validate resume file for size, type, and integrity.
   * @param {File|Blob|{name?: string, size?: number, type?: string}} file
   * @returns {{ valid: boolean, error?: string, sanitizedName?: string, formattedSize?: string }}
   */
  function validateResumeFile(file) {
    if (!file) {
      return { valid: false, error: 'No file selected.' };
    }

    const name = file.name || 'resume.pdf';
    const size = typeof file.size === 'number' ? file.size : 0;
    const sanitizedName = sanitizeResumeFileName(name);

    if (size <= 0) {
      return { valid: false, error: 'Selected file is empty (0 bytes).' };
    }

    if (size > MAX_RESUME_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size (${formatResumeFileSize(size)}) exceeds maximum limit of 10 MB.`
      };
    }

    const extMatch = sanitizedName.toLowerCase().match(/\.[a-z0-9]+$/);
    const ext = extMatch ? extMatch[0] : '';
    if (!ALLOWED_RESUME_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported file type (${ext || 'unknown'}). Please upload a PDF, DOCX, DOC, or TXT file.`
      };
    }

    return {
      valid: true,
      sanitizedName,
      formattedSize: formatResumeFileSize(size)
    };
  }

  const TrackletResumeStorage = {
    DB_NAME,
    STORE_NAME,
    MAX_RESUME_SIZE_BYTES,
    ALLOWED_RESUME_EXTENSIONS,
    ALLOWED_RESUME_MIME_TYPES,
    formatResumeFileSize,
    sanitizeResumeFileName,
    validateResumeFile,
    openDatabase,
    saveResumeBlob,
    getResumeBlob,
    deleteResumeBlob,
    exportResumeAsDataUrl
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackletResumeStorage;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.TrackletResumeStorage = TrackletResumeStorage;
  }
  global.TrackletResumeStorage = TrackletResumeStorage;
})(typeof self !== 'undefined' ? self : this);
