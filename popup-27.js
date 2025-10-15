// Popup JavaScript - Side Panel
class LeadriveSidePanel {
    constructor() {
        this.currentContact = null;
        this.init();
    }

    async init() {
        await this.checkAuthStatus();
        this.bindEvents();
        this.startContactMonitoring();
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
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    startContactMonitoring() {
        // Monitorar mudanças no contato atual
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.currentContact) {
                this.handleContactChange(changes.currentContact.newValue);
            }
        });

        // Verificar contato atual na inicialização
        this.checkCurrentContact();
    }

    async checkCurrentContact() {
        const result = await chrome.storage.local.get(['currentContact']);
        if (result.currentContact) {
            this.handleContactChange(result.currentContact);
        }
    }

    handleContactChange(contact) {
        if (contact) {
            this.currentContact = contact;
            this.highlightCurrentContact(contact);
            console.log('📱 Contato selecionado no side panel:', contact);
        } else {
            this.currentContact = null;
            this.clearContactHighlight();
        }
    }

    highlightCurrentContact(contact) {
        const currentContactElement = document.getElementById('currentContact');
        const contactNumber = document.getElementById('contactNumber');
        const contactStatus = document.getElementById('contactStatus');

        if (currentContactElement && contactNumber) {
            currentContactElement.style.display = 'block';
            contactNumber.textContent = contact.number;
            
            // Adicionar efeito de destaque
            currentContactElement.style.animation = 'highlightPulse 0.5s ease-in-out';
            
            if (contactStatus) {
                contactStatus.textContent = 'Conversa ativa';
            }

            // Scroll para o contato se necessário
            currentContactElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }
    }

    clearContactHighlight() {
        const currentContactElement = document.getElementById('currentContact');
        if (currentContactElement) {
            currentContactElement.style.display = 'none';
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

        // Atualizar a cada 3 segundos
        setTimeout(() => this.updateStats(), 3000);
    }

    displayStats(stats) {
        const conversationsCount = document.getElementById('conversationsCount');
        const messagesCount = document.getElementById('messagesCount');

        if (conversationsCount) {
            conversationsCount.textContent = stats.conversations || 0;
        }

        if (messagesCount) {
            messagesCount.textContent = stats.messages || 0;
        }

        // Atualizar status de conexão
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-indicator span');
        
        if (statusDot && statusText) {
            if (stats.currentContact) {
                statusDot.classList.add('active');
                statusText.textContent = 'Conectado - Conversa ativa';
            } else {
                statusDot.classList.add('active');
                statusText.textContent = 'Conectado ao WhatsApp';
            }
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new LeadriveSidePanel();
});