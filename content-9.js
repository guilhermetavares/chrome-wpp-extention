// Content Script - Executa no WhatsApp Web
class LeadriveWhatsApp {
    constructor() {
        this.conversationsCount = 0;
        this.messagesCount = 0;
        this.currentContact = null;
        this.lastConversationUrl = null;
        
        this.init();
    }

    init() {
        console.log('🚀 Leadrive iniciado no WhatsApp Web');
        
        // Aguardar o WhatsApp carregar completamente
        this.waitForWhatsApp(() => {
            this.startMonitoring();
            this.injectUI();
        });
    }

    waitForWhatsApp(callback) {
        const checkWhatsApp = () => {
            const chatList = document.querySelector('[data-testid="chat-list"]');
            if (chatList) {
                callback();
            } else {
                setTimeout(checkWhatsApp, 1000);
            }
        };
        checkWhatsApp();
    }

    startMonitoring() {
        // Monitorar mudanças na URL para detectar quando uma conversa é aberta
        let currentUrl = window.location.href;
        
        const checkUrlChange = () => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                this.handleConversationChange();
            }
        };

        // Verificar mudanças na URL a cada 500ms
        setInterval(checkUrlChange, 500);

        // Também monitorar cliques em conversas
        this.observeConversationClicks();
        
        // Verificar conversa atual na inicialização
        setTimeout(() => this.handleConversationChange(), 2000);
    }

    observeConversationClicks() {
        const chatList = document.querySelector('[data-testid="chat-list"]');
        if (chatList) {
            chatList.addEventListener('click', (e) => {
                // Aguardar um pouco para a conversa carregar
                setTimeout(() => this.handleConversationChange(), 1000);
            });
        }
    }

    handleConversationChange() {
        const currentUrl = window.location.href;
        
        // Verificar se estamos em uma conversa específica
        const conversationMatch = currentUrl.match(/\/chat\/(\d+)/);
        
        if (conversationMatch || this.isInConversation()) {
            const phoneNumber = this.extractPhoneNumber();
            
            if (phoneNumber && phoneNumber !== this.currentContact) {
                this.currentContact = phoneNumber;
                this.conversationsCount++;
                
                console.log('📱 Nova conversa detectada:', phoneNumber);
                
                // Aguardar um pouco para as mensagens carregarem
                setTimeout(() => {
                    this.extractMessages();
                }, 1500);
            }
        } else {
            this.currentContact = null;
        }
    }

    isInConversation() {
        // Verificar se estamos visualizando uma conversa
        const messageArea = document.querySelector('[data-testid="conversation-panel-messages"]');
        const chatHeader = document.querySelector('[data-testid="conversation-header"]');
        
        return messageArea && chatHeader;
    }

    extractPhoneNumber() {
        try {
            // Método 1: Tentar extrair da URL
            const urlMatch = window.location.href.match(/\/chat\/(\d+)/);
            if (urlMatch) {
                return urlMatch[1];
            }

            // Método 2: Tentar extrair do cabeçalho da conversa
            const headerElement = document.querySelector('[data-testid="conversation-header"]');
            if (headerElement) {
                const titleElement = headerElement.querySelector('[data-testid="conversation-info-header-chat-title"]');
                if (titleElement) {
                    const title = titleElement.textContent.trim();
                    
                    // Se o título contém apenas números, é provavelmente um número de telefone
                    const phoneMatch = title.match(/^\+?[\d\s\-\(\)]+$/);
                    if (phoneMatch) {
                        return title.replace(/\D/g, ''); // Remove caracteres não numéricos
                    }
                }
            }

            // Método 3: Tentar extrair de elementos alternativos
            const contactInfo = document.querySelector('[data-testid="conversation-info-header"]');
            if (contactInfo) {
                const spans = contactInfo.querySelectorAll('span');
                for (let span of spans) {
                    const text = span.textContent.trim();
                    if (/^\+?[\d\s\-\(\)]{8,}$/.test(text)) {
                        return text.replace(/\D/g, '');
                    }
                }
            }

            return 'Número não identificado';
        } catch (error) {
            console.error('Erro ao extrair número:', error);
            return 'Erro na extração';
        }
    }

    extractMessages() {
        try {
            const messagesContainer = document.querySelector('[data-testid="conversation-panel-messages"]');
            if (!messagesContainer) {
                console.log('❌ Container de mensagens não encontrado');
                return;
            }

            // Buscar todas as mensagens
            const messageElements = messagesContainer.querySelectorAll('[data-testid="msg-container"]');
            
            if (messageElements.length === 0) {
                console.log('❌ Nenhuma mensagem encontrada');
                return;
            }

            // Pegar as últimas 20 mensagens
            const lastMessages = Array.from(messageElements).slice(-20);
            const messages = [];

            console.log(`📨 Extraindo ${lastMessages.length} mensagens da conversa ${this.currentContact}:`);
            console.log('=' .repeat(60));

            lastMessages.forEach((msgElement, index) => {
                try {
                    const messageData = this.parseMessage(msgElement, index + 1);
                    if (messageData) {
                        messages.push(messageData);
                        this.messagesCount++;
                        
                        // Log detalhado da mensagem
                        console.log(`Mensagem ${index + 1}:`);
                        console.log(`  Tipo: ${messageData.type}`);
                        console.log(`  Remetente: ${messageData.sender}`);
                        console.log(`  Horário: ${messageData.timestamp}`);
                        console.log(`  Conteúdo: ${messageData.content}`);
                        console.log('-'.repeat(40));
                    }
                } catch (error) {
                    console.error(`Erro ao processar mensagem ${index + 1}:`, error);
                }
            });

            console.log(`✅ Total de ${messages.length} mensagens extraídas com sucesso!`);
            console.log('=' .repeat(60));

            // Salvar mensagens no storage para acesso posterior
            this.saveMessages(messages);

        } catch (error) {
            console.error('❌ Erro ao extrair mensagens:', error);
        }
    }

    parseMessage(msgElement, index) {
        try {
            // Determinar se é mensagem enviada ou recebida
            const isOutgoing = msgElement.classList.contains('message-out') || 
                              msgElement.querySelector('[data-testid="msg-meta"]')?.closest('[class*="message-out"]') ||
                              msgElement.querySelector('[data-icon="msg-check"]') ||
                              msgElement.querySelector('[data-icon="msg-dblcheck"]');

            // Extrair conteúdo da mensagem
            let content = '';
            let messageType = 'text';

            // Tentar diferentes seletores para o texto
            const textSelectors = [
                '[data-testid="conversation-text-content"]',
                '.selectable-text',
                '[class*="copyable-text"]',
                'span[dir="ltr"]',
                'span[dir="auto"]'
            ];

            for (let selector of textSelectors) {
                const textElement = msgElement.querySelector(selector);
                if (textElement && textElement.textContent.trim()) {
                    content = textElement.textContent.trim();
                    break;
                }
            }

            // Verificar se é mídia
            if (msgElement.querySelector('[data-testid="media-content"]')) {
                messageType = 'media';
                content = content || '[Mídia]';
            }

            // Verificar se é áudio
            if (msgElement.querySelector('[data-testid="audio-content"]')) {
                messageType = 'audio';
                content = '[Áudio]';
            }

            // Verificar se é documento
            if (msgElement.querySelector('[data-testid="document-content"]')) {
                messageType = 'document';
                content = content || '[Documento]';
            }

            // Extrair timestamp
            let timestamp = 'Horário não disponível';
            const timeElement = msgElement.querySelector('[data-testid="msg-meta"] span') ||
                               msgElement.querySelector('.message-meta span') ||
                               msgElement.querySelector('[class*="time"]');
            
            if (timeElement) {
                timestamp = timeElement.textContent.trim();
            }

            return {
                index: index,
                type: messageType,
                sender: isOutgoing ? 'Você' : this.currentContact,
                content: content || '[Conteúdo não disponível]',
                timestamp: timestamp,
                isOutgoing: isOutgoing
            };

        } catch (error) {
            console.error('Erro ao analisar mensagem:', error);
            return null;
        }
    }

    async saveMessages(messages) {
        try {
            const data = {
                contact: this.currentContact,
                messages: messages,
                timestamp: new Date().toISOString(),
                url: window.location.href
            };

            // Salvar no storage local do Chrome
            await chrome.storage.local.set({
                [`messages_${this.currentContact}_${Date.now()}`]: data
            });

            console.log('💾 Mensagens salvas no storage local');
        } catch (error) {
            console.error('Erro ao salvar mensagens:', error);
        }
    }

    injectUI() {
        // Criar indicador visual de que a extensão está ativa
        const indicator = document.createElement('div');
        indicator.id = 'leadrive-indicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 6px;
            ">
                <div style="
                    width: 6px;
                    height: 6px;
                    background: #4ade80;
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                "></div>
                Leadrive Ativo
            </div>
        `;

        document.body.appendChild(indicator);

        // Adicionar CSS para animação
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
    }

    // Método para responder às mensagens do popup
    getStats() {
        return {
            conversations: this.conversationsCount,
            messages: this.messagesCount,
            currentContact: this.currentContact
        };
    }
}

// Inicializar a extensão
const leadrive = new LeadriveWhatsApp();

// Listener para mensagens do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getStats') {
        sendResponse(leadrive.getStats());
    }
    return true;
});