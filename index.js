const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 🎯 ARMAZENAMENTO OTIMIZADO PARA BRAINROTS
let brainrotStore = {
    SECRETS_GOATS: [],    // 400M+
    HIGH: [],             // 10M-399M
    NORMAL: [],           // 500K-9.9M
    LOGS: []              // Logs de login
};

let userStatus = [];
let serverStats = {
    totalNotifications: 0,
    lastNotification: null,
    highestValueFound: 0,
    hopperPetsReceived: 0
};

// 🔐 CHAVE XOR (USE A SUA CHAVE CORRIGIDA AQUI)
const XOR_KEY_HEX = "4a535c82318325579c09e87bf9510f41901a4bd71b5e5944a9bb147189ff938de46de369523aec37c66be06e4e400e925487e49c0bdcb5e0b779bb78b864913168e5ba4678ec7fbdc2a5a763bcc45d7645a28a12fb6ed1deeregosskiness8670ad4c96fa40ede5901db4c92a6d1aemyscript8878";

// ==================== SISTEMA XOR ====================
function hexToBytes(hex) {
    const bytes = [];
    if (!hex) return bytes;
    const cleanHex = hex.replace(/\s+/g, '');
    
    for (let i = 0; i < cleanHex.length; i += 2) {
        const byte = parseInt(cleanHex.substr(i, 2), 16);
        if (!isNaN(byte)) bytes.push(byte);
    }
    return bytes;
}

function xorBytes(a, b) {
    return a ^ b;
}

function xorBytesWithKey(dataBytes, keyBytes) {
    const out = [];
    const keyLen = keyBytes.length;
    if (keyLen === 0) return out;
    
    for (let i = 0; i < dataBytes.length; i++) {
        out.push(xorBytes(dataBytes[i], keyBytes[i % keyLen]) & 0xFF);
    }
    return out;
}

function stringToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) & 0xFF);
    }
    return bytes;
}

function bytesToHex(bytes) {
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function encryptJobId(jobId) {
    try {
        const jobBytes = stringToBytes(jobId);
        const keyBytes = hexToBytes(XOR_KEY_HEX);
        const encryptedBytes = xorBytesWithKey(jobBytes, keyBytes);
        return bytesToHex(encryptedBytes);
    } catch (error) {
        return null;
    }
}

function decryptJobId(encryptedHex) {
    try {
        const encryptedBytes = hexToBytes(encryptedHex);
        const keyBytes = hexToBytes(XOR_KEY_HEX);
        const decryptedBytes = xorBytesWithKey(encryptedBytes, keyBytes);
        return String.fromCharCode(...decryptedBytes);
    } catch (error) {
        return null;
    }
}

// ==================== ENDPOINTS ====================

// Health Check
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 NEX HUB API - Online!', 
        version: '2.1.0',
        status: '✅ Funcionando',
        endpoints: {
            '/notify': 'POST - Receber notificações de brainrots',
            '/login': 'POST - Logs de usuário',
            '/stats': 'GET - Estatísticas do sistema',
            '/brainrots/:tier': 'GET - Listar brainrots por tier',
            '/hopper-found': 'POST - Pets encontrados por hoppers',
            '/autojoin/:tier': 'GET - Pets para auto-join'
        }
    });
});

// 🎯 ENDPOINT PRINCIPAL DE NOTIFICAÇÕES
app.post('/notify', (req, res) => {
    try {
        console.log('🔔 Notificação recebida:', req.body);
        
        const { 
            brainrotName, 
            valuePerSecond, 
            valueNum, 
            brainrotType, 
            jobId, 
            plotOwner,
            playersOnline,
            timestamp 
        } = req.body;

        // Validar campos obrigatórios
        if (!brainrotName || !valueNum || !brainrotType || !jobId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Campos obrigatórios faltando' 
            });
        }

        // Criptografar Job ID
        const encryptedJobId = encryptJobId(jobId);
        
        // Determinar tier baseado no valor
        let tier;
        if (valueNum >= 400000000) {
            tier = "SECRETS_GOATS";
        } else if (valueNum >= 10000000) {
            tier = "HIGH";
        } else if (valueNum >= 500000) {
            tier = "NORMAL";
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Valor muito baixo para notificação' 
            });
        }

        // Criar objeto de notificação
        const notification = {
            id: Date.now().toString(),
            brainrotName: brainrotName,
            valuePerSecond: valuePerSecond,
            valueNum: valueNum,
            tier: tier,
            encryptedJobId: encryptedJobId,
            originalJobId: jobId,
            plotOwner: plotOwner || "Desconhecido",
            playersOnline: playersOnline || "0/0",
            timestamp: timestamp || new Date().toISOString(),
            receivedAt: new Date().toISOString(),
            source: "notify"
        };

        // Adicionar ao armazenamento
        brainrotStore[tier].unshift(notification);
        
        // Manter apenas os últimos 50 por tier
        if (brainrotStore[tier].length > 50) {
            brainrotStore[tier] = brainrotStore[tier].slice(0, 50);
        }

        // Atualizar estatísticas
        serverStats.totalNotifications++;
        serverStats.lastNotification = new Date().toISOString();
        if (valueNum > serverStats.highestValueFound) {
            serverStats.highestValueFound = valueNum;
        }

        console.log(`✅ Brainrot ${tier} registrado: ${brainrotName} - ${valuePerSecond}`);

        res.status(200).json({ 
            success: true, 
            message: 'Notificação registrada com sucesso',
            tier: tier,
            encryptedJobId: encryptedJobId,
            notificationId: notification.id
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /notify:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 🎯 NOVO: Endpoint para receber pets dos hoppers
app.post('/hopper-found', (req, res) => {
    try {
        console.log('🎯 Pet recebido do hopper:', req.body);
        
        const { 
            brainrotName, 
            valuePerSecond, 
            valueNum, 
            brainrotType, 
            jobId, 
            plotOwner,
            playersOnline,
            hopperName 
        } = req.body;

        // Validar campos
        if (!brainrotName || !valueNum || !jobId || !hopperName) {
            return res.status(400).json({ 
                success: false, 
                error: 'Campos obrigatórios faltando' 
            });
        }

        // Determinar tier
        let tier;
        if (valueNum >= 400000000) {
            tier = "SECRETS_GOATS";
        } else if (valueNum >= 10000000) {
            tier = "HIGH";
        } else if (valueNum >= 500000) {
            tier = "NORMAL";
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Valor muito baixo' 
            });
        }

        // Criar objeto do pet
        const petData = {
            id: Date.now().toString(),
            brainrotName: brainrotName,
            valuePerSecond: valuePerSecond,
            valueNum: valueNum,
            tier: tier,
            jobId: jobId,
            originalJobId: jobId, // Para compatibilidade
            plotOwner: plotOwner || "Desconhecido",
            playersOnline: playersOnline || "0/0",
            hopperName: hopperName,
            timestamp: new Date().toISOString(),
            source: "hopper"
        };

        // Adicionar ao armazenamento do tier correspondente
        brainrotStore[tier].unshift(petData); // Adiciona no início
        
        // Manter apenas os últimos 20 por tier
        if (brainrotStore[tier].length > 20) {
            brainrotStore[tier] = brainrotStore[tier].slice(0, 20);
        }

        // Atualizar estatísticas
        serverStats.hopperPetsReceived++;
        serverStats.totalNotifications++;
        if (valueNum > serverStats.highestValueFound) {
            serverStats.highestValueFound = valueNum;
        }

        console.log(`✅ Pet do hopper registrado: ${brainrotName} - ${valuePerSecond} - ${tier} por ${hopperName}`);

        res.status(200).json({ 
            success: true, 
            message: 'Pet registrado com sucesso',
            tier: tier
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /hopper-found:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 🔐 ENDPOINT DE LOGIN
app.post('/login', (req, res) => {
    try {
        const { 
            username, 
            userId, 
            executor, 
            placeId 
        } = req.body;

        if (!username) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username é obrigatório' 
            });
        }

        const loginInfo = {
            username: username,
            userId: userId || "N/A",
            executor: executor || "Unknown",
            placeId: placeId || "N/A",
            timestamp: new Date().toISOString(),
            ip: req.ip
        };

        // Adicionar aos logs
        brainrotStore.LOGS.push(loginInfo);
        
        // Manter apenas os últimos 100 logs
        if (brainrotStore.LOGS.length > 100) {
            brainrotStore.LOGS = brainrotStore.LOGS.slice(-100);
        }

        // Adicionar ao status de usuário
        userStatus.push({
            username: username,
            lastSeen: new Date().toISOString(),
            online: true
        });

        console.log(`👤 Login registrado: ${username} - ${executor}`);

        res.status(200).json({ 
            success: true, 
            message: 'Login registrado',
            user: loginInfo
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /login:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 📊 ENDPOINT DE ESTATÍSTICAS
app.get('/stats', (req, res) => {
    const stats = {
        notifications: {
            SECRETS_GOATS: brainrotStore.SECRETS_GOATS.length,
            HIGH: brainrotStore.HIGH.length,
            NORMAL: brainrotStore.NORMAL.length,
            TOTAL: serverStats.totalNotifications
        },
        users: {
            totalLogins: userStatus.length,
            recentLogins: userStatus.slice(-10)
        },
        system: {
            highestValue: serverStats.highestValueFound,
            lastNotification: serverStats.lastNotification,
            hopperPetsReceived: serverStats.hopperPetsReceived,
            uptime: process.uptime()
        }
    };
    
    res.json(stats);
});

// 🎯 ENDPOINT PARA LISTAR BRAINROTS POR TIER
app.get('/brainrots/:tier', (req, res) => {
    try {
        const { tier } = req.params;
        const validTiers = ['SECRETS_GOATS', 'HIGH', 'NORMAL'];
        
        if (!validTiers.includes(tier)) {
            return res.status(400).json({ 
                error: 'Tier inválido. Use: SECRETS_GOATS, HIGH, NORMAL' 
            });
        }
        
        const brainrots = brainrotStore[tier] || [];
        
        res.json({ 
            success: true,
            tier: tier,
            count: brainrots.length,
            brainrots: brainrots,
            lastUpdated: brainrots.length > 0 ? brainrots[0].timestamp : null
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /brainrots:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 🎯 NOVO: Endpoint específico para auto-join (só retorna pets de hoppers)
app.get('/autojoin/:tier', (req, res) => {
    try {
        const { tier } = req.params;
        const validTiers = ['NORMAL', 'HIGH', 'SECRETS_GOATS'];
        
        if (!validTiers.includes(tier)) {
            return res.status(400).json({ 
                error: 'Tier inválido. Use: NORMAL, HIGH, SECRETS_GOATS' 
            });
        }
        
        const pets = brainrotStore[tier] || [];
        
        // Filtrar apenas pets recentes (últimos 10 minutos) E que sejam de hoppers
        const recentPets = pets.filter(pet => {
            const petTime = new Date(pet.timestamp).getTime();
            const currentTime = new Date().getTime();
            const isRecent = (currentTime - petTime) < 10 * 60 * 1000; // 10 minutos
            const isFromHopper = pet.source === "hopper";
            return isRecent && isFromHopper;
        });

        res.json({ 
            success: true,
            tier: tier,
            pets: recentPets,
            count: recentPets.length,
            lastUpdated: recentPets.length > 0 ? recentPets[0].timestamp : null
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /autojoin:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 🔗 ENDPOINT PARA SERVERS DISPONÍVEIS
app.get('/servers/:tier', (req, res) => {
    try {
        const { tier } = req.params;
        const validTiers = ['SECRETS_GOATS', 'HIGH', 'NORMAL'];
        
        if (!validTiers.includes(tier)) {
            return res.status(400).json({ 
                error: 'Tier inválido. Use: SECRETS_GOATS, HIGH, NORMAL' 
            });
        }
        
        const brainrots = brainrotStore[tier] || [];
        
        // Filtrar servidores únicos e recentes
        const uniqueServers = [];
        const seenJobIds = new Set();
        
        brainrots.forEach(brainrot => {
            if (!seenJobIds.has(brainrot.jobId)) {
                seenJobIds.add(brainrot.jobId);
                uniqueServers.push({
                    jobId: brainrot.jobId,
                    brainrotName: brainrot.brainrotName,
                    valuePerSecond: brainrot.valuePerSecond,
                    valueNum: brainrot.valueNum,
                    plotOwner: brainrot.plotOwner,
                    playersOnline: brainrot.playersOnline,
                    timestamp: brainrot.timestamp,
                    source: brainrot.source || "unknown"
                });
            }
        });
        
        res.json({ 
            success: true,
            tier: tier,
            servers: uniqueServers.slice(0, 20), // Limitar a 20 servidores
            count: uniqueServers.length
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /servers:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 🔓 ENDPOINT PARA DESCRIPTOGRAFAR
app.post('/decrypt', (req, res) => {
    try {
        const { encryptedJobId } = req.body;
        
        if (!encryptedJobId) {
            return res.status(400).json({ 
                error: 'encryptedJobId é obrigatório' 
            });
        }
        
        const decrypted = decryptJobId(encryptedJobId);
        
        if (!decrypted) {
            return res.status(400).json({ 
                error: 'Falha na descriptografia' 
            });
        }
        
        res.json({ 
            success: true,
            encrypted: encryptedJobId,
            decrypted: decrypted
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /decrypt:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Limpeza automática de dados antigos (a cada hora)
setInterval(() => {
    const now = new Date().getTime();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    ['SECRETS_GOATS', 'HIGH', 'NORMAL'].forEach(tier => {
        brainrotStore[tier] = brainrotStore[tier].filter(pet => {
            const petTime = new Date(pet.timestamp).getTime();
            return petTime > oneHourAgo;
        });
    });
    
    console.log('🧹 Limpeza automática executada');
}, 60 * 60 * 1000); // A cada hora

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 NEX HUB API rodando na porta ${PORT}`);
    console.log(`📊 Endpoints disponíveis:`);
    console.log(`   POST /notify        → Receber notificações`);
    console.log(`   POST /hopper-found  → Pets encontrados por hoppers`);
    console.log(`   POST /login         → Logs de usuário`);
    console.log(`   GET  /stats         → Estatísticas`);
    console.log(`   GET  /brainrots/:tier → Listar brainrots`);
    console.log(`   GET  /autojoin/:tier  → Pets para auto-join`);
    console.log(`   GET  /servers/:tier   → Servidores disponíveis`);
});

module.exports = app;
