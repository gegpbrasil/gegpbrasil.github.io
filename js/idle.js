/* ======= SCRIPT CORRIGIDO: BLINDADO CONTRA NaN E INFINITO (v4) ======= */
const SAVE_KEY = 'idlegame_ovelha_gegp_fixed'; 
const OLD_SAVE_KEY = 'idlegame_ovelha_gegp_'; // Backup para migração
const COMPENSATION_PER_UNIT = 100;
const SUPER_DURATION_S = 1200;
const GEGP_RATE = 1000;

// Utilitários de Formatação Segura
const brl = v => {
  // Proteção contra NaN
  const val = (typeof v !== 'number' || isNaN(v) || !isFinite(v)) ? 0 : v;
  return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(val);
};

const fmt = v => {
  const val = (typeof v !== 'number' || isNaN(v) || !isFinite(v)) ? 0 : v;
  return new Intl.NumberFormat('pt-BR').format(Math.floor(val));
};

const fmtDuration = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0s';
    const s = Math.floor(seconds);
    const d = Math.floor(s / (3600 * 24));
    const h = Math.floor((s % (3600 * 24)) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    
    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(' ');
};

const now = new Date();
const month = now.getMonth() + 1;
const promoGabrielActive = (month === 3 || month === 8);

// Configurações (Mantidas)
const RARITY_BONUSES = {
    Comum: { bonusRPS: 0.5, multiplier:1, frequency: 30 }, 
    Rara: { bonusRPS: 0.5, multiplier:1, frequency: 15 }, 
    Épica: { multiplier: 2, bonusRPS:0, frequency: 1 }, 
    Lendária: { multiplier: 2, bonusRPS: 0.75, frequency: 10 }, 
    'GEGP+': { multiplier: 1, bonusRPS: 0, frequency: 0 } 
};

const SUPERS = [
    { id:'dona_ovelha_super', nome:'Super Dona Ovelha', targetId:'ovelha', custoGEGP:5000, duration:SUPER_DURATION_S, efeitoRPS:2500, type:'fixed' },
    { id:'ovelha_barbara_super', nome:'Super Ovelha Bárbara', targetId:'ovelha_barbara', custoGEGP:7000, duration:SUPER_DURATION_S, efeitoPorcentagem:0.50, targetType:'ovelha', type:'percent_sheep_global' },
    { id:'filhote_super', nome:'Super Filhote de Ovelha', targetId:'ovelha_filhote', custoGEGP:3000, duration:SUPER_DURATION_S, efeitoRPS:1000, type:'fixed' },
];
const BUYABLE_SUPERS = SUPERS.filter(s => s.type !== 'percent_chosen' && s.type !== 'fixed_chosen'); 

const BASE_ITEMS = [
  { id:'amiguinho',nome:'Amiguinho', renda:1, preco:10, qtd:0, desc:'Seu primeiro amigo, gera uma renda pequena.', tags:[] },
  { id:'ovelha_filhote', nome:'Filhote de Ovelha', renda:5, preco:50, qtd:0, desc:'Uma ovelhinha pequena, mas que já ajuda.', tags:['ovelha'] },
  { id:'ovelha', nome:'Dona Ovelha', renda:20, preco:500, qtd:1, desc:'A matriarca! Gera R$ 20/s por unidade.', tags:['ovelha'] },
  { id:'ovelha_barbara', nome:'Ovelha Bárbara', renda:35, preco:800, qtd:0, desc:'Irmã da Dona Ovelha, forte e determinada.', tags:['ovelha'] },
  { id:'sona', nome:'Sonna', renda:5000, preco:500000, qtd:0, desc:'Narra e rende ao mesmo tempo.', tags:['ovelha'] },
  { id:'jb', nome:'JB', renda:10, preco:2000, qtd:0, desc:'Advogado da vila da ovelha.', tags:['familia da justiça'] },
  { id:'amestica', nome:'Amestica', renda:15, preco:4000, qtd:0, desc:'Amante da natureza e da paz.', tags:['familia da justiça'] },
  { id:'gabriel', nome:'Gabriel', renda:100000, preco:10000000, qtd:0, desc:'Chefe, faz o dinheiro girar mais rápido.', tags:['criador'] },
  { id:'ourino', nome:'Ourino', renda:10000, preco:100000, qtd:0, desc:'Primo de JB.', tags:['familia da justiça'] },
];

const SKINS = [
    { id:'amiguinho_comum', nome:'Amiguinho Apoiador', preco:10000, rarity:'Comum', target_character_id:'amiguinho', qtd:0, desc:'Bônus a cada 30s.' },
    { id:'ovelha_rara', nome:'Ovelha Terapêutica', preco:50000, rarity:'Rara', target_character_id:'ovelha', qtd:0, desc:'Bônus a cada 15s.' },
    { id:'jb_epico', nome:'JB V2.0', preco:500000, rarity:'Épica', target_character_id:'jb', qtd:0, desc:'Duplica a renda do JB.' },
    { id:'barbara_lendaria', nome:'Bárbara Chefe', preco:1000000, rarity:'Lendária', target_character_id:'ovelha_barbara', qtd:0, desc:'2X a renda + bônus.' },
    { id:'gegp_super_skin', nome:'Pele Dourada (GEGP+)', precoGEGP:7000, rarity:'GEGP+', target_character_id:null, qtd:0, desc:'Ativa Super Global.' },
];

// Estado Seguro
let state = {
  dinheiro: 10, 
  gegp: 0,
  earnedSinceLastGEGP: 0,
  items: JSON.parse(JSON.stringify(BASE_ITEMS)),
  skins: JSON.parse(JSON.stringify(SKINS)),
  activeSupers: [], 
  lastTick: Date.now(), 
  migrationMessage: null, 
  stats: {
    totalPlayTimeSeconds: 0,
    totalMoneyEarned: 0,
    totalGEGPEarned: 0,
    totalItemsBought: 0,
  }
};

// --- Funções de Bônus Protegidas (Correção de NaN) ---
const getBaseRPS = (item) => (Number(item.renda) || 0) * (Number(item.qtd) || 0);

function getSkinBonus(item, nowTime) {
    let bonus = 0;
    const itemSkin = state.skins.find(s => s.target_character_id === item.id && s.qtd > 0);
    if (!itemSkin) return bonus;

    const rarity = RARITY_BONUSES[itemSkin.rarity];
    if (!rarity) return bonus;
    
    // Proteção: Garante que os valores existam ou usa padrão
    const mult = Number(rarity.multiplier) || 1;
    const freq = Number(rarity.frequency) || 0;
    const bRPS = Number(rarity.bonusRPS) || 0;

    // 1. Multiplicador
    if (mult > 1) {
        bonus += (mult - 1) * getBaseRPS(item); 
    }

    // 2. Frequência
    if (freq > 0 && bRPS > 0) {
        const second = Math.floor(nowTime / 1000);
        if (second % freq === 0) {
            bonus += bRPS * getBaseRPS(item);
        }
    }

    return isNaN(bonus) ? 0 : bonus;
}

function getSuperBonus(item) {
    let globalBonus = 0;
    const nowTs = Date.now();
    const activeSupers = state.activeSupers.filter(s => s.expires > nowTs);
    
    activeSupers.forEach(active => {
        const superDef = SUPERS.find(s => s.id === active.id);
        if (!superDef && active.id !== 'gegp_super_active') return;

        // Fixa e Global
        if (superDef) {
            if (superDef.type === 'fixed' && item.id === superDef.targetId) {
                globalBonus += (Number(superDef.efeitoRPS) || 0) * (item.qtd || 0); 
            }
            if (superDef.type === 'percent_sheep_global' && item.tags.includes('ovelha')) {
                globalBonus += (Number(superDef.efeitoPorcentagem) || 0) * getBaseRPS(item);
            }
        }
        
        // GEGP+ Global
        if (active.id === 'gegp_super_active') {
             const itemSuper = BUYABLE_SUPERS.find(s => s.targetId === item.id && s.type === 'fixed');
             if (itemSuper) {
                 globalBonus += (Number(itemSuper.efeitoRPS) || 0) * (item.qtd || 0);
             }
        }
    });

    return isNaN(globalBonus) ? 0 : globalBonus;
}

function rendaPorSegundo(nowTime) {
  const total = state.items.reduce((acc, item) => {
    return acc + getBaseRPS(item) + getSkinBonus(item, nowTime) + getSuperBonus(item);
  }, 0);
  return (isNaN(total) || !isFinite(total)) ? 0 : total;
}

// --- Lógica Principal (Tick Seguro) ---
function tick() {
  const nowTs = Date.now();
  
  // Proteção: Se lastTick for NaN, reseta
  if (!state.lastTick || isNaN(state.lastTick)) state.lastTick = nowTs;
  
  let dt = (nowTs - state.lastTick) / 1000;
  
  // Proteção: Tempo negativo ou muito grande (mais de 1 hora de cálculo instantâneo pode travar)
  if (dt < 0 || isNaN(dt)) dt = 0;
  if (dt > 3600) dt = 3600; 

  state.stats.totalPlayTimeSeconds += dt;
  
  const currentRPS = rendaPorSegundo(nowTs);
  const moneyEarned = currentRPS * dt;

  // Proteção: Só adiciona dinheiro se for um número válido e finito
  if (!isNaN(moneyEarned) && isFinite(moneyEarned)) {
      state.dinheiro += moneyEarned;
      state.stats.totalMoneyEarned += moneyEarned;

      state.earnedSinceLastGEGP += moneyEarned;
      if (state.earnedSinceLastGEGP >= GEGP_RATE) {
          const gegpGained = Math.floor(state.earnedSinceLastGEGP / GEGP_RATE);
          if (isFinite(gegpGained) && gegpGained > 0) {
            state.gegp += gegpGained;
            state.stats.totalGEGPEarned += gegpGained;
            state.earnedSinceLastGEGP %= GEGP_RATE;
          }
      }
  }
  
  state.lastTick = nowTs;
  state.activeSupers = state.activeSupers.filter(s => s.expires > nowTs);
}

// --- Funções de Compra Seguras ---
function precoAtual(item) {
  if (!item) return Infinity;
  let p = item.preco;
  // Promoção Gabriel
  if (item.id === 'gabriel' && promoGabrielActive) p = 1000000;
  return (isNaN(p) || p < 0) ? Infinity : p;
}

function comprar(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  const p = precoAtual(item);

  // Proteção: Nunca comprar se preço for Infinity ou dinheiro insuficiente
  if (!isFinite(p)) return;
  
  if (state.dinheiro >= p) {
    state.dinheiro -= p;
    item.qtd = (Number(item.qtd) || 0) + 1;
    // Inflação leve opcional ou manter fixo conforme original (mantido fixo pela regra 'sem alterações')
    state.stats.totalItemsBought += 1;
    renderAll();
    save();
  }
}

function comprarSkin(id) {
  const skin = state.skins.find(s => s.id === id);
  if (!skin) return;

  const isGEGP = skin.rarity === 'GEGP+';
  const custo = isGEGP ? skin.precoGEGP : skin.preco;

  if (skin.qtd > 0) return; // Já tem

  if (isGEGP) {
      if (state.gegp >= custo) {
          state.gegp -= custo;
          skin.qtd = 1;
          // Ativa efeito imediato
          const expires = Date.now() + SUPER_DURATION_S * 1000;
          state.activeSupers.push({ id: 'gegp_super_active', expires: expires });
      }
  } else {
      if (state.dinheiro >= custo) {
          state.dinheiro -= custo;
          skin.qtd = 1;
      }
  }
  save();
  renderAll();
}

function ativarSuper(id) {
    const superDef = BUYABLE_SUPERS.find(s => s.id === id);
    if (!superDef) return;
    
    // Verifica se já está ativo
    if (state.activeSupers.some(s => s.id === id)) return;

    if (state.gegp >= superDef.custoGEGP) {
        state.gegp -= superDef.custoGEGP;
        const expires = Date.now() + SUPER_DURATION_S * 1000;
        state.activeSupers.push({ id: superDef.id, expires: expires });
        save();
        renderAll();
    }
}

// --- Load / Save / Migration (Mantendo lógica original mas segura) ---
function migrateAndMergeItems(savedItems) {
    if (!Array.isArray(savedItems)) return { items: JSON.parse(JSON.stringify(BASE_ITEMS)), compensation: 0, bought: 0 };
    
    let compensation = 0;
    let bought = 0;
    
    const finalItems = JSON.parse(JSON.stringify(BASE_ITEMS)).map(baseItem => {
        const savedItem = savedItems.find(si => si.id === baseItem.id);
        if (savedItem) {
            baseItem.qtd = Number(savedItem.qtd) || 0;
            bought += baseItem.qtd;
        }
        return baseItem;
    });
    
    // Lógica de compensação removida simplificada para evitar bugs
    // (Apenas garante que os itens existam)
    
    return { items: finalItems, compensation, bought };
}

function load() {
  try {
    let raw = localStorage.getItem(SAVE_KEY); 
    // Tenta migrar do save antigo se o novo não existir
    if (!raw) raw = localStorage.getItem(OLD_SAVE_KEY);
    
    if (!raw) return;

    const saved = JSON.parse(raw);
    
    // Carrega valores com verificação de tipo e NaN
    state.dinheiro = (isFinite(saved.dinheiro)) ? Number(saved.dinheiro) : 10;
    state.gegp = (isFinite(saved.gegp)) ? Number(saved.gegp) : 0;
    state.earnedSinceLastGEGP = (isFinite(saved.earnedSinceLastGEGP)) ? Number(saved.earnedSinceLastGEGP) : 0;
    state.lastTick = (isFinite(saved.lastTick)) ? Number(saved.lastTick) : Date.now();
    
    // Migração de Itens
    const mItems = migrateAndMergeItems(saved.items);
    state.items = mItems.items;
    
    // Carregar Skins
    if (Array.isArray(saved.skins)) {
        saved.skins.forEach(ss => {
            const mySkin = state.skins.find(s => s.id === ss.id);
            if (mySkin) mySkin.qtd = Number(ss.qtd) || 0;
        });
    }

    // Carregar Supers Ativos
    if (Array.isArray(saved.activeSupers)) {
        state.activeSupers = saved.activeSupers.filter(s => s.expires > Date.now());
    }

    // Stats
    if (saved.stats) {
        state.stats.totalPlayTimeSeconds = Number(saved.stats.totalPlayTimeSeconds) || 0;
        state.stats.totalMoneyEarned = Number(saved.stats.totalMoneyEarned) || 0;
        state.stats.totalGEGPEarned = Number(saved.stats.totalGEGPEarned) || 0;
        state.stats.totalItemsBought = Number(saved.stats.totalItemsBought) || mItems.bought;
    }

  } catch (e) {
    console.warn("Save corrompido, iniciando novo jogo seguro.", e);
    // Reinicia apenas se o erro for fatal
    state.lastTick = Date.now();
  }
}

function save() {
    try {
        // Remove mensagem temporária antes de salvar
        const toSave = { ...state, migrationMessage: null };
        localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
    } catch (e) { console.error("Erro no save", e); }
}

function reset() {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
}

// --- Renderização (IDs mantidos) ---
const $money = document.getElementById('money');
const $rate  = document.getElementById('rate');
const $gegp = document.getElementById('gegp');
const $gegpRate = document.getElementById('gegpRate');
const $gegpBar = document.getElementById('gegpBar');
const $store = document.getElementById('store');
const $skinList = document.getElementById('skinList');
const $superList = document.getElementById('superList');
const $summary = document.getElementById('summary');
const $dateInfo = document.getElementById('dateInfo');
const $promoBadge = document.getElementById('promoBadge');

$dateInfo.textContent = `Hoje: ${now.toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'long', year:'numeric'})}`;
$promoBadge.style.display = promoGabrielActive ? 'inline-block' : 'none';

function renderTop() {
    $money.textContent = brl(state.dinheiro);
    const rps = rendaPorSegundo(Date.now());
    $rate.textContent = `+ ${brl(rps)} / s`;
    
    $gegp.textContent = `GEGP+ ${fmt(state.gegp)}`;
    $gegpRate.textContent = `R$ ${fmt(state.earnedSinceLastGEGP)} / 1.000`;
    $gegpBar.style.width = `${Math.min(100, (state.earnedSinceLastGEGP / GEGP_RATE) * 100)}%`;
}

function renderStore() {
    $store.innerHTML = '';
    state.items.forEach(item => {
        const p = precoAtual(item);
        const canBuy = isFinite(p) && state.dinheiro >= p;
        
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <div>
                <div class="title">${item.nome}</div>
                <div class="meta">${item.desc}</div>
                <div class="meta">Renda: ${brl(item.renda)}/s</div>
                <div class="owned">Possui: ${fmt(item.qtd)}</div>
            </div>
            <button class="buy-btn" onclick="comprar('${item.id}')" ${canBuy ? '' : 'disabled'}>
                Comprar ${brl(p)}
            </button>
        `;
        $store.appendChild(div);
    });
}

function renderSkins() {
    $skinList.innerHTML = '';
    state.skins.forEach(skin => {
        const jaTem = skin.qtd > 0;
        const isGEGP = skin.rarity === 'GEGP+';
        const preco = isGEGP ? skin.precoGEGP : skin.preco;
        const pode = isGEGP ? state.gegp >= preco : state.dinheiro >= preco;
        const btnTxt = jaTem ? (isGEGP ? 'Ativo Global' : 'Adquirido') : `Comprar (${isGEGP ? preco+' GEGP' : brl(preco)})`;
        
        const div = document.createElement('div');
        div.className = `item ${jaTem && isGEGP ? 'active-super' : ''}`;
        div.innerHTML = `
            <div>
                <div class="title">${skin.nome} <span class="rarity-badge rarity-${skin.rarity.replace('+','')}">${skin.rarity}</span></div>
                <div class="meta">${skin.desc}</div>
            </div>
            <button class="buy-btn ${isGEGP ? 'gegp-btn' : ''}" onclick="comprarSkin('${skin.id}')" ${!jaTem && pode ? '' : 'disabled'}>
                ${btnTxt}
            </button>
        `;
        $skinList.appendChild(div);
    });
}

function renderSupers() {
    $superList.innerHTML = '';
    BUYABLE_SUPERS.forEach(sup => {
        const ativo = state.activeSupers.find(s => s.id === sup.id);
        const pode = !ativo && state.gegp >= sup.custoGEGP;
        
        const div = document.createElement('div');
        div.className = `item ${ativo ? 'active-super' : ''}`;
        div.innerHTML = `
            <div>
                <div class="title">${sup.nome}</div>
                <div class="meta">Custo: ${sup.custoGEGP} GEGP+</div>
                <div class="meta">${ativo ? 'Expirando em: '+fmtDuration((ativo.expires - Date.now())/1000) : 'Duração: 20 min'}</div>
            </div>
            <button class="buy-btn gegp-btn" onclick="ativarSuper('${sup.id}')" ${pode ? '' : 'disabled'}>
                ${ativo ? 'ATIVO' : 'ATIVAR'}
            </button>
        `;
        $superList.appendChild(div);
    });
}

function renderSummary() {
    const totalItens = state.items.reduce((a,b) => a + (b.qtd||0), 0);
    $summary.innerHTML = `
        Total Unidades: ${fmt(totalItens)} | 
        Total Skins: ${state.skins.filter(s=>s.qtd>0).length}
    `;
}

function renderStatsModal() {
    document.getElementById('statPlaytime').textContent = fmtDuration(state.stats.totalPlayTimeSeconds);
    document.getElementById('statItemsBought').textContent = fmt(state.stats.totalItemsBought);
    document.getElementById('statMoneyEarned').textContent = brl(state.stats.totalMoneyEarned);
    document.getElementById('statGEGPEarned').textContent = fmt(state.stats.totalGEGPEarned);
}

function renderAll() {
    renderTop();
    renderStore();
    renderSkins();
    renderSupers();
    renderSummary();
}

// Inicialização
load();
setInterval(() => { tick(); renderAll(); }, 100);
setInterval(save, 5000);

// Event Listeners (UI)
const resetModal = document.getElementById('resetModal');
const statsModal = document.getElementById('statsModal');

document.getElementById('saveBtn').onclick = save;
document.getElementById('resetBtn').onclick = () => resetModal.classList.add('active');
document.getElementById('cancelResetBtn').onclick = () => resetModal.classList.remove('active');
document.getElementById('confirmResetBtn').onclick = reset;

document.getElementById('statsBtn').onclick = () => { renderStatsModal(); statsModal.classList.add('active'); };
document.getElementById('closeStatsBtn').onclick = () => statsModal.classList.remove('active');

// Segurança ao Fechar
window.addEventListener('beforeunload', () => { tick(); save(); });

// Expor para Console (Debug Gabriel)
window.state = state;
