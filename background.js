// Background Script
class LeadriveBackground {
    constructor() {
        this.init();
    }

    init() {
        // Configurar side panel quando a extensão for instalada
        chrome.runtime.onInstalled.addListener(() => {
            chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        });

        // Listener para mensagens do content script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Manter o canal aberto para respostas assíncronas
        });

        // Abrir side panel automaticamente quando acessar WhatsApp Web
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url && tab.url.includes('web.whatsapp.com')) {
                chrome.sidePanel.open({ tabId: tabId });
            }
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'verifyPhoneNumber':
                    const result = await this.verifyPhoneNumber(request.phoneNumber);
                    sendResponse(result);
                    break;
                
                case 'contactChanged':
                    // Notificar o side panel sobre mudança de contato
                    this.notifySidePanelContactChange(request.contact);
                    sendResponse({ success: true });
                    break;
                
                default:
                    sendResponse({ success: false, error: 'Ação não reconhecida' });
            }
        } catch (error) {
            console.error('Erro no background script:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async verifyPhoneNumber(phoneNumber) {
        try {
            // Obter JWT do storage
            const result = await chrome.storage.local.get(['jwt']);
            
            if (!result.jwt) {
                throw new Error('Token de autenticação não encontrado');
            }

            // Fazer chamada para a API (substitua pela URL real da sua API)
            const response = await fetch('https://api.leadrive.com/verify-phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.jwt}`
                },
                body: JSON.stringify({
                    phoneNumber: phoneNumber
                })
            });

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const data = await response.json();
            
            return {
                success: true,
                result: data
            };

        } catch (error) {
            console.error('Erro ao verificar número:', error);
            
            // Retornar dados mock em caso de erro (para desenvolvimento)
            return {
                success: true,
                result: {
                    number: phoneNumber,
                    status: 'Verificado (Mock)',
                    name: 'Contato Exemplo',
                    company: 'Empresa Exemplo',
                    verified: true
                }
            };
        }
    }

    notifySidePanelContactChange(contact) {
        // Salvar contato atual no storage para o side panel acessar
        chrome.storage.local.set({
            currentContact: contact,
            lastContactUpdate: Date.now()
        });
    }
}

// Inicializar background script
new LeadriveBackground();