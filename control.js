     const CONFIG = {
            KEYS: {
                IDLE: 'idlegame_ovelha_gegp_',
                CARD: 'gegpPlusBalance',
                LAB: 'lab_suzana_v4',
                PARENT_COOLDOWN: 'parent_bonus_v6_time',
                GAME_LOCKED: 'gegp_global_lock', // Chave para bloqueio global
                PIN: '1234'
            }
        };

        const state = { 
            wealth: { total: 0, idle: 0, card: 0, lab: 0 },
            time: { total: 0, idle: 0, lab: 0 }
        };

        // --- CORE UTILS ---
        const el = (id) => document.getElementById(id);
        const formatMoney = (n) => Number(n).toLocaleString('pt-BR');
        const log = (msg, type='info') => {
            const container = el('logs');
            const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' });
            const colors = { info: 'text-emerald-400', warn: 'text-amber-400', error: 'text-red-400', lock: 'text-blue-400' };
            const div = document.createElement('div');
            div.className = `flex gap-2 ${colors[type]}`;
            div.innerHTML = `<span class="opacity-40">[${time}]</span> <span>${msg}</span>`;
            container.prepend(div);
            if (container.children.length > 30) container.lastChild.remove();
        };

        // --- DATA SYNC ---
        function sync() {
            try {
                // Idle
                const i = JSON.parse(localStorage.getItem(CONFIG.KEYS.IDLE) || '{}');
                state.wealth.idle = Number(i.gegp || 0);
                state.time.idle = Math.floor((i.stats?.totalPlayTimeSeconds || 0) / 60);

                // Card
                state.wealth.card = Number(localStorage.getItem(CONFIG.KEYS.CARD) || 0);

                // Lab
                const l = JSON.parse(localStorage.getItem(CONFIG.KEYS.LAB) || '{}');
                state.wealth.lab = Number(l.gegp || 0);
                state.time.lab = Math.floor((l.playTime || 0) / 60);

                // Totals
                state.wealth.total = state.wealth.idle + state.wealth.card + state.wealth.lab;
                state.time.total = state.time.idle + state.time.lab;

                updateDashboard();
            } catch (e) { console.error(e); }
        }

        function updateDashboard() {
            el('display-total').textContent = formatMoney(state.wealth.total);
            el('display-time').textContent = state.time.total + 'm';
            el('time-idle').textContent = state.time.idle + 'm';
            el('time-lab').textContent = state.time.lab + 'm';

            const total = state.wealth.total || 1;
            const updateBar = (id, val) => {
                const p = Math.round((val / total) * 100);
                el(`percent-${id}`).textContent = p + '%';
                el(`bar-${id}`).style.width = p + '%';
            };
            updateBar('idle', state.wealth.idle);
            updateBar('card', state.wealth.card);
            updateBar('lab', state.wealth.lab);

            // Update Lock State UI
            const isLocked = localStorage.getItem(CONFIG.KEYS.GAME_LOCKED) === 'true';
            const btn = el('btn-toggle-game-lock');
            const icon = el('lock-state-icon');
            const desc = el('lock-state-desc');
            const statusDot = el('status-dot');
            const statusText = el('status-text');

            if (isLocked) {
                btn.textContent = 'DESBLOQUEAR';
                btn.className = 'bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all';
                icon.className = 'bg-red-500/20 w-10 h-10 rounded-xl flex items-center justify-center text-red-500';
                icon.innerHTML = '<i class="fa-solid fa-lock"></i>';
                desc.textContent = 'Os jogos estão BLOQUEADOS no momento.';
                desc.className = 'text-xs text-red-400 font-bold';
                statusDot.className = 'w-2 h-2 rounded-full bg-red-500';
                statusText.textContent = 'LOCKED';
                statusText.className = 'text-red-500';
            } else {
                btn.textContent = 'BLOQUEAR';
                btn.className = 'bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all';
                icon.className = 'bg-slate-700 w-10 h-10 rounded-xl flex items-center justify-center text-white';
                icon.innerHTML = '<i class="fa-solid fa-unlock"></i>';
                desc.textContent = 'Jogos estão liberados para jogar';
                desc.className = 'text-xs text-slate-500';
                statusDot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
                statusText.textContent = 'ONLINE';
                statusText.className = 'text-slate-400';
            }
        }

        // --- SECURITY / PIN ---
        function unlockPanel() {
            if (el('pin-input').value === CONFIG.KEYS.PIN) {
                el('lock-overlay').classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => {
                    el('parent-content').classList.replace('blur-content', 'unblur-content');
                    el('lock-overlay').style.display = 'none';
                }, 300);
                log("Painel administrativo desbloqueado com sucesso.", "info");
            } else {
                el('pin-error').style.opacity = '1';
                setTimeout(() => el('pin-error').style.opacity = '0', 2000);
            }
        }

        function lockPanel() {
            el('lock-overlay').style.display = 'flex';
            setTimeout(() => {
                el('lock-overlay').classList.remove('opacity-0', 'pointer-events-none');
                el('parent-content').classList.replace('unblur-content', 'blur-content');
            }, 10);
            el('pin-input').value = '';
        }

        // --- ACTIONS ---
        function toggleGameLock() {
            const currentState = localStorage.getItem(CONFIG.KEYS.GAME_LOCKED) === 'true';
            localStorage.setItem(CONFIG.KEYS.GAME_LOCKED, !currentState);
            log(`Bloqueio Global de Jogos: ${!currentState ? 'ATIVADO' : 'DESATIVADO'}`, !currentState ? 'error' : 'info');
            sync();
        }

        // --- RESET LOGIC ---
        let currentConfirmAction = null;
        function promptReset() {
            showModal(
                "Apagar Todos os Dados", 
                "Isso excluirá permanentemente o progresso do Idle, Ovelha Card e Lab Suzana. Esta ação não pode ser desfeita.",
                () => {
                    localStorage.removeItem(CONFIG.KEYS.IDLE);
                    localStorage.removeItem(CONFIG.KEYS.CARD);
                    localStorage.removeItem(CONFIG.KEYS.LAB);
                    localStorage.removeItem(CONFIG.KEYS.PARENT_COOLDOWN);
                    log("TUDO FOI APAGADO. O sistema reiniciou os saves.", "error");
                    sync();
                    closeModal();
                }
            );
        }

        function showModal(title, desc, confirmFn) {
            el('modal-title').textContent = title;
            el('modal-desc').textContent = desc;
            el('confirm-modal').classList.remove('hidden');
            el('modal-confirm-btn').onclick = confirmFn;
        }

        function closeModal() {
            el('confirm-modal').classList.add('hidden');
        }

        function checkBonus() {
            const last = Number(localStorage.getItem(CONFIG.KEYS.PARENT_COOLDOWN)) || 0;
            const diff = (24 * 60 * 60 * 1000) - (Date.now() - last);
            const btn = el('btn-bonus');
            if (diff > 0) {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'grayscale');
                const h = Math.floor(diff / 3600000);
                el('cooldown-text').textContent = `Disponível em ${h}h`;
            } else {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'grayscale');
                el('cooldown-text').textContent = "+20 GEGP / +1 Amiguinho";
            }
        }

        el('btn-bonus').onclick = () => {
            const raw = localStorage.getItem(CONFIG.KEYS.IDLE);
            if (!raw) { log("Abra o jogo Idle primeiro!", "warn"); return; }
            const data = JSON.parse(raw);
            data.gegp = (data.gegp || 0) + 20;
            const amig = data.items?.find(i => i.id === 'amiguinho');
            if (amig) amig.qtd = (amig.qtd || 0) + 1;
            localStorage.setItem(CONFIG.KEYS.IDLE, JSON.stringify(data));
            localStorage.setItem(CONFIG.KEYS.PARENT_COOLDOWN, Date.now());
            log("Mesada diária enviada com sucesso!", "info");
            sync();
            checkBonus();
        };

        // --- INIT ---
        window.onload = () => {
            const d = new Date();
            el('system-date').textContent = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
            if (d.getDate() === 27 && d.getMonth() === 2) el('gabriel-event-container').classList.remove('hidden');
            
            sync();
            checkBonus();
            setInterval(sync, 2000);
            log("Nexus Core conectado ao LocalStorage local.", "info");
        };

        // Listen for PIN enter
        el('pin-input').addEventListener('keypress', (e) => { if(e.key === 'Enter') unlockPanel(); });
   