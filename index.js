const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware FIXED
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 🎯 ARMAZENAMENTO SIMPLES E FUNCIONAL
let brainrotStore = {
    SECRETS_GOATS: [],    // 400M+
    HIGH: [],             // 10M-399M
    NORMAL: [],           // 500K-9.9M
    LOGS: []              // Logs de login
};

let serverStats = {
    totalNotifications: 0,
    lastNotification: null,
    highestValueFound: 0,
    hopperPetsReceived: 0
};

// ==================== ENDPOINTS SIMPLIFICADOS ====================

// Health Check
app.get('/', (req, res) => {
    try {
        res.json({ 
            message: '🚀 NEX HUB API - Online!', 
            version: '2.1.0',
            status: '✅ Funcionando',
            stats: {
                pets: {
                    SECRETS_GOATS: brainrotStore.SECRETS_GOATS.length,
                    HIGH: brainrotStore.HIGH.length,
                    NORMAL: brainrotStore.NORMAL.length
                },
                total: serverStats.totalNotifications
            }
        });
    } catch (error) {
        console.error('❌ Erro no endpoint /:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// 🎯 Endpoint para receber pets dos hoppers
app.post('/hopper-found', (req, res) => {
    try {
        console.log('🎯 Pet recebido do hopper:', JSON.stringify(req.body));
        
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

        // Validar campos obrigatórios
        if (!brainrotName || !jobId || !hopperName) {
            return res.status(400).json({ 
                success: false, 
                error: 'Campos obrigatórios faltando: brainrotName, jobId, hopperName' 
            });
        }

        // Converter valueNum para número se for string
        const numericValue = typeof valueNum === 'string' ? parseFloat(valueNum) : (valueNum || 0);

        // Determinar tier
        let tier;
        if (numericValue >= 400000000) {
            tier = "SECRETS_GOATS";
        } else if (numericValue >= 10000000) {
            tier = "HIGH";
        } else if (numericValue >= 500000) {
            tier = "NORMAL";
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Valor muito baixo: ' + numericValue 
            });
        }

        // Criar objeto do pet
        const petData = {
            id: Date.now().toString(),
            brainrotName: brainrotName,
            valuePerSecond: valuePerSecond || "0",
            valueNum: numericValue,
            tier: tier,
            jobId: jobId,
            originalJobId: jobId,
            plotOwner: plotOwner || "Desconhecido",
            playersOnline: playersOnline || "0/0",
            hopperName: hopperName,
            timestamp: new Date().toISOString(),
            source: "hopper"
        };

        // Adicionar ao armazenamento
        brainrotStore[tier].unshift(petData);
        
        // Manter apenas os últimos 20 por tier
        if (brainrotStore[tier].length > 20) {
            brainrotStore[tier] = brainrotStore[tier].slice(0, 20);
        }

        // Atualizar estatísticas
        serverStats.hopperPetsReceived++;
        serverStats.totalNotifications++;
        if (numericValue > serverStats.highestValueFound) {
            serverStats.highestValueFound = numericValue;
        }

        console.log(`✅ Pet do hopper registrado: ${brainrotName} - ${valuePerSecond} - ${tier} por ${hopperName}`);

        res.status(200).json({ 
            success: true, 
            message: 'Pet registrado com sucesso',
            tier: tier,
            petId: petData.id
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /hopper-found:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno: ' + error.message 
        });
    }
});

// 🎯 Endpoint para auto-join
app.get('/autojoin/:tier', (req, res) => {
    try {
        const { tier } = req.params;
        const validTiers = ['NORMAL', 'HIGH', 'SECRETS_GOATS'];
        
        if (!validTiers.includes(tier)) {
            return res.status(400).json({ 
                success: false,
                error: 'Tier inválido. Use: NORMAL, HIGH, SECRETS_GOATS' 
            });
        }
        
        const pets = brainrotStore[tier] || [];
        
        // Filtrar apenas pets recentes (últimos 10 minutos)
        const recentPets = pets.filter(pet => {
            try {
                const petTime = new Date(pet.timestamp).getTime();
                const currentTime = new Date().getTime();
                return (currentTime - petTime) < 10 * 60 * 1000; // 10 minutos
            } catch (e) {
                return false;
            }
        });

        console.log(`📊 AutoJoin ${tier}: ${recentPets.length} pets recentes`);

        res.json({ 
            success: true,
            tier: tier,
            pets: recentPets,
            count: recentPets.length,
            lastUpdated: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /autojoin:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro interno: ' + error.message 
        });
    }
});

// 📊 Endpoint de estatísticas
app.get('/stats', (req, res) => {
    try {
        const stats = {
            success: true,
            notifications: {
                SECRETS_GOATS: brainrotStore.SECRETS_GOATS.length,
                HIGH: brainrotStore.HIGH.length,
                NORMAL: brainrotStore.NORMAL.length,
                TOTAL: serverStats.totalNotifications
            },
            system: {
                highestValue: serverStats.highestValueFound,
                hopperPetsReceived: serverStats.hopperPetsReceived,
                lastNotification: serverStats.lastNotification,
                uptime: process.uptime()
            }
        };
        
        res.json(stats);
    } catch (error) {
        console.error('❌ Erro no endpoint /stats:', error);
        res.status(500).json({ success: false, error: 'Erro interno' });
    }
});

// Endpoint de login simples
app.post('/login', (req, res) => {
    try {
        const { username, executor } = req.body;

        if (!username) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username é obrigatório' 
            });
        }

        console.log(`👤 Login registrado: ${username} - ${executor || 'Unknown'}`);

        res.status(200).json({ 
            success: true, 
            message: 'Login registrado'
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /login:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno' 
        });
    }
});

// Endpoint de notificação simples
app.post('/notify', (req, res) => {
    try {
        const { brainrotName, valueNum, jobId } = req.body;

        if (!brainrotName || !jobId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Campos obrigatórios faltando' 
            });
        }

        console.log(`🔔 Notificação recebida: ${brainrotName} - ${valueNum} - ${jobId}`);

        res.status(200).json({ 
            success: true, 
            message: 'Notificação registrada'
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /notify:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno' 
        });
    }
});

// Limpeza automática de dados antigos
setInterval(() => {
    try {
        const now = new Date().getTime();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        ['SECRETS_GOATS', 'HIGH', 'NORMAL'].forEach(tier => {
            brainrotStore[tier] = brainrotStore[tier].filter(pet => {
                try {
                    const petTime = new Date(pet.timestamp).getTime();
                    return petTime > oneHourAgo;
                } catch (e) {
                    return false;
                }
            });
        });
        
        console.log('🧹 Limpeza automática executada');
    } catch (error) {
        console.error('❌ Erro na limpeza automática:', error);
    }
}, 30 * 60 * 1000); // A cada 30 minutos

// Error handler global
app.use((error, req, res, next) => {
    console.error('💥 Erro global:', error);
    res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Endpoint não encontrado: ' + req.path 
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 NEX HUB API rodando na porta ${PORT}`);
    console.log(`📊 Endpoints disponíveis:`);
    console.log(`   POST /hopper-found  → Pets encontrados por hoppers`);
    console.log(`   GET  /autojoin/:tier → Pets para auto-join`);
    console.log(`   GET  /stats         → Estatísticas`);
    console.log(`   POST /login         → Logs de usuário`);
    console.log(`   POST /notify        → Notificações`);
});

module.exports = app;
