     // --- DADOS DO JOGO (Mesma lógica, adaptada para UX) ---
        const ORIGENS_DB = [
            { id: 1, n: "Não Quero", e: "😒", r: "Comum" },
            { id: 2, n: "Tanto Faz", e: "😑", r: "Comum" },
            { id: 3, n: "Quase Alguém", e: "👤", r: "Comum" },
            { id: 4, n: "Fulano", e: "👔", r: "Comum" },
            { id: 5, n: "Erro 404", e: "🚫", r: "Incomum" },
            { id: 6, n: "Vontade Ir", e: "🏃", r: "Incomum" },
            { id: 7, n: "Coisa Nenhuma", e: "🌫️", r: "Incomum" },
            { id: 8, n: "Talvez Amanhã", e: "💤", r: "Comum" },
            { id: 9, n: "Deus Me Livre", e: "😱", r: "Raro" },
            { id: 10, n: "Sei Lá", e: "🤷‍♂️", r: "Comum" },
            { id: 11, n: "Meio Termo", e: "⚖️", r: "Incomum" },
            { id: 12, n: "Cansado", e: "😫", r: "Comum" },
            { id: 13, n: "O Outro", e: "👥", r: "Raro" },
            { id: 14, n: "Qualquer Um", e: "🎭", r: "Comum" },
            { id: 15, n: "Só Olhando", e: "👀", r: "Incomum" },
            { id: 16, n: "Vou Ver", e: "📱", r: "Comum" },
            { id: 17, n: "Esqueci", e: "🧠", r: "Raro" },
            { id: 18, n: "Nem Vi", e: "🙈", r: "Incomum" },
            { id: 19, n: "Pois É", e: "💬", r: "Comum" },
            { id: 20, n: "Sim Mas Não", e: "🌓", r: "Raro" },
            { id: 21, n: "Quase Nada", e: "🤏", r: "Incomum" },
            { id: 22, n: "Já Vou", e: "⌛", r: "Raro" },
            { id: 23, n: "Aquele Lá", e: "👉", r: "Lendário" },
            { id: 24, n: "Tipo Isso", e: "📐", r: "Comum" },
            { id: 25, n: "Sei Não", e: "🤔", r: "Incomum" },
            { id: 26, n: "Olha Só", e: "✨", r: "Lendário" },
            { id: 27, n: "Quem Sou", e: "❓", r: "Mítico" },
            { id: 28, n: "Faz Parte", e: "🧩", r: "Incomum" },
            { id: 29, n: "Tô Nem Aí", e: "💅", r: "Mítico" },
            { id: 30, n: "O Fim", e: "💀", r: "Divino" }
        ];

        let game = {
            data: {
                gegp: 0,
                suz: 0,
                discovered: [],
                levels: {},
                renome: 0
            },
            combo: 0,
            comboTimer: null,
            lastTick: Date.now(),
            baseGen: 0,

            init() {
                // Recuperar Save
                const save = localStorage.getItem('lab_suzana_mob_v1');
                if(save) {
                    try { this.data = {...this.data, ...JSON.parse(save)}; } 
                    catch(e) { console.error("Save Error"); }
                }
                
                // Inicializar níveis zerados se faltar
                ORIGENS_DB.forEach(o => {
                    if (this.data.levels[o.id] === undefined) this.data.levels[o.id] = 0;
                });

                // Listeners de Interação Rápida
                const clicker = document.getElementById('btn-work');
                
                // Suporte para Touch e Mouse sem duplicar
                const handleInteract = (e) => {
                    e.preventDefault(); 
                    // Se for touch, pega o primeiro toque, se não, pega o evento do mouse
                    const x = e.touches ? e.touches[0].clientX : e.clientX;
                    const y = e.touches ? e.touches[0].clientY : e.clientY;
                    this.handleClick(x, y);
                };

                clicker.addEventListener('touchstart', handleInteract, {passive: false});
                clicker.addEventListener('mousedown', handleInteract);

                ui.init();
                this.loop();
                setInterval(() => this.save(), 5000);
            },

            save() { localStorage.setItem('lab_suzana_mob_v1', JSON.stringify(this.data)); },

            loop() {
                const now = Date.now();
                const delta = (now - this.lastTick) / 1000;
                this.lastTick = now;

                // Produção
                let prod = 0;
                this.data.discovered.forEach(id => {
                    prod += 0.5 * (1 + (this.data.levels[id] * 0.5));
                });
                
                // Multiplicador Global
                const globalMult = 1 + (this.data.renome * 0.10);
                prod *= globalMult;
                this.baseGen = prod;

                if (prod > 0) this.data.gegp += prod * delta;

                // Loop UI
                ui.updateLoop(this.data.gegp, prod, this.data.suz, this.combo);
                
                requestAnimationFrame(() => this.loop());
            },

            handleClick(x, y) {
                // Lógica de Combo
                this.combo++;
                clearTimeout(this.comboTimer);
                this.comboTimer = setTimeout(() => {
                    this.combo = 0;
                    ui.updateCombo(0);
                }, 1500);

                // Cálculo Ganho
                const autoBonus = this.baseGen * 0.05; 
                const comboMult = 1 + (this.combo * 0.1);
                const renomeMult = 1 + (this.data.renome * 0.1);
                let gain = (1 + autoBonus) * comboMult * renomeMult;

                const isCrit = Math.random() < 0.05;
                if (isCrit) gain *= 5;

                this.data.gegp += gain;

                // Feedback
                ui.spawnParticle(x, y, gain, isCrit);
                ui.popButton();
                ui.updateCombo(this.combo);
            },

            synthesize() {
                if (this.data.discovered.length >= 30) {
                    // Abre modal de prestígio se cheio
                    ui.showPrestigeModal();
                    return;
                }
                
                const cost = 50;
                if (this.data.gegp < cost) return;

                this.data.gegp -= cost;
                
                // Lógica Gacha Garantido
                const missing = ORIGENS_DB.filter(o => !this.data.discovered.includes(o.id));
                const next = missing[Math.floor(Math.random() * missing.length)];
                
                // Feedback visual no botão
                const btn = document.getElementById('btn-synth');
                btn.classList.add('brightness-150');
                setTimeout(() => btn.classList.remove('brightness-150'), 100);

                this.data.discovered.push(next.id);
                ui.renderLab();
                ui.renderDoc();
                this.save();
                
                // Scroll suave até o novo item (opcional, mas bom pra UX)
                // document.getElementById('view-lab').scrollTop = document.getElementById('view-lab').scrollHeight;
            },

            upgradeSpecimen(id) {
                const lvl = this.data.levels[id];
                const cost = 10 * (lvl + 1);

                if (this.data.suz >= cost) {
                    this.data.suz -= cost;
                    this.data.levels[id]++;
                    ui.renderDoc(); // Atualiza UI para mostrar novo nível/custo
                    this.save();
                }
            },

            doPrestige() {
                const reward = 100 + (this.data.renome * 10);
                this.data.suz += reward;
                this.data.renome++;
                this.data.discovered = [];
                this.data.gegp = 0;
                
                document.getElementById('panel-prestige').classList.add('hidden');
                ui.renderLab();
                ui.renderDoc();
                this.save();
            }
        };

        // --- UI MANAGER ---
        const ui = {
            init() {
                this.renderLab();
                this.renderDoc();
                this.tab('lab');
            },

            updateLoop(gegp, perSec, suz, combo) {
                // Formatação compacta para Mobile (ex: 1.2k)
                const fmt = (n) => n > 9999 ? (n/1000).toFixed(1) + 'k' : Math.floor(n).toLocaleString();

                document.getElementById('gegp-val').textContent = fmt(gegp);
                document.getElementById('gegp-sec').textContent = `+${perSec.toFixed(1)}/s`;
                document.getElementById('suz-val').textContent = fmt(suz);
                document.getElementById('renome-lvl').textContent = `R: ${game.data.renome}`;
                
                // Atualizar Botão Sintetizar
                const btnSynth = document.getElementById('btn-synth');
                const costLabel = document.getElementById('cost-synth');
                
                if (game.data.discovered.length >= 30) {
                    btnSynth.classList.remove('bg-indigo-900/80');
                    btnSynth.classList.add('bg-yellow-600', 'border-yellow-400');
                    btnSynth.querySelector('span').textContent = "COLEÇÃO COMPLETA!";
                    costLabel.textContent = "PUBLICAR";
                    costLabel.classList.replace('text-cyan-300', 'text-white');
                    btnSynth.onclick = () => ui.showPrestigeModal();
                } else {
                    // Estado Normal
                    btnSynth.classList.add('bg-indigo-900/80');
                    btnSynth.classList.remove('bg-yellow-600', 'border-yellow-400');
                    btnSynth.querySelector('span').textContent = "SINTETIZAR DNA";
                    costLabel.textContent = "50 ⚡";
                    costLabel.classList.replace('text-white', 'text-cyan-300');
                    btnSynth.onclick = () => game.synthesize();
                    
                    if (gegp < 50) {
                        btnSynth.disabled = true;
                        btnSynth.classList.add('opacity-50');
                    } else {
                        btnSynth.disabled = false;
                        btnSynth.classList.remove('opacity-50');
                    }
                }

                document.getElementById('doc-suz-display').textContent = fmt(suz);
            },

            updateCombo(val) {
                const badge = document.getElementById('combo-badge');
                const txt = document.getElementById('combo-val');
                const bar = document.getElementById('combo-bar');
                
                if (val > 1) {
                    badge.classList.remove('hidden');
                    txt.textContent = val;
                } else {
                    badge.classList.add('hidden');
                }
                
                const pct = Math.min((val / 50) * 100, 100);
                bar.style.width = `${pct}%`;
            },

            popButton() {
                const btn = document.getElementById('btn-work');
                btn.style.transform = "scale(0.90)";
                setTimeout(() => btn.style.transform = "scale(1)", 80);
            },

            spawnParticle(x, y, amount, isCrit) {
                const p = document.createElement('div');
                p.className = `click-particle ${isCrit ? 'crit-text text-xl' : 'text-cyan-300 text-lg'}`;
                p.textContent = `+${Math.floor(amount)}`;
                
                // Ajuste para não sair da tela no mobile
                const finalX = Math.min(Math.max(x, 20), window.innerWidth - 50);
                
                p.style.left = `${finalX}px`;
                p.style.top = `${y - 40}px`;
                
                document.body.appendChild(p);
                setTimeout(() => p.remove(), 750);
            },

            renderLab() {
                const grid = document.getElementById('lab-grid');
                const empty = document.getElementById('empty-state');
                const count = document.getElementById('count-lab');
                const disc = game.data.discovered;
                
                count.textContent = `${disc.length}/30`;
                
                if(disc.length === 0) {
                    empty.classList.remove('hidden');
                    grid.innerHTML = '';
                    return;
                }
                empty.classList.add('hidden');
                
                // Ordenar por ID para ficar bonitinho
                const sorted = [...disc].sort((a,b) => a-b);
                
                // Re-render parcial (apenas limpar e refazer é ok para este tamanho)
                grid.innerHTML = '';
                
                sorted.forEach(id => {
                    const o = ORIGENS_DB.find(x => x.id === id);
                    const lvl = game.data.levels[id];
                    
                    // Definir cor da borda pela raridade
                    let bColor = 'border-white/10';
                    if(o.r === 'Raro') bColor = 'border-purple-500/50';
                    if(o.r === 'Lendário') bColor = 'border-yellow-500/80';
                    if(o.r === 'Mítico') bColor = 'border-pink-500/80';

                    const card = document.createElement('div');
                    card.className = `glass-panel p-2 flex flex-col items-center justify-center relative aspect-square ${bColor}`;
                    card.innerHTML = `
                        <div class="text-2xl mb-1">${o.e}</div>
                        <div class="text-[9px] text-center w-full truncate text-slate-300 font-bold leading-tight">${o.n}</div>
                        <div class="absolute top-1 right-1 text-[8px] bg-black/50 px-1 rounded text-cyan-400 font-mono">v${lvl}</div>
                    `;
                    grid.appendChild(card);
                });
            },

            renderDoc() {
                const list = document.getElementById('doc-list');
                list.innerHTML = '';
                
                ORIGENS_DB.forEach(o => {
                    // Mostrar apenas itens que já foram descobertos pelo menos uma vez na história?
                    // Para simplificar, mostramos todos, mas desativados se nunca vistos (ou sempre ativos, já que upgrades são persistentes)
                    // Vamos manter a lógica: Se você tem o nível > 0, mostra ativo. Se não, mostra desativado se não tiver descoberto na run atual.
                    // Para ser Mobile Friendly, vamos mostrar todos em lista compacta.
                    
                    const lvl = game.data.levels[o.id];
                    const cost = 10 * (lvl + 1);
                    const canAfford = game.data.suz >= cost;
                    const isKnown = game.data.discovered.includes(o.id) || lvl > 0;

                    const item = document.createElement('div');
                    item.className = `flex justify-between items-center p-3 rounded-lg border bg-black/20 ${isKnown ? 'border-white/10 opacity-100' : 'border-white/5 opacity-40 grayscale'}`;
                    
                    item.innerHTML = `
                        <div class="flex items-center gap-3">
                            <div class="text-2xl w-8 text-center">${o.e}</div>
                            <div class="flex flex-col">
                                <span class="text-xs font-bold text-slate-200">${o.n}</span>
                                <span class="text-[10px] text-cyan-500 font-mono">Nível Atual: ${lvl}</span>
                            </div>
                        </div>
                        <button onclick="game.upgradeSpecimen(${o.id})" 
                            class="h-8 px-4 rounded text-xs font-bold transition-colors
                            ${canAfford && isKnown ? 'bg-yellow-600 text-white shadow-lg active:bg-yellow-700' : 'bg-slate-800 text-slate-500 border border-slate-700'}"
                            ${!canAfford || !isKnown ? 'disabled' : ''}>
                            ${cost} ★
                        </button>
                    `;
                    list.appendChild(item);
                });
            },

            tab(t) {
                const vLab = document.getElementById('view-lab');
                const vDoc = document.getElementById('view-doc');
                const tLab = document.getElementById('tab-lab');
                const tDoc = document.getElementById('tab-doc');

                if (t === 'lab') {
                    vLab.classList.remove('hidden');
                    vDoc.classList.add('hidden');
                    tLab.classList.replace('border-transparent', 'border-cyan-400');
                    tLab.classList.replace('text-slate-500', 'text-cyan-400');
                    tDoc.classList.replace('border-yellow-400', 'border-transparent');
                    tDoc.classList.replace('text-yellow-400', 'text-slate-500');
                } else {
                    vLab.classList.add('hidden');
                    vDoc.classList.remove('hidden');
                    tDoc.classList.replace('border-transparent', 'border-yellow-400');
                    tDoc.classList.replace('text-slate-500', 'text-yellow-400');
                    tLab.classList.replace('border-cyan-400', 'border-transparent');
                    tLab.classList.replace('text-cyan-400', 'text-slate-500');
                }
            },
            
            showPrestigeModal() {
                document.getElementById('panel-prestige').classList.remove('hidden');
                // Calcula recompensa dinâmica
                const r = 100 + (game.data.renome * 10);
                document.getElementById('prestige-reward').textContent = r;
            }
        };

        window.onload = () => game.init();
// Faz o navegador enxergar o jogo e a interface
window.game = game;
window.ui = ui;

window.onload = () => game.init();
