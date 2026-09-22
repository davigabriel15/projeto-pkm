// ==========================================
// MÓDULO DE BATALHA SINCRONIZADO E DETERMINÍSTICO
// ==========================================

const tabelaVantagens = {
  normal: { ghost: 0.0, rock: 0.5, steel: 0.5 },
  fire: { water: 0.5, grass: 2.0, ice: 2.0, bug: 2.0, steel: 2.0, fire: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2.0, water: 0.5, grass: 0.5, ground: 2.0, rock: 2.0, dragon: 0.5 },
  grass: { water: 2.0, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, ground: 2.0, rock: 2.0, dragon: 0.5, steel: 0.5 },
  electric: { water: 2.0, electric: 0.5, grass: 0.5, ground: 0.0, flying: 2.0, dragon: 0.5 },
  psychic: { fighting: 2.0, poison: 2.0, psychic: 0.5, steel: 0.5, dark: 0.0 },
  ice: { fire: 0.5, water: 0.5, grass: 2.0, ice: 0.5, ground: 2.0, flying: 2.0, dragon: 2.0, steel: 0.5 },
  dragon: { dragon: 2.0, steel: 0.5, fairy: 0.0 },
  ghost: { normal: 0.0, psychic: 2.0, ghost: 2.0, dark: 0.5 },
  fighting: { normal: 2.0, ice: 2.0, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2.0, ghost: 0.0, dark: 2.0, steel: 2.0, fairy: 0.5 }
};

function calcularEfetividade(tipoAtacante, tipoDefensor) {
  if (!tabelaVantagens[tipoAtacante]) return 1.0;
  if (tabelaVantagens[tipoAtacante][tipoDefensor] !== undefined) {
    return tabelaVantagens[tipoAtacante][tipoDefensor];
  }
  return 1.0;
}

// IDs oficiais expandidos de Pokémon que possuem Mega Evolução na PokéAPI
function podeUsarMegaStone(pokemonId) {
  // Inclui Bulbasaur até Mewtwo + Pidgeot (18), Pinsir (127), Gyarados (130), Aerodactyl (142), etc.
  const idsComMega = [
    3, 6, 9, 15, 18, 65, 80, 94, 115, 127, 130, 142, 150, 
    181, 208, 212, 214, 229, 248, 257, 282, 306, 310, 319, 
    323, 334, 354, 359, 362, 376, 380, 381, 382, 383, 384, 448, 460
  ];
  return idsComMega.includes(Number(pokemonId));
}

async function carregarStatusPokemon(pkmOriginal) {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pkmOriginal.id}`);
    const dados = await res.json();
    let tipos = dados.types.map(t => t.type.name);

    let hpCalculado = dados.stats[0].base_stat * 2 + 50;
    let ataqueCalculado = dados.stats[1].base_stat;
    let defesaCalculada = dados.stats[2].base_stat;
    let velocidadeCalculada = dados.stats[5].base_stat;
    let imagemFinal = pkmOriginal.imagem;
    let nomeFinal = pkmOriginal.nome;
    let isMega = false;

    // Se o jogador equipou a Mega Stone, testamos se o Pokémon realmente tem Mega na API
    if (pkmOriginal.itemEquipado === 'Mega Stone') {
      try {
        // Tenta buscar o nome oficial da mega na PokéAPI (ex: bulbasaur-mega, pidgeot-mega, chesnaught-mega)
        const nomeApi = dados.name.toLowerCase();
        const resMega = await fetch(`https://pokeapi.co/api/v2/pokemon/${nomeApi}-mega`);
        
        if (resMega.ok) {
          const dadosMega = await resMega.json();
          imagemFinal = dadosMega.sprites.other['official-artwork'].front_default || imagemFinal;
          tipos = dadosMega.types.map(t => t.type.name);
          
          ataqueCalculado = dadosMega.stats[1].base_stat;
          defesaCalculada = dadosMega.stats[2].base_stat;
          velocidadeCalculada = dadosMega.stats[5].base_stat;
          
          nomeFinal = `MEGA ${pkmOriginal.nome}`;
          isMega = true;
        } else {
          // Se o Pokémon NÃO tem Mega oficial na API, o item é ignorado e ele não ganha status falsos/apelões!
          isMega = false;
        }
      } catch (err) {
        isMega = false;
      }
    }

    if (pkmOriginal.itemEquipado === 'Item de Velocidade') {
      velocidadeCalculada = Math.floor(velocidadeCalculada * 1.2);
    }

    return {
      hp: hpCalculado,
      maxHp: hpCalculado,
      ataque: ataqueCalculado,
      defesa: defesaCalculada,
      velocidade: velocidadeCalculada,
      tipos: tipos,
      imagem: imagemFinal,
      imagemBase: pkmOriginal.imagem,
      imagemMega: imagemFinal,        
      nome: nomeFinal,
      nomeBase: pkmOriginal.nome,
      isMega: isMega,
      itemEquipado: pkmOriginal.itemEquipado,
      frutaConsumida: false,
      id: pkmOriginal.id
    };
  } catch (e) {
    return { 
      hp: 150, maxHp: 150, ataque: 80, defesa: 70, velocidade: 80, 
      tipos: ['normal'], imagem: pkmOriginal.imagem, imagemBase: pkmOriginal.imagem,
      imagemMega: pkmOriginal.imagem, nome: pkmOriginal.nome, nomeBase: pkmOriginal.nome,
      isMega: false, itemEquipado: pkmOriginal.itemEquipado, frutaConsumida: false, id: pkmOriginal.id
    };
  }
}

async function iniciarBatalhaAutomatica(time1, time2, nome1, nome2) {
  const modal = document.getElementById('modal-batalha');
  const log = document.getElementById('log-batalha');
  if (modal) modal.style.display = 'flex';

  document.getElementById('batalha-nome-j1').innerText = nome1;
  document.getElementById('batalha-nome-j2').innerText = nome2;

  log.innerHTML = "<p>⚔️ Sincronizando equipes e carregando status na arena...</p>";

  let lutadores1 = await Promise.all(time1.map(async p => await carregarStatusPokemon(p)));
  let lutadores2 = await Promise.all(time2.map(async p => await carregarStatusPokemon(p)));

  let i = 0, j = 0;

  while (i < lutadores1.length && j < lutadores2.length) {
    let p1 = lutadores1[i];
    let p2 = lutadores2[j];

    document.getElementById('batalha-img-pkm1').src = p1.imagemBase;
    document.getElementById('batalha-nome-pkm1').innerText = p1.nomeBase;
    document.getElementById('batalha-img-pkm2').src = p2.imagemBase;
    document.getElementById('batalha-nome-pkm2').innerText = p2.nomeBase;

    log.innerHTML += `<hr style="border: 0; border-top: 1px solid #444; margin: 8px 0;">`;
    log.innerHTML += `<p style="color: #ffcb05;"><strong>Entram na arena:</strong> ${p1.nomeBase} vs ${p2.nomeBase}!</p>`;
    log.scrollTop = log.scrollHeight;

    atualizarBarrasHP(p1, p2);

    if (p1.isMega || p2.isMega) {
      await new Promise(r => setTimeout(r, 1200));
      
      if (p1.isMega) await dispararAnimacaoMega(1, p1, log);
      if (p2.isMega) await dispararAnimacaoMega(2, p2, log);
      
      log.scrollTop = log.scrollHeight;
    }

    while (p1.hp > 0 && p2.hp > 0) {
      await new Promise(r => setTimeout(r, 900));

      let primeiro = p1.velocidade >= p2.velocidade ? p1 : p2;
      let segundo = primeiro === p1 ? p2 : p1;
      let numeroDefensorSegundo = primeiro === p1 ? 2 : 1;
      let numeroDefensorPrimeiro = primeiro === p1 ? 1 : 2;

      executarAtaqueTurno(primeiro, segundo, numeroDefensorSegundo, log);
      verificarEUsarFruta(segundo, numeroDefensorSegundo, log);
      atualizarBarrasHP(p1, p2);

      if (segundo.hp <= 0) break;

      await new Promise(r => setTimeout(r, 600));

      executarAtaqueTurno(segundo, primeiro, numeroDefensorPrimeiro, log);
      verificarEUsarFruta(primeiro, numeroDefensorPrimeiro, log);
      atualizarBarrasHP(p1, p2);

      if (primeiro.hp <= 0) break;
    }

    if (p1.hp <= 0) {
      log.innerHTML += `<p style="color: #ff4d4d;">☠️ O ${p1.isMega ? p1.nome : p1.nomeBase} de ${nome1} desmaiou!</p>`;
      i++;
    }
    if (p2.hp <= 0) {
      log.innerHTML += `<p style="color: #ff4d4d;">☠️ O ${p2.isMega ? p2.nome : p2.nomeBase} de ${nome2} desmaiou!</p>`;
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

async function dispararAnimacaoMega(numCombatente, pkmObj, logElemento) {
  const imgElem = document.getElementById(`batalha-img-pkm${numCombatente}`);
  const nomeElem = document.getElementById(`batalha-nome-pkm${numCombatente}`);
  
  if (imgElem) {
    imgElem.style.transition = "transform 0.4s ease, filter 0.4s ease";
    imgElem.style.transform = "scale(1.3)";
    imgElem.style.filter = "brightness(2.5) drop-shadow(0 0 22px gold)";
    
    await new Promise(r => setTimeout(r, 400));
    
    imgElem.src = pkmObj.imagemMega;
    if (nomeElem) nomeElem.innerText = pkmObj.nome;

    imgElem.style.transform = "scale(1)";
    imgElem.style.filter = "none";
  }
  logElemento.innerHTML += `<p style="color: #ffcb05;">✨ ${pkmObj.nomeBase} reagiu à Mega Stone e Mega Evoluiu!</p>`;
}

function verificarEUsarFruta(combatente, numCombatente, logElemento) {
  if (combatente.itemEquipado === 'Sitrus Berry' && !combatente.frutaConsumida) {
    if (combatente.hp > 0 && combatente.hp <= combatente.maxHp / 2) {
      combatente.frutaConsumida = true;
      combatente.hp = Math.min(combatente.maxHp, combatente.hp + 50);

      logElemento.innerHTML += `<p style="color: #4caf50;">🍑 ${combatente.isMega ? combatente.nome : combatente.nomeBase} comeu a Sitrus Berry e recuperou 50 HP!</p>`;

      const imgElem = document.getElementById(`batalha-img-pkm${numCombatente}`);
      if (imgElem && imgElem.parentElement) {
        const aviso = document.createElement('div');
        aviso.innerText = "+50 HP 🍑";
        aviso.style.cssText = "position: absolute; top: -15px; left: 50%; transform: translateX(-50%); color: #4caf50; font-weight: bold; font-size: 16px; text-shadow: 1px 1px 2px black; z-index: 100;";
        imgElem.parentElement.appendChild(aviso);
        setTimeout(() => aviso.remove(), 900);
      }
    }
  }
}

function executarAtaqueTurno(atacante, defensor, numeroDefensor, logElemento) {
  let danoBase = Math.max(12, Math.floor(atacante.ataque * 0.55 - defensor.defesa * 0.2));

  let multiplicadorTipo = 1.0;
  let teveImunidade = false;
  let ehImunidadeMutua = false;

  // Verificação de Interação Normal vs. Fantasma (Dano Fixo 10 e mensagem na situação)
  const tiposAtacante = atacante.tipos ? atacante.tipos.map(t => t.toLowerCase()) : [];
  const tiposDefensor = defensor.tipos ? defensor.tipos.map(t => t.toLowerCase()) : [];

  const atacanteTemNormal = tiposAtacante.includes('normal');
  const defensorTemFantasma = tiposDefensor.includes('ghost');
  const atacanteTemFantasma = tiposAtacante.includes('ghost');
  const defensorTemNormal = tiposDefensor.includes('normal');

  if ((atacanteTemNormal && defensorTemFantasma) || (atacanteTemFantasma && defensorTemNormal)) {
    ehImunidadeMutua = true;
  }

  if (ehImunidadeMutua) {
    let danoFinal = 10;
    defensor.hp -= danoFinal;
    if (defensor.hp < 0) defensor.hp = 0;

    const mensagemSituacao = `⚠️ Interação de Tipos: ${atacante.isMega ? atacante.nome : atacante.nomeBase} e ${defensor.isMega ? defensor.nome : defensor.nomeBase} possuem imunidades cruzadas! O golpe causa 10 de dano fixo.`;
    
    // Atualiza a box de situação da tela
    const divSituacao = document.querySelector('.situacao') || document.getElementById('mensagem-batalha');
    if (divSituacao) divSituacao.innerHTML = `<p>${mensagemSituacao}</p>`;

    const imagemDefensor = document.getElementById(`batalha-img-pkm${numeroDefensor}`);
    if (imagemDefensor) {
      imagemDefensor.classList.add('efeito-tremer');
      setTimeout(() => imagemDefensor.classList.remove('efeito-tremer'), 400);
    }

    let nomeAtv = atacante.isMega ? atacante.nome : atacante.nomeBase;
    let nomeDef = defensor.isMega ? defensor.nome : defensor.nomeBase;
    logElemento.innerHTML += `<p>💥 <strong>${nomeAtv}</strong> atacou ${nomeDef} causando 10 de dano fixo <span style='color: #ff9800;'>(Imunidade cruzada!)</span></p>`;
    return;
  }

  // Lógica normal de tipos padrão
  if (atacante.tipos && atacante.tipos.length > 0 && defensor.tipos) {
    let melhorEfetividade = 1.0;

    for (let tAtk of atacante.tipos) {
      for (let tDef of defensor.tipos) {
        let ef = calcularEfetividade(tAtk, tDef);
        if (ef === 0.0) {
          teveImunidade = true;
        } else if (ef > melhorEfetividade) {
          melhorEfetividade = ef;
        }
      }
    }
    multiplicadorTipo = teveImunidade ? 0.0 : melhorEfetividade;
  }

  let danoFinal = Math.floor(danoBase * multiplicadorTipo);
  let textoExtra = "";

  if (teveImunidade) {
    danoFinal = 1;
    textoExtra = " <span style='color: gray;'>(Imunidade de tipo! Causou 1 de dano)</span>";
  } else {
    if (danoFinal < 1) danoFinal = 1;

    if (multiplicadorTipo > 1.0) {
      textoExtra = " <span style='color: #4caf50;'>(Foi Super Efetivo!)</span>";
    } else if (multiplicadorTipo < 1.0) {
      textoExtra = " <span style='color: #ff9800;'>(Não foi muito efetivo...)</span>";
    }
  }

  defensor.hp -= danoFinal;
  if (defensor.hp < 0) defensor.hp = 0;

  const imagemDefensor = document.getElementById(`batalha-img-pkm${numeroDefensor}`);
  if (imagemDefensor) {
    imagemDefensor.classList.add('efeito-tremer');
    setTimeout(() => {
      imagemDefensor.classList.remove('efeito-tremer');
    }, 400);
  }

  let nomeAtacanteExibicao = atacante.isMega ? atacante.nome : atacante.nomeBase;
  let nomeDefensorExibicao = defensor.isMega ? defensor.nome : defensor.nomeBase;

  logElemento.innerHTML += `<p>💥 <strong>${nomeAtacanteExibicao}</strong> atacou ${nomeDefensorExibicao} causando ${danoFinal} de dano!${textoExtra}</p>`;
}

function atualizarBarrasHP(p1, p2) {
  const bar1 = document.getElementById('hp-bar-1');
  const bar2 = document.getElementById('hp-bar-2');

  const textoHp1 = document.getElementById('batalha-texto-hp-1');
  const textoHp2 = document.getElementById('batalha-texto-hp-2');

  if (bar1) {
    let pct1 = Math.max(0, (p1.hp / p1.maxHp) * 100);
    bar1.style.width = `${pct1}%`;
    
    if (pct1 > 50) bar1.style.backgroundColor = '#4caf50';
    else if (pct1 > 20) bar1.style.backgroundColor = '#ff9800';
    else bar1.style.backgroundColor = '#f44336';
  }

  if (bar2) {
    let pct2 = Math.max(0, (p2.hp / p2.maxHp) * 100);
    bar2.style.width = `${pct2}%`;

    if (pct2 > 50) bar2.style.backgroundColor = '#4caf50';
    else if (pct2 > 20) bar2.style.backgroundColor = '#ff9800';
    else bar2.style.backgroundColor = '#f44336';
  }

  if (textoHp1) textoHp1.innerText = `${Math.max(0, p1.hp)} / ${p1.maxHp}`;
  if (textoHp2) textoHp2.innerText = `${Math.max(0, p2.hp)} / ${p2.maxHp}`;
}

function fecharModalBatalha() {
  const modal = document.getElementById('modal-batalha');
  if (modal) modal.style.display = 'none';
  window.location.href = "index.html";
}