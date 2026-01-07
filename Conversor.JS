        const KEYS = {
            IDLE: 'idlegame_ovelha_gegp_fixed',
            CARD: 'gegp_v3_bal',
            LDS2: 'lab_suzana_mob_v1',
            BANK: 'gegp_bank_v2_system'
        };

        // Multiplicadores baseados na lógica solicitada (GEGP+ de jogo para Universal)
        const MULTIPLIERS = {
            IDLE: 100,      // 1 GEGP+ = 100 Univ
            CARD: 5000,     // 1 GEGP+ = 5000 Univ
            LDS2: 1         // 1 GEGP+ = 1 Univ
        };

        let bankState = {
            vault: 0,
            guarantee: 0,
            guaranteeRelease: null,
            loan: { active: false, amount: 0, installmentsLeft: 0, nextDue: null },
            logs: []
        };

        let localSaves = { IDLE: 0, CARD: 0, LDS2: 0 };

        function getBrasiliaDate() {
            return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        }

        function updateClocks() {
            const br = getBrasiliaDate();
            document.getElementById('br-time').textContent = br.toLocaleTimeString('pt-BR');
            checkAutomaticPayments();
        }

        function sync() {
            try {
                const idle = JSON.parse(localStorage.getItem(KEYS.IDLE));
                localSaves.IDLE = idle ? (Number(idle.gegp) || 0) : 0;
                
                localSaves.CARD = Number(localStorage.getItem(KEYS.CARD)) || 0;
                
                const lds = JSON.parse(localStorage.getItem(KEYS.LDS2));
                localSaves.LDS2 = lds ? (Number(lds.gegp) || 0) : 0;

                document.getElementById('bal-idle').textContent = localSaves.IDLE.toLocaleString();
                document.getElementById('bal-card').textContent = localSaves.CARD.toLocaleString();
                document.getElementById('bal-lds2').textContent = localSaves.LDS2.toLocaleString();

                const totalUniv = (localSaves.IDLE * MULTIPLIERS.IDLE) + 
                                  (localSaves.CARD * MULTIPLIERS.CARD) + 
                                  (localSaves.LDS2 * MULTIPLIERS.LDS2) + 
                                  bankState.vault;
                
                document.getElementById('total-balance').textContent = totalUniv.toLocaleString(undefined, {minimumFractionDigits: 2});
                document.getElementById('vault-balance').textContent = bankState.vault.toLocaleString(undefined, {minimumFractionDigits: 2});
                
                updateLoanUI();
            } catch(e) { console.error("Sync Error", e); }
        }

        function updatePreview() {
            const src = document.getElementById('src-game').value;
            const dst = document.getElementById('dst-game').value;
            const amount = parseFloat(document.getElementById('trans-amount').value) || 0;

            const universalAmount = amount * MULTIPLIERS[src];
            let result = 0;

            if (dst === 'VAULT') {
                result = universalAmount * 1.30; // Rendimento de 30%
            } else {
                result = universalAmount / MULTIPLIERS[dst]; // Conversão reversa
            }

            document.getElementById('preview-text').textContent = result.toLocaleString(undefined, {
                minimumFractionDigits: 2, 
                maximumFractionDigits: 4
            }) + (dst === 'VAULT' ? ' Univ.' : ' GEGP+');
        }

        function executeTransfer() {
            const src = document.getElementById('src-game').value;
            const dst = document.getElementById('dst-game').value;
            const amount = parseFloat(document.getElementById('trans-amount').value);

            if (!amount || amount <= 0) return;
            if (localSaves[src] < amount) return alert("Saldo insuficiente no jogo de origem!");

            // 1. Debitar Origem
            localSaves[src] -= amount;
            saveGameFile(src, localSaves[src]);

            // 2. Converter para Universal
            let universalValue = amount * MULTIPLIERS[src];

            // 3. Creditar Destino
            if (dst === 'VAULT') {
                const bonus = universalValue * 0.30;
                bankState.vault += (universalValue + bonus);
                addLog(`Depósito no Cofre: ${universalValue.toFixed(2)} + ${bonus.toFixed(2)} bônus`);
            } else {
                const convertedValue = universalValue / MULTIPLIERS[dst];
                localSaves[dst] += convertedValue;
                saveGameFile(dst, localSaves[dst]);
                addLog(`Câmbio: ${amount} de ${src} para ${convertedValue.toFixed(4)} de ${dst}`);
            }

            saveBank();
            sync();
            updatePreview();
        }

        function saveGameFile(game, val) {
            if (game === 'IDLE') {
                let d = JSON.parse(localStorage.getItem(KEYS.IDLE)) || {};
                d.gegp = val;
                localStorage.setItem(KEYS.IDLE, JSON.stringify(d));
            } else if (game === 'CARD') {
                localStorage.setItem(KEYS.CARD, val.toString());
            } else if (game === 'LDS2') {
                let d = JSON.parse(localStorage.getItem(KEYS.LDS2)) || {};
                d.gegp = val;
                localStorage.setItem(KEYS.LDS2, JSON.stringify(d));
            }
        }

        function takeLoan() {
            if (bankState.loan.active) return;
            const amount = parseFloat(document.getElementById('loan-amount').value);
            if (amount <= 0 || amount > 1000) return alert("Máximo 1000 Universais");

            const totalDue = amount * 1.36; // 36% Juros
            const now = getBrasiliaDate();
            
            bankState.loan = {
                active: true,
                amount: totalDue,
                installmentsLeft: 4,
                nextDue: now.getTime() + (7 * 24 * 60 * 60 * 1000) // 1 semana
            };

            // Credita no jogo Idle (convertido)
            const idleValue = amount / MULTIPLIERS.IDLE;
            localSaves.IDLE += idleValue;
            saveGameFile('IDLE', localSaves.IDLE);

            addLog(`Empréstimo: +${amount} Univ. creditados no Idle Ovelha`);
            saveBank();
            sync();
        }

        function checkAutomaticPayments() {
            if (!bankState.loan.active) return;
            const now = getBrasiliaDate().getTime();

            if (now >= bankState.loan.nextDue) {
                const installment = bankState.loan.amount / bankState.loan.installmentsLeft;
                const installmentInIdle = installment / MULTIPLIERS.IDLE;

                if (localSaves.IDLE >= installmentInIdle) {
                    localSaves.IDLE -= installmentInIdle;
                    saveGameFile('IDLE', localSaves.IDLE);
                    
                    bankState.loan.amount -= installment;
                    bankState.loan.installmentsLeft--;
                    
                    if (bankState.loan.installmentsLeft <= 0) {
                        bankState.loan.active = false;
                        addLog("Empréstimo quitado!");
                    } else {
                        bankState.loan.nextDue = now + (7 * 24 * 60 * 60 * 1000);
                        addLog(`Parcela de ${installment.toFixed(2)} Univ. paga automaticamente.`);
                    }
                    saveBank();
                    sync();
                }
            }
        }

        function withdrawFromVault() {
            if (bankState.vault <= 0) return;
            const amount = bankState.vault;
            const tax = amount * 0.10;
            const net = amount - tax;

            bankState.vault = 0;
            bankState.guarantee += tax;
            bankState.guaranteeRelease = getBrasiliaDate().getTime() + (30 * 24 * 60 * 60 * 1000);

            // Devolve para o LDS2 por padrão (1:1)
            localSaves.LDS2 += net;
            saveGameFile('LDS2', localSaves.LDS2);

            addLog(`Resgate: ${net.toFixed(2)} Univ. para LDS2. ${tax.toFixed(2)} retido.`);
            saveBank();
            sync();
        }

        function updateLoanUI() {
            const box = document.getElementById('loan-active-box');
            const input = document.getElementById('loan-input-box');
            if (bankState.loan.active) {
                box.classList.remove('hidden');
                input.classList.add('hidden');
                document.getElementById('loan-due-text').textContent = bankState.loan.amount.toFixed(2);
                document.getElementById('loan-timer-text').textContent = `Próximo débito: ${new Date(bankState.loan.nextDue).toLocaleDateString('pt-BR')}`;
            } else {
                box.classList.add('hidden');
                input.classList.remove('hidden');
            }
        }

        function addLog(msg) {
            const logs = document.getElementById('bank-logs');
            const d = new Date().toLocaleTimeString();
            const p = document.createElement('p');
            p.innerHTML = `<span class="text-slate-300">[${d}]</span> ${msg}`;
            logs.prepend(p);
            bankState.logs.unshift({t: d, m: msg});
            if(bankState.logs.length > 20) bankState.logs.pop();
        }

        function saveBank() { localStorage.setItem(KEYS.BANK, JSON.stringify(bankState)); }
        function loadBank() {
            const s = localStorage.getItem(KEYS.BANK);
            if(s) bankState = JSON.parse(s);
            sync();
        }

        loadBank();
        setInterval(sync, 3000);
        setInterval(updateClocks, 1000);