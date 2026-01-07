        // --- CONFIGURAÇÃO DE CHAVES ---
        const KEYS = {
            IDLE: 'idlegame_ovelha_gegp_fixed',
            CARD: 'gegp_v3_bal',
            LDS2: 'lab_suzana_mob_v1',
            PASSE: 'passe_gegp_v3_master'
        };

        // --- SISTEMA DE TEMPO (BRASÍLIA) ---
        function getBrasiliaInfo() {
            const now = new Date();
            const brasiliaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            const month = brasiliaTime.getMonth(); // 0-11
            const year = brasiliaTime.getFullYear();
            const lastDay = new Date(year, month + 1, 0).getDate();
            const daysLeft = lastDay - brasiliaTime.getDate();
            
            return { month, year, daysLeft, key: `pass_${month}_${year}` };
        }

        // --- GERADOR DE 30 TIERS ---
        const generateTiers = () => {
            const tiers = [];
            for(let i = 1; i <= 30; i++) {
                let reward = i * 200; // Escala básica de recompensa
                if (i === 15) reward = 10000;
                if (i === 30) reward = 50000;

                // Definindo tipos de missões variadas
                let mission = {};
                if (i % 3 === 0) {
                    mission = {
                        game: 'IDLE',
                        title: `Magnata Nível ${i}`,
                        desc: `Acumule R$ ${(i * 50000).toLocaleString()} no Idle.`,
                        check: (s) => s.idleMoney >= (i * 50000)
                    };
                } else if (i % 2 === 0) {
                    mission = {
                        game: 'LDS2',
                        title: `Estrela Suzana ${i}`,
                        desc: `Tenha ${i * 5} XP Suzana (Estrelas) no LDS2.`,
                        check: (s) => s.lds2Suz >= (i * 5)
                    };
                } else {
                    mission = {
                        game: 'CARD',
                        title: `Mestre das Cartas ${i}`,
                        desc: `Alcance score ${i * 2} no Ovelha Card.`,
                        check: (s) => s.cardScore >= (i * 2)
                    };
                }

                // Ajustes de missões especiais
                if (i === 15) {
                    mission.desc = "Publique 2 Teses (Renome 2) no LDS2.";
                    mission.check = (s) => s.lds2Renome >= 2;
                }
                if (i === 30) {
                    mission.desc = "Tenha 1 milhão de GEGP+ no Idle Ovelha.";
                    mission.check = (s) => s.idleGEGP >= 1000000;
                }

                tiers.push({
                    id: i,
                    ...mission,
                    rewardAmount: reward,
                    rewardText: `+${reward.toLocaleString()} GEGP+`
                });
            }
            return tiers;
        };

        const TIERS = generateTiers();

        // --- ESTADO DO JOGADOR ---
        let playerStats = {
            idleGEGP: 0, idleMoney: 0,
            cardScore: 0,
            lds2Suz: 0, lds2Renome: 0
        };

        let passSave = {
            monthKey: "",
            claimed: []
        };

        // --- LÓGICA DE NEGÓCIO ---

        function initPass() {
            const info = getBrasiliaInfo();
            const saved = localStorage.getItem(KEYS.PASSE);
            
            if (saved) {
                const parsed = JSON.parse(saved);
                // Reset Mensal Automático
                if (parsed.monthKey !== info.key) {
                    passSave = { monthKey: info.key, claimed: [] };
                    savePass();
                } else {
                    passSave = parsed;
                }
            } else {
                passSave = { monthKey: info.key, claimed: [] };
                savePass();
            }

            document.getElementById('timer-display').textContent = `Faltam ${info.daysLeft} dias para o reset mensal`;
            syncAll();
        }

        function savePass() {
            localStorage.setItem(KEYS.PASSE, JSON.stringify(passSave));
        }

        function syncAll() {
            // Ler Idle
            try {
                const idle = JSON.parse(localStorage.getItem(KEYS.IDLE));
                if (idle) {
                    playerStats.idleGEGP = Number(idle.gegp) || 0;
                    playerStats.idleMoney = Number(idle.dinheiro) || 0;
                    document.getElementById('save-idle').textContent = `${playerStats.idleGEGP.toLocaleString()} GEGP+`;
                }
            } catch(e) {}

            // Ler Card
            try {
                const card = localStorage.getItem(KEYS.CARD);
                if (card) {
                    playerStats.cardScore = Number(card);
                    document.getElementById('save-card').textContent = `Score: ${playerStats.cardScore}`;
                }
            } catch(e) {}

            // Ler LDS2
            try {
                const lds = JSON.parse(localStorage.getItem(KEYS.LDS2));
                if (lds) {
                    playerStats.lds2Suz = Number(lds.suz) || 0;
                    playerStats.lds2Renome = Number(lds.renome) || 0;
                    document.getElementById('save-lds2').textContent = `${playerStats.lds2Suz} XP / ${playerStats.lds2Renome} Renome`;
                }
            } catch(e) {}

            updateUI();
        }

        function updateUI() {
            const grid = document.getElementById('tiers-grid');
            grid.innerHTML = '';
            
            let unlockedCount = 0;
            let xpTotal = playerStats.idleGEGP + (playerStats.lds2Suz * 10) + (playerStats.cardScore * 5);
            document.getElementById('global-xp').textContent = xpTotal.toLocaleString();

            TIERS.forEach(tier => {
                const isCompleted = tier.check(playerStats);
                const isClaimed = passSave.claimed.includes(tier.id);
                if (isCompleted) unlockedCount++;

                const card = document.createElement('div');
                card.className = `tier-card glass p-6 rounded-3xl border border-white/5 flex flex-col justify-between ${!isCompleted ? 'locked' : ''} ${isClaimed ? 'claimed' : ''}`;
                
                let btn = '';
                if (isClaimed) {
                    btn = `<div class="w-full py-3 bg-emerald-500/20 text-emerald-500 text-center rounded-xl font-black text-xs uppercase tracking-widest"><i class="fa-solid fa-check mr-2"></i>Coletado</div>`;
                } else if (isCompleted) {
                    btn = `<button onclick="claim(${tier.id})" class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all">Reivindicar</button>`;
                } else {
                    btn = `<div class="w-full py-3 bg-slate-800 text-slate-500 text-center rounded-xl font-black text-xs uppercase tracking-widest">Bloqueado</div>`;
                }

                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start mb-4">
                            <span class="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-400">NÍVEL ${tier.id}</span>
                            <div class="text-blue-500">
                                <i class="fa-solid ${tier.game === 'IDLE' ? 'fa-sheep' : (tier.game === 'CARD' ? 'fa-clone' : 'fa-dna')}"></i>
                            </div>
                        </div>
                        <h3 class="font-extrabold text-white mb-1 leading-tight">${tier.title}</h3>
                        <p class="text-xs text-slate-500 mb-6">${tier.desc}</p>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="reward-badge p-3 rounded-2xl flex items-center gap-3">
                            <div class="text-purple-400"><i class="fa-solid fa-gem"></i></div>
                            <div>
                                <p class="text-[8px] text-slate-500 uppercase font-black">Recompensa</p>
                                <p class="text-sm font-bold text-white">${tier.rewardText}</p>
                            </div>
                        </div>
                        ${btn}
                    </div>
                `;
                grid.appendChild(card);
            });

            // Update Header Stats
            document.getElementById('global-level').textContent = unlockedCount;
            const progressPercent = (unlockedCount / 30) * 100;
            document.getElementById('master-progress').style.width = `${progressPercent}%`;
            document.getElementById('progress-text').textContent = `${unlockedCount} / 30 Níveis Concluídos`;
        }

        function claim(id) {
            const tier = TIERS.find(t => t.id === id);
            if (!tier) return;

            // Injeção de Dados (Idle)
            try {
                const raw = localStorage.getItem(KEYS.IDLE);
                let data = raw ? JSON.parse(raw) : { gegp: 0 };
                data.gegp = (Number(data.gegp) || 0) + tier.rewardAmount;
                localStorage.setItem(KEYS.IDLE, JSON.stringify(data));
                
                passSave.claimed.push(id);
                savePass();
                
                document.getElementById('modal-msg').textContent = `Injetado com sucesso: ${tier.rewardText} no seu save do Idle Ovelha.`;
                document.getElementById('modal').classList.remove('hidden');
                
                syncAll();
            } catch(e) {
                alert("Erro ao injetar recompensa. Verifique se o jogo Idle foi aberto neste navegador.");
            }
        }

        function closeModal() {
            document.getElementById('modal').classList.add('hidden');
        }

        // --- INIT ---
        initPass();
        setInterval(syncAll, 5000); // Sincroniza saves a cada 5 segundos