class VideoManager {
    constructor(storageManager, notificationManager, userManager) {
        this.storageManager = storageManager;
        this.notificationManager = notificationManager;
        this.userManager = userManager;
        
        this.videos = [];
        this.currentPlayingVideoId = null;
        this.MAX_VIDEO_SIZE_MB = 50;
    }

    async initialize() {
        try {
            await this.loadVideos();
        } catch (error) {
            console.error('Video initialization error:', error);
            this.videos = []; // Reset to empty array if loading fails
            this.notificationManager.showNotification('Failed to load videos', 'error');
        }
    }

    async loadVideos() {
        const storedVideos = await this.storageManager.getItem('videos');
        this.videos = storedVideos || [];
    }

    async saveVideos() {
        try {
            // Limit the number of stored videos
            const videosToStore = this.videos.slice(-this.storageManager.MAX_VIDEOS);

            // Compress large data URLs
            const compressedVideos = await Promise.all(videosToStore.map(async video => ({
                ...video,
                thumbnailUrl: await this.storageManager.compressDataURL(video.thumbnailUrl),
                videoUrl: this.storageManager.truncateDataURL(video.videoUrl)
            })));

            await this.storageManager.setItem('videos', compressedVideos);
        } catch (error) {
            console.error('Video save error:', error);
            this.notificationManager.showNotification('Unable to save videos. Storage is full.', 'error');
        }
    }

    async uploadVideo(videoData) {
        if (!this.userManager.currentUser) {
            this.notificationManager.showNotification('Please login to upload videos', 'error');
            return false;
        }

        try {
            // Validation checks
            this.validateVideoUpload(videoData);

            // Truncate title and description
            const truncatedTitle = videoData.title.length > 20 
                ? videoData.title.substring(0, 20) + '...' 
                : videoData.title;

            const truncatedDescription = videoData.description.length > 40
                ? videoData.description.substring(0, 40) + '...'
                : videoData.description;

            // Process thumbnail
            const thumbnailUrl = await this.processAndCompressThumbnail(videoData.thumbnailFile);
            
            // Create new video object
            const newVideo = {
                id: Date.now().toString(),
                title: truncatedTitle,
                description: truncatedDescription,
                thumbnailUrl,
                videoUrl: await this.readFileAsDataURL(videoData.videoFile),
                date: new Date().toISOString(),
                uploader: this.userManager.currentUser.username,
                comments: {}
            };
            
            // Add to videos array
            this.videos.push(newVideo);
            
            // Save to storage
            await this.saveVideos();
            
            this.notificationManager.showNotification('Video uploaded successfully');
            return true;
        } catch (error) {
            console.error('Upload error:', error);
            this.notificationManager.showNotification(error.message || 'Error uploading video', 'error');
            return false;
        }
    }

    validateVideoUpload(videoData) {
        const MAX_TITLE_LENGTH = 20;
        const MAX_DESCRIPTION_LENGTH = 40;

        if (!videoData.title) throw new Error('Video title is required');
        if (videoData.title.length > MAX_TITLE_LENGTH) 
            throw new Error(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`);
        
        if (!videoData.description) throw new Error('Video description is required');
        if (videoData.description.length > MAX_DESCRIPTION_LENGTH) 
            throw new Error(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
        
        if (!videoData.thumbnailFile) throw new Error('Thumbnail image is required');
        if (!videoData.videoFile) throw new Error('Video file is required');
        
        // Video file size check
        if (videoData.videoFile.size > this.MAX_VIDEO_SIZE_MB * 1024 * 1024) {
            throw new Error(`Video must be smaller than ${this.MAX_VIDEO_SIZE_MB}MB`);
        }
        
        // Check file types
        const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        
        if (!allowedVideoTypes.includes(videoData.videoFile.type)) {
            throw new Error('Invalid video file type. Only MP4, WebM, and OGG are supported');
        }
        
        if (!allowedImageTypes.includes(videoData.thumbnailFile.type)) {
            throw new Error('Invalid thumbnail file type. Only JPEG, PNG, and WebP are supported');
        }
    }

    async processAndCompressThumbnail(thumbnailFile) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1280;
                    canvas.height = 720;
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate scaling and cropping
                    const aspectRatio = 1280 / 720;
                    let newWidth, newHeight, offsetX = 0, offsetY = 0;
                    
                    if (img.width / img.height > aspectRatio) {
                        // Image is wider than 16:9
                        newHeight = img.height;
                        newWidth = newHeight * aspectRatio;
                        offsetX = (img.width - newWidth) / 2;
                    } else {
                        // Image is taller than 16:9
                        newWidth = img.width;
                        newHeight = newWidth / aspectRatio;
                        offsetY = (img.height - newHeight) / 2;
                    }
                    
                    // Draw the image, cropped and scaled
                    ctx.drawImage(img, 
                        offsetX, offsetY, newWidth, newHeight,  // Source rectangle
                        0, 0, 1280, 720  // Destination rectangle
                    );
                    
                    // Compress the thumbnail
                    const compressedUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(compressedUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(thumbnailFile);
        });
    }

    async readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }
}

export default VideoManager;