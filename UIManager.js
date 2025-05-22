class UIManager {
    constructor(userManager, videoManager, notificationManager) {
        this.userManager = userManager;
        this.videoManager = videoManager;
        this.notificationManager = notificationManager;
        
        this.activeTab = 'home';
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tabs li').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        
        // Upload handling
        document.getElementById('upload-btn').addEventListener('click', () => this.showUploadOverlay());
        document.getElementById('cancel-upload-btn').addEventListener('click', () => this.hideUploadOverlay());
        document.getElementById('submit-upload-btn').addEventListener('click', () => this.handleVideoUpload());
        
        // Thumbnail preview
        document.getElementById('thumbnail-input').addEventListener('change', (e) => this.handleThumbnailPreview(e));
        
        // Search
        document.getElementById('search-btn').addEventListener('click', () => this.handleSearch());
        document.getElementById('search-input').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        
        // Close video player
        document.getElementById('close-player-btn').addEventListener('click', () => this.closeVideoPlayer());
        
        // User auth
        document.getElementById('login-user-btn').addEventListener('click', () => this.showUserLoginOverlay());
        document.getElementById('user-login-btn').addEventListener('click', () => this.handleUserLogin());
        document.getElementById('user-register-btn').addEventListener('click', () => this.handleUserRegister());
        document.getElementById('cancel-user-login-btn').addEventListener('click', () => this.hideUserLoginOverlay());
        
        // Profile
        document.getElementById('user-btn').addEventListener('click', () => this.showProfileOverlay());
        document.getElementById('change-avatar-btn').addEventListener('click', () => document.getElementById('avatar-input').click());
        document.getElementById('avatar-input').addEventListener('change', (e) => this.handleAvatarChange(e));
        document.getElementById('save-profile-btn').addEventListener('click', () => this.saveProfile());
        document.getElementById('cancel-profile-btn').addEventListener('click', () => this.hideProfileOverlay());
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        
        // Comments
        document.getElementById('post-comment-btn').addEventListener('click', () => this.postComment());
    }

    updateInitialState() {
        this.renderVideos();
        this.userManager.updateUIForLoggedInUser();
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        
        // Update active tab
        document.querySelectorAll('.nav-tabs li').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        // Show active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }

    showUploadOverlay() {
        if (!this.userManager.currentUser) {
            this.notificationManager.showNotification('Please login to upload videos', 'error');
            return;
        }
        document.getElementById('upload-overlay').classList.add('active');
    }

    hideUploadOverlay() {
        document.getElementById('upload-overlay').classList.remove('active');
        this.resetUploadForm();
    }

    resetUploadForm() {
        document.getElementById('video-title').value = '';
        document.getElementById('video-description').value = '';
        document.getElementById('thumbnail-input').value = '';
        document.getElementById('video-input').value = '';
        document.getElementById('thumbnail-preview').innerHTML = '';
    }

    async handleVideoUpload() {
        const title = document.getElementById('video-title').value.trim();
        const description = document.getElementById('video-description').value.trim();
        const thumbnailFile = document.getElementById('thumbnail-input').files[0];
        const videoFile = document.getElementById('video-input').files[0];

        const uploadSuccess = await this.videoManager.uploadVideo({
            title,
            description,
            thumbnailFile,
            videoFile
        });

        if (uploadSuccess) {
            this.hideUploadOverlay();
            this.renderVideos();
        }
    }

    handleThumbnailPreview(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.style.maxWidth = '100%';  
            img.style.maxHeight = '120px';  
            img.style.objectFit = 'cover';  
            
            const previewContainer = document.getElementById('thumbnail-preview');
            previewContainer.innerHTML = '';
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    }

    renderVideos() {
        const container = document.getElementById('videos-container');
        container.innerHTML = '';
        
        if (this.videoManager.videos.length === 0) {
            container.innerHTML = '<p class="no-videos">No videos available. Upload some videos to get started!</p>';
            return;
        }
        
        this.videoManager.videos.forEach(video => {
            const videoCard = this.createVideoCard(video);
            container.appendChild(videoCard);
        });
    }

    createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        
        // Get the uploader's display name
        const uploaderInfo = this.userManager.users[video.uploader] || { displayName: video.uploader };
        
        card.innerHTML = `
            <div class="thumbnail-container">
                <img src="${video.thumbnailUrl}" alt="${video.title}">
                <div class="play-icon"><i class="fas fa-play"></i></div>
            </div>
            <div class="video-info">
                <h3>${video.title}</h3>
                <p>${video.description}</p>
                <small>Uploaded by: ${uploaderInfo.displayName}</small>
            </div>
            ${this.userManager.currentUser && this.userManager.currentUser.username === video.uploader ? `
            <div class="video-actions">
                <button class="delete-btn" data-id="${video.id}"><i class="fas fa-trash"></i></button>
            </div>
            ` : ''}
        `;
        
        // Add click event to play video
        card.querySelector('.thumbnail-container').addEventListener('click', () => {
            this.playVideo(video);
        });
        
        // Add delete event if uploader
        if (this.userManager.currentUser && this.userManager.currentUser.username === video.uploader) {
            card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteVideo(video.id);
            });
        }
        
        return card;
    }

    handleSearch() {
        const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();
        const resultsContainer = document.getElementById('search-results');
        
        if (!searchTerm) {
            resultsContainer.innerHTML = '<p>Enter a search term to find videos</p>';
            return;
        }
        
        const results = this.videoManager.videos.filter(video => 
            video.title.toLowerCase().includes(searchTerm) || 
            video.description.toLowerCase().includes(searchTerm)
        );
        
        resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p>No videos found matching your search</p>';
            return;
        }
        
        results.forEach(video => {
            const videoCard = this.createVideoCard(video);
            resultsContainer.appendChild(videoCard);
        });
    }

    showUserLoginOverlay() {
        document.getElementById('user-login-overlay').classList.add('active');
        document.getElementById('user-username').focus();
    }

    hideUserLoginOverlay() {
        document.getElementById('user-login-overlay').classList.remove('active');
        document.getElementById('user-username').value = '';
        document.getElementById('user-password').value = '';
    }

    async handleUserLogin() {
        const username = document.getElementById('user-username').value.trim();
        const password = document.getElementById('user-password').value;
        
        if (this.userManager.users[username] && this.userManager.users[username].password === password) {
            this.userManager.currentUser = this.userManager.users[username];
            await this.userManager.saveCurrentUser();
            this.userManager.updateUIForLoggedInUser();
            this.hideUserLoginOverlay();
            this.notificationManager.showNotification('Login successful');
        } else {
            this.notificationManager.showNotification('Invalid credentials', 'error');
        }
    }

    async handleUserRegister() {
        const username = document.getElementById('user-username').value.trim();
        const password = document.getElementById('user-password').value;
        
        if (!username || !password) {
            this.notificationManager.showNotification('Please fill all fields', 'error');
            return;
        }
        
        if (this.userManager.users[username]) {
            this.notificationManager.showNotification('Username already taken', 'error');
            return;
        }
        
        this.userManager.users[username] = {
            username,
            password,
            displayName: username,
            bio: '',
            avatarUrl: this.userManager.defaultAvatar  
        };
        
        await this.userManager.saveUsers();
        
        this.userManager.currentUser = this.userManager.users[username];
        await this.userManager.saveCurrentUser();
        
        this.userManager.updateUIForLoggedInUser();
        this.hideUserLoginOverlay();
        
        this.notificationManager.showNotification('Registration successful! Welcome!');
    }

    async handleLogout() {
        this.userManager.currentUser = null;
        await this.userManager.removeCurrentUser();
        this.userManager.updateUIForLoggedInUser();
        this.hideProfileOverlay();
    }

    showProfileOverlay() {
        document.getElementById('profile-overlay').classList.add('active');
        const profileNameInput = document.getElementById('profile-name');
        const profileBioInput = document.getElementById('profile-bio');
        const profileImage = document.getElementById('profile-image');
        
        // Set initial values from current user
        profileNameInput.value = this.userManager.currentUser.displayName;
        profileBioInput.value = '';  
        
        // Ensure profile image is set
        profileImage.src = this.userManager.currentUser.avatarUrl || this.userManager.defaultAvatar;

        // Add real-time update event listeners
        profileNameInput.addEventListener('input', this.updateProfilePreview.bind(this));
        profileBioInput.addEventListener('input', this.updateProfilePreview.bind(this));
    }

    updateProfilePreview() {
        const profileNameInput = document.getElementById('profile-name');
        const profileBioInput = document.getElementById('profile-bio');
        
        // Simulate live preview (though in this case, we're keeping bio empty)
        profileNameInput.style.color = 'white';
        profileBioInput.style.color = 'white';
    }

    async saveProfile() {
        const displayName = document.getElementById('profile-name').value.trim();
        const avatarUrl = document.getElementById('profile-image').src;
        
        // Update the user in the users object
        this.userManager.users[this.userManager.currentUser.username] = {
            ...this.userManager.currentUser,
            displayName,
            bio: '', 
            avatarUrl: avatarUrl || this.userManager.defaultAvatar
        };
        
        // Update the current user reference
        this.userManager.currentUser = this.userManager.users[this.userManager.currentUser.username];
        
        // Save users and current user
        this.userManager.saveUsers(); 
        this.userManager.saveCurrentUser(); 
        
        // Update comments with new display name and avatar
        this.videoManager.videos.forEach(video => {
            if (video.comments) {
                Object.values(video.comments).forEach(comment => {
                    if (comment.username === this.userManager.currentUser.username) {
                        comment.displayName = displayName;
                        comment.avatarUrl = avatarUrl || this.userManager.defaultAvatar;
                    }
                });
            }
        });
        
        await this.videoManager.saveVideos();
        
        this.userManager.updateUIForLoggedInUser();
        
        if (this.videoManager.currentPlayingVideoId) {
            const currentVideo = this.videoManager.videos.find(v => v.id === this.videoManager.currentPlayingVideoId);
            if (currentVideo) {
                this.renderComments(currentVideo);
            }
        }
        
        this.hideProfileOverlay();
        this.notificationManager.showNotification('Profile updated successfully');
    }

    hideProfileOverlay() {
        document.getElementById('profile-overlay').classList.remove('active');
        
        // Remove event listeners to prevent memory leaks
        const profileNameInput = document.getElementById('profile-name');
        const profileBioInput = document.getElementById('profile-bio');
        
        profileNameInput.removeEventListener('input', this.updateProfilePreview);
        profileBioInput.removeEventListener('input', this.updateProfilePreview);
    }

    async handleAvatarChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const avatarUrl = await this.readFileAsDataURL(file);
            document.getElementById('profile-image').src = avatarUrl;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.notificationManager.showNotification('Error uploading avatar', 'error');
        }
    }

    async postComment() {
        if (!this.userManager.currentUser) {
            this.notificationManager.showNotification('Please login to comment', 'error');
            return;
        }
        
        const commentText = document.getElementById('comment-text').value.trim();
        if (!commentText) return;
        
        const currentVideo = this.videoManager.videos.find(v => v.id === this.videoManager.currentPlayingVideoId);
        if (!currentVideo.comments) currentVideo.comments = {};
        
        const commentId = Date.now().toString();
        currentVideo.comments[commentId] = {
            id: commentId,
            text: commentText,
            username: this.userManager.currentUser.username,
            displayName: this.userManager.currentUser.displayName,
            avatarUrl: this.userManager.currentUser.avatarUrl,
            date: new Date().toISOString()
        };
        
        await this.videoManager.saveVideos();
        this.renderComments(currentVideo);
        document.getElementById('comment-text').value = '';
    }

    renderComments(video) {
        const container = document.getElementById('comments-container');
        container.innerHTML = '';
        
        if (!video.comments) return;
        
        Object.values(video.comments).sort((a, b) => b.date.localeCompare(a.date)).forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment';
            commentEl.innerHTML = `
                <div class="comment-header">
                    <img class="comment-avatar" src="${comment.avatarUrl}" alt="${comment.displayName}">
                    <span class="comment-username">${comment.displayName}</span>
                    <span class="comment-date">${new Date(comment.date).toLocaleDateString()}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            `;
            
            container.appendChild(commentEl);
        });
    }

    closeVideoPlayer() {
        const videoPlayer = document.getElementById('video-player');
        const overlay = document.getElementById('video-player-overlay');
        
        // Pause video
        videoPlayer.pause();
        
        // Hide overlay
        overlay.classList.remove('active');
    }

    playVideo(video) {
        const videoPlayer = document.getElementById('video-player');
        const overlay = document.getElementById('video-player-overlay');
        
        // Set video details
        document.getElementById('player-title').textContent = video.title;
        document.getElementById('player-description').textContent = video.description;
        
        // Set video source
        videoPlayer.src = video.videoUrl;
        
        // Show overlay
        overlay.classList.add('active');
        
        // Auto-play
        videoPlayer.load();
        videoPlayer.play()
            .catch(error => {
                console.log('Auto-play prevented:', error);
            });
        
        this.videoManager.currentPlayingVideoId = video.id;
        this.renderComments(video);
    }

    deleteVideo(videoId) {
        if (!this.userManager.currentUser) {
            this.notificationManager.showNotification('Please login to delete videos', 'error');
            return;
        }
        
        const video = this.videoManager.videos.find(v => v.id === videoId);
        
        // Only allow deletion by the uploader
        if (video.uploader !== this.userManager.currentUser.username) {
            this.notificationManager.showNotification('You can only delete your own videos', 'error');
            return;
        }
        
        if (confirm('Are you sure you want to delete this video?')) {
            this.videoManager.videos = this.videoManager.videos.filter(video => video.id !== videoId);
            this.videoManager.saveVideos();
            this.renderVideos();
            this.notificationManager.showNotification('Video deleted successfully');
        }
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

}

export default UIManager;