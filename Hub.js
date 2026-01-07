// nexus-core.js - O Leitor e Editor Global
const NEXUS_KEYS = {
    IDLE: 'idlegame_ovelha_gegp_fixed',
    CARD: 'gegp_v3_bal',
    LDS2: 'lab_suzana_mob_v1',
    BANK: 'gegp_bank_v2_system',
    PASSE: 'passe_gegp_v3_master',
    LOCK: 'gegp_global_lock'
};

const NEXUS_CORE = {
    // Lê o save de qualquer jogo e devolve um objeto formatado
    readSave(game) {
        const raw = localStorage.getItem(NEXUS_KEYS[game]);
        if (game === 'CARD') return Number(raw) || 0;
        try {
            return raw ? JSON.parse(raw) : { gegp: 0, items: [], score: 0 };
        } catch (e) {
            return { gegp: 0 };
        }
    },

    // Edita o save de forma segura
    writeSave(game, newData) {
        if (localStorage.getItem(NEXUS_KEYS.LOCK) === 'true') {
            console.warn("Nexus Core: Operação bloqueada pelo Controle Familiar.");
            return false;
        }

        if (game === 'CARD') {
            localStorage.setItem(NEXUS_KEYS[game], newData.toString());
        } else {
            localStorage.setItem(NEXUS_KEYS[game], JSON.stringify(newData));
        }
        
        // Notifica todos os módulos que os dados mudaram
        window.dispatchEvent(new Event('storage'));
        return true;
    },

    // Atalho para adicionar valor (ex: recompensas do passe ou banco)
    addFunds(game, amount) {
        let data = this.readSave(game);
        if (game === 'CARD') {
            this.writeSave(game, data + amount);
        } else {
            data.gegp = (Number(data.gegp) || 0) + amount;
            this.writeSave(game, data);
        }
    }
};
