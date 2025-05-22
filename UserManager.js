class UserManager {
    constructor(storageManager, notificationManager) {
        this.storageManager = storageManager;
        this.notificationManager = notificationManager;
        
        this.currentUser = null;
        this.users = {};
        this.defaultAvatar = '/images.jpeg';
    }

    async initialize() {
        await this.loadUsers();
        await this.checkSavedLogin();
    }

    async loadUsers() {
        const storedUsers = await this.storageManager.getItem('users');
        this.users = storedUsers || {};
    }

    async saveUsers() {
        await this.storageManager.setItem('users', this.users);
    }

    async checkSavedLogin() {
        const savedUser = await this.storageManager.getItem('currentUser');
        if (savedUser) {
            this.currentUser = savedUser;
            this.updateUIForLoggedInUser();
        }
    }

    generateUniqueUsername(baseUsername) {
        // Check if the username already exists
        if (!this.users[baseUsername]) return baseUsername;

        // If username exists, add a random number
        let counter = 1;
        let newUsername = `${baseUsername}${counter}`;
        
        while (this.users[newUsername]) {
            counter++;
            newUsername = `${baseUsername}${counter}`;
        }
        
        return newUsername;
    }

    async login(username, password) {
        // Check for case-insensitive username match
        const matchingUser = Object.values(this.users).find(
            user => user.username.toLowerCase() === username.toLowerCase()
        );

        if (matchingUser && matchingUser.password === password) {
            this.currentUser = matchingUser;
            await this.storageManager.setItem('currentUser', this.currentUser);
            this.updateUIForLoggedInUser();
            this.notificationManager.showNotification('Login successful');
            return true;
        } else {
            this.notificationManager.showNotification('Invalid credentials', 'error');
            return false;
        }
    }

    async register(username, password) {
        if (!username || !password) {
            this.notificationManager.showNotification('Please fill all fields', 'error');
            return false;
        }
        
        // Check for case-insensitive username match
        const existingUser = Object.values(this.users).find(
            user => user.username.toLowerCase() === username.toLowerCase()
        );
        
        if (existingUser) {
            // Generate a unique username
            const uniqueUsername = this.generateUniqueUsername(username);
            
            this.notificationManager.showNotification(
                `Username "${username}" is already taken. Using "${uniqueUsername}" instead.`, 
                'warning'
            );
            
            username = uniqueUsername;
        }
        
        this.users[username] = {
            username,
            password,
            displayName: username,
            bio: '',
            avatarUrl: this.defaultAvatar
        };
        
        await this.saveUsers();
        
        this.currentUser = this.users[username];
        await this.storageManager.setItem('currentUser', this.currentUser);
        
        this.updateUIForLoggedInUser();
        this.notificationManager.showNotification('Registration successful! Welcome!');
        return true;
    }

    async logout() {
        this.currentUser = null;
        await this.storageManager.removeItem('currentUser');
        this.updateUIForLoggedInUser();
    }

    updateUIForLoggedInUser() {
        const uploadBtn = document.getElementById('upload-btn');
        const userBtn = document.getElementById('user-btn');
        const loginBtn = document.getElementById('login-user-btn');
        const headerAvatar = document.getElementById('header-avatar');
        
        if (this.currentUser) {
            uploadBtn.classList.remove('hidden');
            userBtn.classList.remove('hidden');
            loginBtn.classList.add('hidden');
            headerAvatar.src = this.currentUser.avatarUrl || this.defaultAvatar;
        } else {
            uploadBtn.classList.add('hidden');
            userBtn.classList.add('hidden');
            loginBtn.classList.remove('hidden');
        }
    }

    async updateProfile(displayName, avatarUrl) {
        if (!this.currentUser) return false;

        this.users[this.currentUser.username] = {
            ...this.currentUser,
            displayName,
            avatarUrl: avatarUrl || this.defaultAvatar
        };
        
        this.currentUser = this.users[this.currentUser.username];
        
        await this.saveUsers();
        await this.saveCurrentUser();
        
        this.updateUIForLoggedInUser();
        this.notificationManager.showNotification('Profile updated successfully');
        return true;
    }

    async saveCurrentUser() {
        if (this.currentUser) {
            await this.storageManager.setItem('currentUser', this.currentUser);
        }
    }

    async removeCurrentUser() {
        await this.storageManager.removeItem('currentUser');
    }

}

export default UserManager;