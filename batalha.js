// ==========================================
// MÓDULO DE BATALHA APRIMORADO - COM ORDEM E CRÍTICOS VISUAIS
// ==========================================

const tabelaVantagens = {
  fire: { water: 0.5, grass: 2.0, ice: 2.0, bug: 2.0, steel: 2.0, fire: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2.0, water: 0.5, grass: 0.5, ground: 2.0, rock: 2.0, dragon: 0.5 },
  grass: { water: 2.0, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, ground: 2.0, rock: 2.0, dragon: 0.5, steel: 0.5 },
  electric: { water: 2.0, electric: 0.5, grass: 0.5, ground: 0.0, flying: 2.0, dragon: 0.5 },
  psychic: { fighting: 2.0, poison: 2.0, psychic: 0.5, steel: 0.5, dark: 0.0 },
  ice: { fire: 0.5, water: 0.5, grass: 2.0, ice: 0.5, ground: 2.0, flying: 2.0, dragon: 2.0, steel: 0.5 },
  dragon: { dragon: 2.0, steel: 0.5, fairy: 0.0 },
  fighting: { normal: 2.0, ice: 2.0, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2.0, ghost: 0.0, dark: 2.0, steel: 2.0, fairy: 0.5 }
};

function calcularEfetividade(tipoAtacante, tipoDefensor) {
  if (!tabelaVantagens[tipoAtacante]) return 1.0;
  if (tabelaVantagens[tipoAtacante][tipoDefensor] !== undefined) {
    return tabelaVantagens[tipoAtacante][tipoDefensor];
  }
  return 1.0;
}

async function carregarStatusPokemon(id) {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const dados = await res.json();
    const tipos = dados.types.map(t => t.type.name);

    return {
      hp: dados.stats[0].base_stat * 2 + 50,
      maxHp: dados.stats[0].base_stat * 2 + 50,
      ataque: dados.stats[1].base_stat,
      defesa: dados.stats[2].base_stat,
      velocidade: dados.stats[5].base_stat,
      tipos: tipos
    };
  } catch (e) {
    return { 
      hp: 150, 
      maxHp: 150, 
      ataque: 80, 
      defesa: 70, 
      velocidade: 80, 
      tipos: ['normal'] 
    };
  }
}

// NOVA FUNÇÃO: Permite organizar a ordem antes de iniciar a batalha
async function iniciarBatalhaAutomatica(time1, time2, nome1, nome2) {
  const modal = document.getElementById('modal-batalha');
  const log = document.getElementById('log-batalha');
  if (modal) modal.style.display = 'flex';

  document.getElementById('batalha-nome-j1').innerText = nome1;
  document.getElementById('batalha-nome-j2').innerText = nome2;

  log.innerHTML = "<p>⚔️ Organizando equipes e carregando status na arena...</p>";

  // Carrega status para todos
  let lutadores1 = await Promise.all(time1.map(async p => ({ ...p, status: await carregarStatusPokemon(p.id) })));
  let lutadores2 = await Promise.all(time2.map(async p => ({ ...p, status: await carregarStatusPokemon(p.id) })));

  // DICA: Aqui podíamos ordenar por velocidade automaticamente ou deixar a ordem que vier do leilão.
  // Por padrão, vamos manter a ordem escolhida ou ordenar por velocidade se preferir estratégia pura.
  let i = 0, j = 0;

  while (i < lutadores1.length && j < lutadores2.length) {
    let p1 = lutadores1[i];
    let p2 = lutadores2[j];

    document.getElementById('batalha-img-pkm1').src = p1.imagem;
    document.getElementById('batalha-nome-pkm1').innerText = p1.nome;
    document.getElementById('batalha-img-pkm2').src = p2.imagem;
    document.getElementById('batalha-nome-pkm2').innerText = p2.nome;

    log.innerHTML += `<hr style="border: 0; border-top: 1px solid #444; margin: 8px 0;">`;
    log.innerHTML += `<p style="color: #ffcb05;"><strong>Entram na arena:</strong> ${p1.nome} (${p1.status.tipos.join('/')}) vs ${p2.nome} (${p2.status.tipos.join('/')})!</p>`;
    log.scrollTop = log.scrollHeight;

    while (p1.status.hp > 0 && p2.status.hp > 0) {
      await new Promise(r => setTimeout(r, 900));

      let primeiro = p1.status.velocidade >= p2.status.velocidade ? p1 : p2;
      let segundo = primeiro === p1 ? p2 : p1;
      let numeroAtacante = primeiro === p1 ? 1 : 2;

      // Turno do primeiro
      executarAtaqueTurno(primeiro, segundo, numeroAtacante === 1 ? 2 : 1, log);
      atualizarBarrasHP(p1, p2);

      if (segundo.status.hp <= 0) break;

      await new Promise(r => setTimeout(r, 600));

      // Contra-ataque
      let numeroContra = numeroAtacante === 1 ? 1 : 2;
      executarAtaqueTurno(segundo, primeiro, numeroContra, log);
      atualizarBarrasHP(p1, p2);

      if (primeiro.status.hp <= 0) break;
    }

    if (p1.status.hp <= 0) {
      log.innerHTML += `<p style="color: #ff4d4d;">☠️ O ${p1.nome} de ${nome1} desmaiou!</p>`;
      i++;
    }
    if (p2.status.hp <= 0) {
      log.innerHTML += `<p style="color: #ff4d4d;">☠️ O ${p2.nome} de ${nome2} desmaiou!</p>`;
      j++;
    }
    log.scrollTop = log.scrollHeight;
  }

  const vencedor = i < lutadores1.length ? nome1 : nome2;
  log.innerHTML += `<hr style="border: 0; border-top: 2px solid #ffcb05; margin: 10px 0;">`;
  log.innerHTML += `<h3 style="color: #4caf50; font-size: 18px; text-align: center;">🏆 FIM DE JOGO! ${vencedor} VENCEU A BATALHA!</h3>`;
  log.scrollTop = log.scrollHeight;

  const btnFechar = document.getElementById('btn-fechar-batalha');
  if (btnFechar) btnFechar.style.display = 'inline-block';
}

function executarAtaqueTurno(atacante, defensor, numeroDefensor, logElemento) {
  let danoBase = Math.max(12, Math.floor(atacante.status.ataque * 0.55 - defensor.status.defesa * 0.2));

  let multiplicadorTipo = 1.0;
  if (atacante.status.tipos && atacante.status.tipos.length > 0 && defensor.status.tipos) {
    let melhorEfetividade = 1.0;
    for (let tAtk of atacante.status.tipos) {
      for (let tDef of defensor.status.tipos) {
        let ef = calcularEfetividade(tAtk, tDef);
        if (ef > melhorEfetividade) melhorEfetividade = ef;
        else if (ef === 0.0) melhorEfetividade = 0.0;
      }
    }
    multiplicadorTipo = melhorEfetividade;
  }

  // 12% de chance de Acerto Crítico
  let ehCritico = Math.random() < 0.12;
  let multiplicadorCritico = ehCritico ? 1.5 : 1.0;

  let danoFinal = Math.floor(danoBase * multiplicadorTipo * multiplicadorCritico);
  if (danoFinal < 1) danoFinal = 1;

  defensor.status.hp -= danoFinal;

  // EFEITO VISUAL DE TREMER SE FOR CRÍTICO
  if (ehCritico) {
    const imagemDefensor = document.getElementById(`batalha-img-pkm${numeroDefensor}`);
    if (imagemDefensor) {
      imagemDefensor.classList.add('efeito-tremer');
      setTimeout(() => {
        imagemDefensor.classList.remove('efeito-tremer');
      }, 400);
    }
  }

  let textoExtra = "";
  if (multiplicadorTipo > 1.0) {
    textoExtra = " <span style='color: #4caf50;'>(Foi Super Efetivo!)</span>";
  } else if (multiplicadorTipo === 0.0) {
    textoExtra = " <span style='color: gray;'>(Não teve efeito...)</span>";
    danoFinal = 0;
  } else if (multiplicadorTipo < 1.0) {
    textoExtra = " <span style='color: #ff9800;'>(Não foi muito efetivo...)</span>";
  }

  if (ehCritico && multiplicadorTipo > 0.0) {
    textoExtra += " <strong style='color: #ff5722;'>🔥 ACERTO CRÍTICO!</strong>";
  }

  logElemento.innerHTML += `<p>💥 <strong>${atacante.nome}</strong> atacou ${defensor.nome} causando ${danoFinal} de dano!${textoExtra}</p>`;
}

function atualizarBarrasHP(p1, p2) {
  const bar1 = document.getElementById('hp-bar-1');
  const bar2 = document.getElementById('hp-bar-2');

  if (bar1) {
    let pct1 = Math.max(0, (p1.status.hp / p1.status.maxHp) * 100);
    bar1.style.width = `${pct1}%`;
  }
  if (bar2) {
    let pct2 = Math.max(0, (p2.status.hp / p2.status.maxHp) * 100);
    bar2.style.width = `${pct2}%`;
  }
}

function fecharModalBatalha() {
  const modal = document.getElementById('modal-batalha');
  if (modal) modal.style.display = 'none';
  window.location.href = "index.html";
}