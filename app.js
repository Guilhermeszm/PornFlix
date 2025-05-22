// Core modules
import UserManager from './modules/UserManager.js';
import VideoManager from './modules/VideoManager.js';
import UIManager from './modules/UIManager.js';
import StorageManager from './modules/StorageManager.js';
import NotificationManager from './modules/NotificationManager.js';

class VideoHub {
    constructor() {
        // Capture global unhandled rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled Promise Rejection:', event.reason);
            this.notificationManager.showNotification('An unexpected error occurred', 'error');
            event.preventDefault(); // Prevents the default error handling
        });

        // Initialize core managers
        this.storageManager = new StorageManager();
        this.notificationManager = new NotificationManager();
        this.userManager = new UserManager(this.storageManager, this.notificationManager);
        this.videoManager = new VideoManager(this.storageManager, this.notificationManager, this.userManager);
        this.uiManager = new UIManager(
            this.userManager, 
            this.videoManager, 
            this.notificationManager
        );

        this.init();
    }
    
    async init() {
        try {
            // Initialize all managers
            await this.storageManager.initialize();
            await this.userManager.initialize();
            await this.videoManager.initialize();
            
            // Setup UI and event listeners
            this.uiManager.setupEventListeners();
            this.uiManager.updateInitialState();
        } catch (error) {
            console.error('Initialization Error:', error);
            this.notificationManager.showNotification('Failed to initialize the application', 'error');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new VideoHub();
    
    // Expose app to window for debugging
    window.app = app;
});

export default VideoHub;