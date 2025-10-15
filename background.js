// Background Script - Service Worker
class LeadriveBackground {
    constructor() {
        this.init();
    }

    init() {
        console.log('🚀 Leadrive Background Script iniciado');
        
        // Listener para instalação da extensão
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                console.log('✅ Leadrive instalado com sucesso');
                this.openWelcomePage();
            }
        });

        // Listener para mensagens dos content scripts
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Manter o canal aberto para resposta assíncrona
        });

        // Listener para mudanças de aba
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url && tab.url.includes('web.whatsapp.com')) {
                console.log('📱 WhatsApp Web detectado na aba:', tabId);
            }
        });
    }

    openWelcomePage() {
        // Abrir WhatsApp Web quando a extensão for instalada
        chrome.tabs.create({
            url: 'https://web.whatsapp.com'
        });
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'saveData':
                this.saveData(request.data)
                    .then(result => sendResponse({ success: true, result }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                break;

            case 'getData':
                this.getData(request.key)
                    .then(result => sendResponse({ success: true, data: result }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                break;

            case 'sendToAPI':
                this.sendToAPI(request.endpoint, request.data)
                    .then(result => sendResponse({ success: true, result }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                break;

            case 'verifyPhoneNumber':
                this.verifyPhoneNumber(request.phoneNumber)
                    .then(result => sendResponse({ success: true, result }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                break;

            default:
                sendResponse({ success: false, error: 'Ação não reconhecida' });
        }
    }

    async verifyPhoneNumber(phoneNumber) {
        try {
            console.log('🔍 Verificando número de telefone:', phoneNumber);

            // Recuperar JWT do storage
            const storage = await chrome.storage.local.get(['jwt']);
            const jwt = storage.jwt;

            if (!jwt) {
                throw new Error('Token JWT não encontrado. Faça login novamente.');
            }

            // Endpoint da API para verificação de número (substitua pela sua API real)
            const apiEndpoint = 'https://api.leadrive.com/verify-phone'; // Substitua pela sua URL

            // Fazer requisição para a API
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                // Se a API retornar erro, ainda assim retornamos informações básicas
                console.warn(`⚠️ API retornou ${response.status}: ${response.statusText}`);
                
                return {
                    number: phoneNumber,
                    status: 'Não verificado',
                    verified: false,
                    api_status: response.status,
                    message: 'Erro na verificação da API'
                };
            }

            const result = await response.json();
            console.log('✅ Número verificado com sucesso:', result);

            // Salvar resultado no storage para cache
            await this.saveVerificationResult(phoneNumber, result);

            return {
                number: phoneNumber,
                status: result.status || 'Verificado',
                verified: true,
                name: result.name,
                company: result.company,
                tags: result.tags,
                last_seen: result.last_seen,
                api_response: result
            };

        } catch (error) {
            console.error('❌ Erro ao verificar número:', error);
            
            // Retornar informações básicas mesmo em caso de erro
            return {
                number: phoneNumber,
                status: 'Erro na verificação',
                verified: false,
                error: error.message
            };
        }
    }

    async saveVerificationResult(phoneNumber, result) {
        try {
            const cacheKey = `phone_verification_${phoneNumber}`;
            const cacheData = {
                ...result,
                cached_at: new Date().toISOString(),
                phone_number: phoneNumber
            };

            await chrome.storage.local.set({
                [cacheKey]: cacheData
            });

            console.log('💾 Resultado da verificação salvo no cache');
        } catch (error) {
            console.error('❌ Erro ao salvar resultado no cache:', error);
        }
    }

    async saveData(data) {
        try {
            await chrome.storage.local.set(data);
            console.log('💾 Dados salvos:', Object.keys(data));
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar dados:', error);
            throw error;
        }
    }

    async getData(key) {
        try {
            const result = await chrome.storage.local.get(key);
            console.log('📖 Dados recuperados:', key);
            return result;
        } catch (error) {
            console.error('❌ Erro ao recuperar dados:', error);
            throw error;
        }
    }

    async sendToAPI(endpoint, data) {
        try {
            // Recuperar JWT do storage
            const storage = await chrome.storage.local.get(['jwt']);
            const jwt = storage.jwt;

            if (!jwt) {
                throw new Error('Token JWT não encontrado. Faça login novamente.');
            }

            // Fazer requisição para a API
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Dados enviados para API:', endpoint);
            return result;

        } catch (error) {
            console.error('❌ Erro ao enviar para API:', error);
            throw error;
        }
    }

    // Método para limpar dados antigos (executar periodicamente)
    async cleanOldData() {
        try {
            const allData = await chrome.storage.local.get(null);
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const keysToRemove = [];

            for (let key in allData) {
                if (key.startsWith('messages_') || key.startsWith('phone_verification_')) {
                    const data = allData[key];
                    const timestamp = data.timestamp || data.cached_at;
                    if (timestamp && new Date(timestamp).getTime() < oneWeekAgo) {
                        keysToRemove.push(key);
                    }
                }
            }

            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                console.log(`🧹 Removidos ${keysToRemove.length} registros antigos`);
            }

        } catch (error) {
            console.error('❌ Erro ao limpar dados antigos:', error);
        }
    }
}

// Inicializar o background script
new LeadriveBackground();

// Limpar dados antigos a cada 24 horas
setInterval(() => {
    new LeadriveBackground().cleanOldData();
}, 24 * 60 * 60 * 1000);