const express = require('express');
const cors = require('cors');

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
    highestValueFound: 0
};

// 🔐 CHAVE XOR (USE A SUA)
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

// ==================== ENDPOINTS ====================

// Health Check
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 NEX HUB API - Online!', 
        version: '2.0.0',
        status: '✅ Funcionando',
        endpoints: ['/notify', '/login', '/stats', '/brainrots/:tier']
    });
});

// Endpoint de notificação
app.post('/notify', (req, res) => {
    try {
        const { brainrotName, valuePerSecond, valueNum, brainrotType, jobId, plotOwner, playersOnline } = req.body;

        if (!brainrotName || !valueNum || !jobId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dados incompletos' 
            });
        }

        // Criptografar Job ID
        const encryptedJobId = encryptJobId(jobId);
        
        // Determinar tier
        let tier;
        if (valueNum >= 400000000) tier = "SECRETS_GOATS";
        else if (valueNum >= 10000000) tier = "HIGH";
        else if (valueNum >= 500000) tier = "NORMAL";
        else {
            return res.status(400).json({ 
                success: false, 
                error: 'Valor muito baixo' 
            });
        }

        // Salvar notificação
        const notification = {
            id: Date.now().toString(),
            brainrotName: brainrotName,
            valuePerSecond: valuePerSecond,
            valueNum: valueNum,
            tier: tier,
            encryptedJobId: encryptedJobId,
            plotOwner: plotOwner || "Desconhecido",
            playersOnline: playersOnline || "0/0",
            timestamp: new Date().toISOString()
        };

        brainrotStore[tier].push(notification);
        
        // Limitar histórico
        if (brainrotStore[tier].length > 50) {
            brainrotStore[tier] = brainrotStore[tier].slice(-50);
        }

        // Atualizar stats
        serverStats.totalNotifications++;
        serverStats.lastNotification = new Date().toISOString();
        if (valueNum > serverStats.highestValueFound) {
            serverStats.highestValueFound = valueNum;
        }

        res.json({ 
            success: true, 
            message: 'Notificação registrada',
            tier: tier
        });
        
    } catch (error) {
        console.error('Erro /notify:', error);
        res.status(500).json({ success: false, error: 'Erro interno' });
    }
});

// Endpoint de login
app.post('/login', (req, res) => {
    try {
        const { username, userId, executor, placeId } = req.body;

        if (!username) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username obrigatório' 
            });
        }

        const loginInfo = {
            username: username,
            userId: userId || "N/A",
            executor: executor || "Unknown",
            placeId: placeId || "N/A",
            timestamp: new Date().toISOString()
        };

        brainrotStore.LOGS.push(loginInfo);
        userStatus.push({
            username: username,
            lastSeen: new Date().toISOString(),
            online: true
        });

        // Limitar logs
        if (brainrotStore.LOGS.length > 100) brainrotStore.LOGS = brainrotStore.LOGS.slice(-100);
        if (userStatus.length > 100) userStatus = userStatus.slice(-100);

        res.json({ 
            success: true, 
            message: 'Login registrado'
        });
        
    } catch (error) {
        console.error('Erro /login:', error);
        res.status(500).json({ success: false, error: 'Erro interno' });
    }
});

// Estatísticas
app.get('/stats', (req, res) => {
    res.json({
        notifications: {
            SECRETS_GOATS: brainrotStore.SECRETS_GOATS.length,
            HIGH: brainrotStore.HIGH.length,
            NORMAL: brainrotStore.NORMAL.length,
            TOTAL: serverStats.totalNotifications
        },
        users: {
            totalLogins: userStatus.length,
            recentLogins: userStatus.slice(-5)
        },
        system: {
            highestValue: serverStats.highestValueFound,
            lastNotification: serverStats.lastNotification
        }
    });
});

// Listar brainrots por tier
app.get('/brainrots/:tier', (req, res) => {
    const { tier } = req.params;
    const validTiers = ['SECRETS_GOATS', 'HIGH', 'NORMAL'];
    
    if (!validTiers.includes(tier)) {
        return res.status(400).json({ error: 'Tier inválido' });
    }
    
    res.json({ 
        success: true,
        tier: tier,
        brainrots: brainrotStore[tier].reverse(),
        count: brainrotStore[tier].length
    });
});

// ✅✅✅ ADICIONE ESTA LINHA NO FINAL (IMPORTANTE!) ✅✅✅
module.exports = app;