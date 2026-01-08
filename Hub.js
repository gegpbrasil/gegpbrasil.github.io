/* GEGP UNIVERSE CORE v4.0
    Autor: Gemini AI
    Descrição: Sistema unificado que lê múltiplos LocalStorage de jogos diferentes,
    centraliza a lógica de Banco/Passe/Controle e gera um único arquivo de save (.json).
*/

const Universe = {
    // Configuração das Chaves Originais (Lê direto dos jogos)
    KEYS: {
        IDLE: 'idlegame_ovelha_gegp_fixed',  // Chave do Idle (versão conversor)
        IDLE_ALT: 'idlegame_ovelha_gegp_',   // Chave alternativa (versão control)
        CARD: 'gegp_v3_bal',                 // Chave do Card
        LAB: 'lab_suzana_mob_v1',            // Chave do LDS2/Lab
        BANK: 'gegp_bank_v2_system',         // Dados do Banco
        PASS: 'passe_gegp_v3_master',        // Dados do Passe
        LOCK: 'gegp_global_lock',            // Bloqueio Parental
        BONUS_TIME: 'parent_bonus_v6_time'   // Cooldown Mesada
    },

    // Multiplicadores de Conversão
    RATES: {
        IDLE: 100,      // 1 GEGP+ (Idle) = 100 Universais
        CARD: 5000,     // 1 GEGP+ (Card) = 5000 Universais
        LAB: 1          // 1 GEGP+ (Lab)  = 1 Universal
    },

    // Estado Local (Carregado na memória)
    data: {
        idle: { gegp: 0, items: [] },
        card: 0,
        lab: { gegp: 0, suz: 0, renome: 0 },
        bank: { vault: 0, loan: { active: false, amount: 0, due: 0 } },
        pass: { claimed: [], seasonId: '1' },
        locked: false
    },

    // --- SISTEMA DE ARQUIVOS (IO) ---

    // Lê todas as chaves espalhadas e unifica na memória
    loadAll: function() {
        console.log("Universe: Lendo chaves dos jogos...");

        // 1. Load Idle (Tenta chaves diferentes e previne erros de JSON)
        try {
            let rawIdle = localStorage.getItem(this.KEYS.IDLE) || localStorage.getItem(this.KEYS.IDLE_ALT);
            this.data.idle = rawIdle ? JSON.parse(rawIdle) : { gegp: 0, items: [] };
        } catch(e) { this.data.idle = { gegp: 0, items: [] }; }

        // 2. Load Card (Geralmente é apenas um número string)
        this.data.card = Number(localStorage.getItem(this.KEYS.CARD)) || 0;

        // 3. Load Lab
        try {
            let rawLab = localStorage.getItem(this.KEYS.LAB);
            this.data.lab = rawLab ? JSON.parse(rawLab) : { gegp: 0, suz: 0, renome: 0 };
        } catch(e) { this.data.lab = { gegp: 0, suz: 0, renome: 0 }; }

        // 4. Load Bank & Pass & System
        try {
            this.data.bank = JSON.parse(localStorage.getItem(this.KEYS.BANK)) || { vault: 0, loan: { active: false, amount: 0, due: 0 } };
            this.data.pass = JSON.parse(localStorage.getItem(this.KEYS.PASS)) || { claimed: [], seasonId: '1' };
            this.data.locked = localStorage.getItem(this.KEYS.LOCK) === 'true';
        } catch(e) {}

        this.updateUI();
    },

    // Salva o estado da memória de volta para as chaves individuais
    saveAll: function() {
        // Salva Idle
        localStorage.setItem(this.KEYS.IDLE, JSON.stringify(this.data.idle));
        
        // Salva Card
        localStorage.setItem(this.KEYS.CARD, this.data.card.toString());
        
        // Salva Lab
        localStorage.setItem(this.KEYS.LAB, JSON.stringify(this.data.lab));
        
        // Salva Sistemas Internos
        localStorage.setItem(this.KEYS.BANK, JSON.stringify(this.data.bank));
        localStorage.setItem(this.KEYS.PASS, JSON.stringify(this.data.pass));
        localStorage.setItem(this.KEYS.LOCK, this.data.locked);

        this.updateUI();
    },

    // --- GERADOR DE SAVE ÚNICO (Download) ---
    exportSave: function() {
        // Atualiza memória antes de exportar
        this.loadAll(); 

        const megaSave = {
            meta: {
                version: "4.0",
                date: new Date().toISOString(),
                user: "GEGP User"
            },
            // Empacota tudo num objeto só
            payload: {
                [this.KEYS.IDLE]: JSON.stringify(this.data.idle),
                [this.KEYS.CARD]: this.data.card.toString(),
                [this.KEYS.LAB]: JSON.stringify(this.data.lab),
                [this.KEYS.BANK]: JSON.stringify(this.data.bank),
                [this.KEYS.PASS]: JSON.stringify(this.data.pass),
                [this.KEYS.LOCK]: this.data.locked.toString()
            }
        };

        const blob = new Blob([JSON.stringify(megaSave, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GEGP_Universe_Save_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    // Importar Save Único (Restaura todas as chaves)
    importSave: function(fileInput) {
        const file = fileInput.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if(!json.payload) throw new Error("Formato inválido");

                // Restaura cada chave no LocalStorage
                Object.keys(json.payload).forEach(key => {
                    localStorage.setItem(key, json.payload[key]);
                });

                alert("Backup restaurado com sucesso! Todos os jogos foram atualizados.");
                location.reload();
            } catch(err) {
                alert("Erro ao ler arquivo: " + err.message);
            }
        };
        reader.readAsText(file);
    },

    // --- LÓGICA DO BANCO ---
    Bank: {
        convert: function(from, to, amount) {
            amount = Number(amount);
            if(amount <= 0) return alert("Valor inválido");

            // 1. Verificar Saldo Origem
            let balanceOrigin = 0;
            if (from === 'IDLE') balanceOrigin = Number(Universe.data.idle.gegp || 0);
            if (from === 'CARD') balanceOrigin = Universe.data.card;
            if (from === 'LAB') balanceOrigin = Number(Universe.data.lab.gegp || 0);

            if (balanceOrigin < amount) return alert("Saldo insuficiente em " + from);

            // 2. Calcular Universais
            const univValue = amount * Universe.RATES[from];

            // 3. Debitar Origem
            if (from === 'IDLE') Universe.data.idle.gegp -= amount;
            if (from === 'CARD') Universe.data.card -= amount;
            if (from === 'LAB') Universe.data.lab.gegp -= amount;

            // 4. Creditar Destino
            if (to === 'VAULT') {
                const bonus = univValue * 0.30; // 30% bonus
                Universe.data.bank.vault += (univValue + bonus);
            } else {
                const destAmount = univValue / Universe.RATES[to];
                if (to === 'IDLE') Universe.data.idle.gegp = (Number(Universe.data.idle.gegp) || 0) + destAmount;
                if (to === 'CARD') Universe.data.card += destAmount;
                if (to === 'LAB') Universe.data.lab.gegp = (Number(Universe.data.lab.gegp) || 0) + destAmount;
            }

            Universe.saveAll();
            alert("Transação Realizada!");
        },

        withdrawVault: function() {
            if(Universe.data.bank.vault <= 0) return;
            const amount = Universe.data.bank.vault;
            const tax = amount * 0.10;
            const net = amount - tax;

            Universe.data.bank.vault = 0;
            
            // Devolve para Idle por padrão (convertendo de volta)
            const idleAmount = net / Universe.RATES.IDLE;
            Universe.data.idle.gegp = (Number(Universe.data.idle.gegp)||0) + idleAmount;
            
            Universe.saveAll();
            alert(`Resgatado ${net.toFixed(2)} Universais para o Idle (${idleAmount.toFixed(0)} GEGP+). Taxa: ${tax.toFixed(2)}`);
        }
    },

    // --- LÓGICA DO PASSE ---
    Pass: {
        tiers: [], // Será preenchido no init
        
        generateTiers: function() {
            for(let i=1; i<=30; i++) {
                this.tiers.push({
                    id: i,
                    req: i * 2000, // Exemplo simples: XP Global necessário
                    reward: i * 500, // Reward em Universais (creditado no Idle)
                    desc: `Nível ${i}: Requer ${i*2000} XP Global`
                });
            }
        },

        calcXP: function() {
            // XP baseada na riqueza total convertida em Universais
            const idleUniv = (Number(Universe.data.idle.gegp)||0) * Universe.RATES.IDLE;
            const cardUniv = Universe.data.card * Universe.RATES.CARD;
            const labUniv = (Number(Universe.data.lab.gegp)||0) * Universe.RATES.LAB;
            return Math.floor((idleUniv + cardUniv + labUniv) / 100); // 1 XP a cada 100 Universais
        },

        claim: function(id) {
            if(Universe.data.pass.claimed.includes(id)) return;
            const tier = this.tiers.find(t => t.id === id);
            const currentXP = this.calcXP();

            if(currentXP >= tier.req) {
                // Paga no Idle
                const rewardInIdle = tier.reward / Universe.RATES.IDLE; // Converte universais do premio para GEGP Idle
                Universe.data.idle.gegp = (Number(Universe.data.idle.gegp)||0) + rewardInIdle;
                Universe.data.pass.claimed.push(id);
                Universe.saveAll();
                alert(`Recompensa Reivindicada! +${rewardInIdle} GEGP+ no Idle.`);
            } else {
                alert("Nível ainda bloqueado!");
            }
        }
    },

    // --- CONTROLE PARENTAL ---
    Control: {
        toggleLock: function() {
            Universe.data.locked = !Universe.data.locked;
            Universe.saveAll();
        },
        
        sendBonus: function() {
            // Adiciona 1000 GEGP+ no Idle
            Universe.data.idle.gegp = (Number(Universe.data.idle.gegp)||0) + 1000;
            Universe.saveAll();
            alert("Mesada de 1000 GEGP+ enviada para o Idle Ovelha!");
        },

        resetAll: function() {
            localStorage.clear();
            location.reload();
        }
    },

    // --- UI HELPERS ---
    updateUI: function() {
        // Atualiza displays se os elementos existirem na pagina
        const setText = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).textContent = txt; };
        const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val; };

        // Saldos
        setText('disp-idle', (Number(this.data.idle.gegp)||0).toLocaleString());
        setText('disp-card', this.data.card.toLocaleString());
        setText('disp-lab', (Number(this.data.lab.gegp)||0).toLocaleString());
        setText('disp-vault', this.data.bank.vault.toFixed(2));
        
        // Status Bloqueio
        setText('lock-status', this.data.locked ? "BLOQUEADO 🔒" : "LIBERADO 🔓");
        if(document.getElementById('lock-status')) {
            document.getElementById('lock-status').className = this.data.locked ? "text-red-500 font-bold" : "text-emerald-500 font-bold";
        }

        // Passe
        const xp = this.Pass.calcXP();
        setText('xp-global', xp);
        
        // Renderiza lista do Passe se existir o container
        const passGrid = document.getElementById('pass-grid');
        if(passGrid) {
            passGrid.innerHTML = '';
            this.Pass.tiers.forEach(tier => {
                const claimed = this.data.pass.claimed.includes(tier.id);
                const locked = xp < tier.req;
                
                const div = document.createElement('div');
                div.className = `p-4 rounded-xl border ${claimed ? 'bg-emerald-900/20 border-emerald-500/50' : (locked ? 'bg-slate-800 border-slate-700 opacity-50' : 'bg-blue-900/20 border-blue-500')}`;
                div.innerHTML = `
                    <div class="flex justify-between mb-2">
                        <span class="font-bold text-white">Nível ${tier.id}</span>
                        <span class="text-xs text-slate-400">${tier.req} XP</span>
                    </div>
                    <p class="text-xs text-slate-300 mb-3">Prêmio: ${tier.reward} Univ.</p>
                    <button onclick="Universe.Pass.claim(${tier.id})" class="w-full py-2 rounded-lg text-xs font-bold ${claimed ? 'bg-transparent text-emerald-500 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-500'}">
                        ${claimed ? 'RESGATADO' : (locked ? 'BLOQUEADO' : 'RESGATAR')}
                    </button>
                `;
                passGrid.appendChild(div);
            });
        }
    },

    init: function() {
        this.Pass.generateTiers();
        this.loadAll();
        // Auto-save/sync a cada 2 segundos
        setInterval(() => this.loadAll(), 2000); // Lê atualizações dos jogos
        console.log("Universe Core Inicializado.");
    }
};

// Inicializa ao carregar a janela
window.addEventListener('load', () => Universe.init());