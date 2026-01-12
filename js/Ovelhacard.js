    // Configurações (5 Horas)
    const COOLDOWN_TIME = 5 * 60 * 60 * 1000; 
    const REWARD_VAL = 2;

    // Elementos da UI
    const btn = document.getElementById('openBtn');
    const timerText = document.getElementById('timerText');
    const display = document.getElementById('cardDisplay');
    const statusMsg = document.getElementById('statusMsg');
    const balanceText = document.getElementById('balanceDisplay');
    const sessionText = document.getElementById('sessionDisplay');

    /**
     * COLEÇÃO ATUALIZADA
     * Mascarede = Vilão | Demais = Heróis
     */
    const CARDS = [
        { name: "Dona Ovelha", side: "hero", url: "https://www.mediafire.com/view/2dw5qmau60l24tz/DonaOvelha.png/file" },
        { name: "JB", side: "hero", url: "https://www.mediafire.com/view/g44sdsh2n1ikis0/Jb.png/file" },
        { name: "Mascarede", side: "villain", url: "https://www.mediafire.com/view/twzbei5sqxzilka/Mascarede.png/file" },
        { name: "Mega Gabriel", side: "hero", url: "https://www.mediafire.com/view/nh7bknyd5b9tt35/MegaGabriel.png/file" },
        { name: "Sonna", side: "hero", url: "https://www.mediafire.com/view/566i0z23dxrmdlo/Sonna.png/file" }
    ];

    // --- Persistência de Saldo ---
    function syncData() {
        const bal = localStorage.getItem('gegp_v3_bal') || 0;
        balanceText.textContent = `GEGP+ : ${bal}`;
    }

    function addReward() {
        let bal = parseInt(localStorage.getItem('gegp_v3_bal')) || 0;
        localStorage.setItem('gegp_v3_bal', bal + REWARD_VAL);
        syncData();
    }

    // --- Lógica do Cronômetro Persistente ---
    function getRemainingTime() {
        const lastTime = localStorage.getItem('gegp_v3_last_open');
        if (!lastTime) return 0;
        
        const now = Date.now();
        const elapsed = now - parseInt(lastTime);
        const remaining = COOLDOWN_TIME - elapsed;
        return remaining > 0 ? remaining : 0;
    }

    function runTimer() {
        const remaining = getRemainingTime();
        
        if (remaining > 0) {
            btn.disabled = true;
            
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            
            timerText.textContent = 
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            requestAnimationFrame(runTimer);
        } else {
            btn.disabled = false;
            timerText.textContent = "";
        }
    }

    // --- Ação de Invocação ---
    btn.onclick = () => {
        if (getRemainingTime() > 0) return;

        // Salva o tempo atual imediatamente
        localStorage.setItem('gegp_v3_last_open', Date.now().toString());
        
        // Processa Recompensa e Sorteio
        addReward();
        const card = CARDS[Math.floor(Math.random() * CARDS.length)];
        
        // Efeito Visual de acordo com o lado (Azul para Herói, Vermelho para Vilão)
        display.className = "display-area " + (card.side === 'hero' ? 'hero-mode' : 'villain-mode');
        statusMsg.innerHTML = `<span style="color:var(--gegp-yellow)">INVOCANDO:</span><br><strong style="font-size: 1.2rem;">${card.name}</strong>`;
        
        runTimer();

        // Redireciona após o efeito
        setTimeout(() => {
            window.location.href = card.url;
        }, 2500);
    };

    // --- Tempo de Sessão ---
    let sessionSec = 0;
    setInterval(() => {
        sessionSec++;
        const h = Math.floor(sessionSec / 3600);
        const m = Math.floor((sessionSec % 3600) / 60);
        const s = sessionSec % 60;
        sessionText.textContent = `Sessão: ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);

    // --- Inicialização ---
    syncData();
    runTimer()
