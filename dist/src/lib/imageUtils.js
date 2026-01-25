"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileSize = exports.isValidImageFile = exports.getImageDimensions = exports.compressMultipleImages = exports.compressImage = exports.defaultCompressionOptions = void 0;
const browser_image_compression_1 = __importDefault(require("browser-image-compression"));
exports.defaultCompressionOptions = {
    maxSizeMB: 1, // Maximum file size in MB
    maxWidthOrHeight: 1920, // Maximum width or height
    useWebWorker: true,
    quality: 0.8, // Image quality (0.8 = 80%)
};
const compressImage = async (file, options = {}) => {
    const finalOptions = { ...exports.defaultCompressionOptions, ...options };
    try {
        console.log('Compressing image:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        const compressedFile = await (0, browser_image_compression_1.default)(file, finalOptions);
        console.log('Compressed image:', compressedFile.name, 'New size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB', 'Compression ratio:', ((file.size - compressedFile.size) / file.size * 100).toFixed(1) + '%');
        return compressedFile;
    }
    catch (error) {
        console.error('Error compressing image:', error);
        // Return original file if compression fails
        return file;
    }
};
exports.compressImage = compressImage;
const compressMultipleImages = async (files, options = {}) => {
    const compressionPromises = files.map(file => (0, exports.compressImage)(file, options));
    return Promise.all(compressionPromises);
};
exports.compressMultipleImages = compressMultipleImages;
// Utility function to get image dimensions
const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
};
exports.getImageDimensions = getImageDimensions;
// Validate file type
const isValidImageFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
};
exports.isValidImageFile = isValidImageFile;
// Validate file size (before compression)
const validateFileSize = (file, maxSizeMB = 10) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
};
exports.validateFileSize = validateFileSize;
