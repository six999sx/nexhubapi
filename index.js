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

// 🔥 NOVO ENDPOINT PARA RECEBER PETS DO SEU SCRIPT (XOR ENCRYPTED)
app.post('/job', (req, res) => {
    try {
        console.log('🔐 Job recebido (criptografado):', JSON.stringify(req.body));
        
        const { 
            jobId1M, 
            jobId5M, 
            jobId10M, 
            jobId50M, 
            jobId100M, 
            jobId300M 
        } = req.body;

        // Determinar qual jobId foi enviado e seu valor correspondente
        let encryptedJobId, numericValue, tier;
        
        if (jobId1M) {
            encryptedJobId = jobId1M;
            numericValue = 2000000; // Valor médio para 1M-4.99M
            tier = "NORMAL";
        } else if (jobId5M) {
            encryptedJobId = jobId5M;
            numericValue = 7500000; // Valor médio para 5M-9.99M
            tier = "NORMAL";
        } else if (jobId10M) {
            encryptedJobId = jobId10M;
            numericValue = 30000000; // Valor médio para 10M-49.99M
            tier = "HIGH";
        } else if (jobId50M) {
            encryptedJobId = jobId50M;
            numericValue = 75000000; // Valor médio para 50M-99.99M
            tier = "HIGH";
        } else if (jobId100M) {
            encryptedJobId = jobId100M;
            numericValue = 200000000; // Valor médio para 100M-299.99M
            tier = "HIGH";
        } else if (jobId300M) {
            encryptedJobId = jobId300M;
            numericValue = 400000000; // Valor para 300M+
            tier = "SECRETS_GOATS";
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Nenhum jobId válido encontrado' 
            });
        }

        // Decodificar o jobId (simulação - na prática você usaria a chave XOR)
        let jobId;
        try {
            // Simulação de decodificação - substitua pela sua lógica XOR real
            jobId = Buffer.from(encryptedJobId, 'hex').toString('utf8');
            // Se a decodificação falhar, usar o encrypted como fallback
            if (!jobId || jobId.length === 0) {
                jobId = encryptedJobId;
            }
        } catch (decodeError) {
            jobId = encryptedJobId;
        }

        // Criar objeto do pet no formato do seu script
        const petData = {
            id: Date.now().toString(),
            brainrotName: "Secret Pet", // Nome padrão pois não vem no payload
            valuePerSecond: formatValue(numericValue), // Formatar como "200K", "5M", etc.
            valueNum: numericValue,
            tier: tier,
            jobId: jobId,
            originalJobId: jobId,
            plotOwner: "Auto-Detected",
            playersOnline: "Unknown",
            hopperName: "Brainrot Scanner",
            timestamp: new Date().toISOString(),
            source: "script",
            encrypted: true,
            originalEncryptedId: encryptedJobId
        };

        // Adicionar ao armazenamento
        brainrotStore[tier].unshift(petData);
        
        // Manter apenas os últimos 20 por tier
        if (brainrotStore[tier].length > 20) {
            brainrotStore[tier] = brainrotStore[tier].slice(0, 20);
        }

        // Atualizar estatísticas
        serverStats.totalNotifications++;
        if (numericValue > serverStats.highestValueFound) {
            serverStats.highestValueFound = numericValue;
        }

        console.log(`✅ Pet do script registrado: ${tier} - ${formatValue(numericValue)} - Job: ${jobId.substring(0, 10)}...`);

        res.status(200).json({ 
            success: true, 
            message: 'Job recebido e processado',
            tier: tier,
            value: numericValue,
            petId: petData.id
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /job:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno: ' + error.message 
        });
    }
});

// 🔥 NOVO ENDPOINT PARA STATUS (LOGIN DO SCRIPT)
app.post('/status', (req, res) => {
    try {
        const { nome } = req.body;

        if (!nome) {
            return res.status(400).json({ 
                success: false, 
                error: 'Nome é obrigatório' 
            });
        }

        console.log(`👤 Status registrado: ${nome}`);

        // Registrar no log
        const logEntry = {
            username: nome,
            executor: "Brainrot Scanner",
            timestamp: new Date().toISOString(),
            type: "status"
        };
        
        brainrotStore.LOGS.unshift(logEntry);
        if (brainrotStore.LOGS.length > 100) {
            brainrotStore.LOGS = brainrotStore.LOGS.slice(0, 100);
        }

        res.status(200).json({ 
            success: true, 
            message: 'Status registrado'
        });
        
    } catch (error) {
        console.error('❌ Erro no endpoint /status:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno' 
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

// 🔥 FUNÇÃO AUXILIAR PARA FORMATAR VALORES
function formatValue(value) {
    if (value >= 1000000000) {
        return (value / 1000000000).toFixed(1) + 'B';
    } else if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
    } else {
        return value.toString();
    }
}

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
    console.log(`   POST /job           → Jobs criptografados do script`);
    console.log(`   POST /status        → Status/login do script`);
    console.log(`   GET  /autojoin/:tier → Pets para auto-join`);
    console.log(`   GET  /stats         → Estatísticas`);
    console.log(`   POST /login         → Logs de usuário`);
    console.log(`   POST /notify        → Notificações`);
});

module.exports = app;

