import * as AsyncStorage from 'asyncstorage';

class StorageManager {
    constructor() {
        this.MAX_VIDEOS = 50;
        this.NOTIFICATION_DURATION = 3000;
        this.MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
    }

    async initialize() {
        // Check storage availability and clear if needed
        try {
            await this.checkStorageAvailability();
        } catch (error) {
            console.error('Storage initialization error:', error);
            await this.clearExcessiveStorage();
        }
    }

    async checkStorageAvailability() {
        try {
            // Test storage by setting and getting a small item
            const testKey = '__storage_test__';
            await AsyncStorage.default.setItem(testKey, JSON.stringify({ test: true }));
            await AsyncStorage.default.removeItem(testKey);
        } catch (error) {
            throw new Error('Storage not available or full');
        }
    }

    async clearExcessiveStorage() {
        try {
            // Remove older or less important data to free up space
            await AsyncStorage.default.removeItem('videos');
            await AsyncStorage.default.removeItem('currentUser');
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }

    async getItem(key) {
        try {
            const item = await AsyncStorage.default.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Error getting ${key}:`, error);
            return null;
        }
    }

    async setItem(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            
            // Check storage size
            if (serializedValue.length > this.MAX_STORAGE_SIZE) {
                throw new Error('Storage limit exceeded');
            }

            await AsyncStorage.default.setItem(key, serializedValue);
        } catch (error) {
            console.error(`Error setting ${key}:`, error);
            
            // Attempt to clear some space
            await this.clearExcessiveStorage();
            
            // Retry with a smaller dataset
            try {
                const compressedValue = this.compressData(value);
                await AsyncStorage.default.setItem(key, JSON.stringify(compressedValue));
            } catch (retryError) {
                console.error('Retry storage failed:', retryError);
                // Fallback to localStorage if available
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                } catch (localError) {
                    console.error('All storage methods failed:', localError);
                }
            }
        }
    }

    compressData(data) {
        // Simple compression strategy
        if (Array.isArray(data)) {
            // Keep only the last N items
            return data.slice(-this.MAX_VIDEOS);
        }
        return data;
    }

    async removeItem(key) {
        try {
            await AsyncStorage.default.removeItem(key);
        } catch (error) {
            console.error(`Error removing ${key}:`, error);
            localStorage.removeItem(key);
        }
    }

    compressDataURL(dataURL, maxWidth = 640, maxHeight = 360) {
        if (!dataURL) return dataURL;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions while maintaining aspect ratio
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress with quality 0.7
            };
            img.onerror = reject;
            img.src = dataURL;
        });
    }

    truncateDataURL(dataURL, maxLength = 1024 * 100) { // 100KB max
        if (!dataURL) return dataURL;
        return dataURL.length > maxLength 
            ? dataURL.substring(0, maxLength) 
            : dataURL;
    }
}

export default StorageManager;