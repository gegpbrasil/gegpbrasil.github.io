// HUB.js - Gerente Central de Saves do GEGP
// Responsável por:
// 1. Consultar e fornecer saves para os jogos
// 2. Aplicar alterações nos saves
// 3. Bloquear todos os jogos se necessário

const KEYS = {
  IDLE: 'idlegame_ovelha_gegp_',
  CARD: 'gegpPlusBalance',
  LAB: 'lab_suzana_v4',
  PARENT_COOLDOWN: 'parent_bonus_v6_time',
  GAME_LOCKED: 'gegp_global_lock'
};

const HUB = {
  // --- CONSULTA DE SAVE ---
  getSave(gameKey) {
    try {
      return JSON.parse(localStorage.getItem(gameKey) || '{}');
    } catch(e) {
      console.error('Erro ao ler save:', gameKey, e);
      return {};
    }
  },

  // --- ALTERAÇÃO DE SAVE ---
  setSave(gameKey, data) {
    try {
      localStorage.setItem(gameKey, JSON.stringify(data));
    } catch(e) {
      console.error('Erro ao salvar save:', gameKey, e);
    }
  },

  // --- ATUALIZAÇÃO DE SAVE EXISTENTE ---
  updateSave(gameKey, newData) {
    const current = this.getSave(gameKey);
    const updated = { ...current, ...newData };
    this.setSave(gameKey, updated);
  },

  // --- BLOQUEIO GLOBAL ---
  lockAllGames() {
    localStorage.setItem(KEYS.GAME_LOCKED, 'true');
  },

  unlockAllGames() {
    localStorage.setItem(KEYS.GAME_LOCKED, 'false');
  },

  isLocked() {
    return localStorage.getItem(KEYS.GAME_LOCKED) === 'true';
  },

  // --- MÉTODO CENTRAL PARA JOGOS PEDIREM DADOS ---
  requestData(gameKey, callback) {
    // Só fornece o save se não estiver bloqueado globalmente
    if (this.isLocked()) {
      callback(null, 'Jogo bloqueado globalmente');
      return;
    }
    const save = this.getSave(gameKey);
    callback(save);
  }
};

// ========================
// EXEMPLOS DE USO
// ========================

// Jogo X pede o save do Idle Game
HUB.requestData(KEYS.IDLE, (save, err) => {
  if (err) {
    console.log(err); // Bloqueio ativo
  } else {
    console.log('Dados do Idle:', save);
  }
});

// Aplicando alteração no Card Game
HUB.updateSave(KEYS.CARD, { coins: 500 });

// Bloqueando todos os jogos
HUB.lockAllGames();
console.log('Jogos bloqueados?', HUB.isLocked());
