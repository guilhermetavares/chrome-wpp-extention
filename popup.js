// Popup JavaScript
class LeadrivePopup {
    constructor() {
        this.init();
    }

    async init() {
        await this.checkAuthStatus();
        this.bindEvents();
        this.updateStats();
    }

    async checkAuthStatus() {
        const result = await chrome.storage.local.get(['jwt', 'user']);
        if (result.jwt) {
            this.showMainScreen();
        } else {
            this.showLoginScreen();
        }
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn.querySelector('.btn-text');
        const loading = loginBtn.querySelector('.loading');
        const errorMessage = document.getElementById('errorMessage');

        // Show loading
        btnText.style.display = 'none';
        loading.style.display = 'block';
        loginBtn.disabled = true;
        errorMessage.style.display = 'none';

        try {
            // Simular login (substitua pela sua API real)
            const response = await this.mockLogin(email, password);
            
            if (response.success) {
                // Salvar JWT
                await chrome.storage.local.set({
                    jwt: response.token,
                    user: response.user
                });

                this.showMainScreen();
            } else {
                throw new Error(response.message || 'Erro no login');
            }
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        } finally {
            // Hide loading
            btnText.style.display = 'block';
            loading.style.display = 'none';
            loginBtn.disabled = false;
        }
    }

    async mockLogin(email, password) {
        // Simular delay da API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock login - substitua pela sua API real
        if (email && password) {
            return {
                success: true,
                token: 'mock_jwt_token_' + Date.now(),
                user: {
                    email: email,
                    name: email.split('@')[0]
                }
            };
        } else {
            return {
                success: false,
                message: 'Email e senha são obrigatórios'
            };
        }
    }

    async handleLogout() {
        await chrome.storage.local.remove(['jwt', 'user']);
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('mainScreen').style.display = 'none';
    }

    showMainScreen() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'block';
    }

    async updateStats() {
        // Atualizar estatísticas do content script
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url && tab.url.includes('web.whatsapp.com')) {
                // Enviar mensagem para o content script
                chrome.tabs.sendMessage(tab.id, { action: 'getStats' }, (response) => {
                    if (response) {
                        this.displayStats(response);
                    }
                });
            }
        } catch (error) {
            console.log('Erro ao atualizar stats:', error);
        }

        // Atualizar a cada 5 segundos
        setTimeout(() => this.updateStats(), 5000);
    }

    displayStats(stats) {
        const conversationsCount = document.getElementById('conversationsCount');
        const messagesCount = document.getElementById('messagesCount');
        const currentContact = document.getElementById('currentContact');
        const contactNumber = document.getElementById('contactNumber');

        if (conversationsCount) {
            conversationsCount.textContent = stats.conversations || 0;
        }

        if (messagesCount) {
            messagesCount.textContent = stats.messages || 0;
        }

        if (stats.currentContact) {
            currentContact.style.display = 'block';
            contactNumber.textContent = stats.currentContact;
        } else {
            currentContact.style.display = 'none';
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new LeadrivePopup();
});