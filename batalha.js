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
  fighting: { normal: 2.0, ice: 2.0, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2.0, ghost: 0.0, dark: 2.0, steel: 2.0, fairy: 0.5 },
  poison: { grass: 2.0, fairy: 2.0, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0.0 },
  ground: { fire: 2.0, electric: 2.0, poison: 2.0, rock: 2.0, steel: 2.0, grass: 0.5, bug: 0.5, flying: 0.0 },
  flying: { grass: 2.0, fighting: 2.0, bug: 2.0, electric: 0.5, rock: 0.5, steel: 0.5 },
  bug: { grass: 2.0, psychic: 2.0, dark: 2.0, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2.0, ice: 2.0, flying: 2.0, bug: 2.0, fighting: 0.5, ground: 0.5, steel: 0.5 },
  steel: { ice: 2.0, rock: 2.0, fairy: 2.0, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2.0, dragon: 2.0, dark: 2.0, fire: 0.5, poison: 0.5, steel: 0.5 },
  dark: { psychic: 2.0, ghost: 2.0, fighting: 0.5, dark: 0.5, fairy: 0.5 }
};

function calcularEfetividade(tipoAtacante, tipoDefensor) {
  if (!tabelaVantagens[tipoAtacante]) return 1.0;
  if (tabelaVantagens[tipoAtacante][tipoDefensor] !== undefined) {
    return tabelaVantagens[tipoAtacante][tipoDefensor];
  }
  return 1.0;
}

// Atualiza visualmente as Pokébolas na arena de batalha usando imagens reais e alinhamento horizontal (máx 3 por fileira)
function atualizarIndicadorPokebolas(numJogador, timeLutadores, indiceAtual) {
  const container = document.getElementById(`pokebolas-j${numJogador}`);
  if (!container) return;

  container.style.cssText = "display: flex; justify-content: center; flex-wrap: wrap; gap: 4px; margin: 4px auto; max-width: 70px;";
  container.innerHTML = "";

  const urlSpritePokebola = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";

  timeLutadores.forEach((pkm, index) => {
    const imgBola = document.createElement('img');
    imgBola.src = urlSpritePokebola;
    
    let estiloBase = "width: 18px; height: 18px; object-fit: contain; filter: drop-shadow(1px 1px 1px black); transition: opacity 0.3s ease;";
    
    if (index < indiceAtual || pkm.hp <= 0) {
      imgBola.style.cssText = estiloBase + " opacity: 0.3; filter: grayscale(100%) drop-shadow(1px 1px 1px black);";
      imgBola.title = `${pkm.nomeBase} (Desmaiado)`;
    } else {
      imgBola.style.cssText = estiloBase + " opacity: 1;";
      imgBola.title = `${pkm.nomeBase} (Pronto)`;
    }

    container.appendChild(imgBola);
  });
}

// Carrega os status de forma infalível, mapeando corretamente e preservando o estado de evolução (suporta múltiplas megas).
async function carregarStatusPokemon(pkmOriginal) {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pkmOriginal.id}`);
    const dados = await res.json();
    let tiposBase = dados.types.map(t => t.type.name);

    let hpCalculado = dados.stats[0].base_stat * 2 + 50;
    let ataqueBase = dados.stats[1].base_stat;
    let defesaBase = dados.stats[2].base_stat;
    let velocidadeBase = dados.stats[5].base_stat;

    let imagemFinal = pkmOriginal.imagem;
    let nomeFinal = pkmOriginal.nome;
    let tiposMega = tiposBase;
    let ataqueMega = ataqueBase;
    let defesaMega = defesaBase;
    let velocidadeMega = velocidadeBase;
    let temCapacidadeMega = false;

    if (pkmOriginal.itemEquipado === 'Mega Stone') {
      try {
        const nomeApi = dados.name.toLowerCase().trim();
        let resMega = null;

        let urlsParaTestar = [
          `https://pokeapi.co/api/v2/pokemon/${nomeApi}-mega`,
          `https://pokeapi.co/api/v2/pokemon/${nomeApi}-mega-x`,
          `https://pokeapi.co/api/v2/pokemon/${nomeApi}-mega-y`
        ];

        for (let url of urlsParaTestar) {
          try {
            let tentativa = await fetch(url);
            if (tentativa.ok) {
              resMega = tentativa;
              break;
            }
          } catch (e) {}
        }

        if (!resMega || !resMega.ok) {
          try {
            const resEspecie = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pkmOriginal.id}`);
            if (resEspecie.ok) {
              const dadosEspecie = await resEspecie.json();
              const variedadeMega = dadosEspecie.varieties.find(v => v.pokemon.name.includes('mega'));
              if (variedadeMega) {
                let tentativaVariedade = await fetch(variedadeMega.pokemon.url);
                if (tentativaVariedade.ok) {
                  resMega = tentativaVariedade;
                }
              }
            }
          } catch (e) {}
        }
        
        if (resMega && resMega.ok) {
          const dadosMega = await resMega.json();
          imagemFinal = dadosMega.sprites.other['official-artwork'].front_default || dadosMega.sprites.front_default || imagemFinal;
          tiposMega = dadosMega.types.map(t => t.type.name);
          ataqueMega = dadosMega.stats[1].base_stat;
          defesaMega = dadosMega.stats[2].base_stat;
          velocidadeMega = dadosMega.stats[5].base_stat;
          nomeFinal = `MEGA ${pkmOriginal.nome}`;
          temCapacidadeMega = true;
        }
      } catch (err) {
        temCapacidadeMega = false;
      }
    }

    if (pkmOriginal.itemEquipado === 'Item de Velocidade') {
      velocidadeBase = Math.floor(velocidadeBase * 1.2);
      velocidadeMega = Math.floor(velocidadeMega * 1.2);
    }

    return {
      hp: hpCalculado,
      maxHp: hpCalculado,
      ataque: ataqueBase,
      defesa: defesaBase,
      velocidade: velocidadeBase,
      tipos: tiposBase,
      ataqueMega: ataqueMega,
      defesaMega: defesaMega,
      velocidadeMega: velocidadeMega,
      tiposMega: tiposMega,
      imagemBase: pkmOriginal.imagem,
      imagemMega: imagemFinal,        
      nomeBase: pkmOriginal.nome,
      nomeMega: nomeFinal,
      temCapacidadeMega: temCapacidadeMega,
      jaMegaEvoluiu: false,
      itemEquipado: pkmOriginal.itemEquipado,
      frutaConsumida: false,
      id: pkmOriginal.id
    };
  } catch (e) {
    return { 
      hp: 150, maxHp: 150, ataque: 80, defesa: 70, velocidade: 80, 
      tipos: ['normal'], imagemBase: pkmOriginal.imagem, imagemMega: pkmOriginal.imagem,
      nomeBase: pkmOriginal.nome, nomeMega: pkmOriginal.nome, temCapacidadeMega: false, 
      jaMegaEvoluiu: false, itemEquipado: pkmOriginal.itemEquipado, frutaConsumida: false, id: pkmOriginal.id
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

  let lutadores1 = JSON.parse(JSON.stringify(await Promise.all(time1.map(async p => await carregarStatusPokemon(p)))));
  let lutadores2 = JSON.parse(JSON.stringify(await Promise.all(time2.map(async p => await carregarStatusPokemon(p)))));

  let i = 0, j = 0;

  while (i < lutadores1.length && j < lutadores2.length) {
    let p1 = lutadores1[i];
    let p2 = lutadores2[j];

    atualizarIndicadorPokebolas(1, lutadores1, i);
    atualizarIndicadorPokebolas(2, lutadores2, j);

    document.getElementById('batalha-img-pkm1').src = p1.jaMegaEvoluiu ? p1.imagemMega : p1.imagemBase;
    document.getElementById('batalha-nome-pkm1').innerText = p1.jaMegaEvoluiu ? p1.nomeMega : p1.nomeBase;
    
    document.getElementById('batalha-img-pkm2').src = p2.jaMegaEvoluiu ? p2.imagemMega : p2.imagemBase;
    document.getElementById('batalha-nome-pkm2').innerText = p2.jaMegaEvoluiu ? p2.nomeMega : p2.nomeBase;

    log.innerHTML += `<hr style="border: 0; border-top: 1px solid #444; margin: 8px 0;">`;
    log.innerHTML += `<p style="color: #ffcb05;"><strong>Entram na arena:</strong> ${p1.jaMegaEvoluiu ? p1.nomeMega : p1.nomeBase} vs ${p2.jaMegaEvoluiu ? p2.nomeMega : p2.nomeBase}!</p>`;
    log.scrollTop = log.scrollHeight;

    atualizarBarrasHP(p1, p2);

    if ((p1.temCapacidadeMega && !p1.jaMegaEvoluiu) || (p2.temCapacidadeMega && !p2.jaMegaEvoluiu)) {
      await new Promise(r => setTimeout(r, 1500));

      if (p1.temCapacidadeMega && !p1.jaMegaEvoluiu) {
        await dispararAnimacaoMega(1, p1, log);
      }
      if (p2.temCapacidadeMega && !p2.jaMegaEvoluiu) {
        await dispararAnimacaoMega(2, p2, log);
      }
      log.scrollTop = log.scrollHeight;
    }

    while (p1.hp > 0 && p2.hp > 0) {
      await new Promise(r => setTimeout(r, 900));

      let primeiro = p1.velocidade >= p2.velocidade ? p1 : p2;
      let segundo = primeiro === p1 ? p2 : p1;
      let numeroDefensorSegundo = primeiro === p1 ? 2 : 1;
      let numeroDefensorPrimeiro = primeiro === p1 ? 1 : 2;

      executarAtaqueTurno(primeiro, segundo, numeroDefensorSegundo, log);
      aplicarEfeitosPassivosTurno(segundo, numeroDefensorSegundo, log);
      verificarEUsarFruta(segundo, numeroDefensorSegundo, log);
      atualizarBarrasHP(p1, p2);

      if (segundo.hp <= 0) break;

      await new Promise(r => setTimeout(r, 600));

      executarAtaqueTurno(segundo, primeiro, numeroDefensorPrimeiro, log);
      aplicarEfeitosPassivosTurno(primeiro, numeroDefensorPrimeiro, log);
      verificarEUsarFruta(primeiro, numeroDefensorPrimeiro, log);
      atualizarBarrasHP(p1, p2);

      if (primeiro.hp <= 0) break;
    }

    if (p1.hp <= 0) {
      let nomeExibicaoP1 = p1.jaMegaEvoluiu ? p1.nomeMega : p1.nomeBase;
      log.innerHTML += `<p style="color: #ff4d4d;">☠️ O ${nomeExibicaoP1} de ${nome1} desmaiou!</p>`;
      i++;
    }
    if (p2.hp <= 0) {
      let nomeExibicaoP2 = p2.jaMegaEvoluiu ? p2.nomeMega : p2.nomeBase;
      log.innerHTML += `<p style="color: #ff4d4d;">☠️ O ${nomeExibicaoP2} de ${nome2} desmaiou!</p>`;
      j++;
    }

    atualizarIndicadorPokebolas(1, lutadores1, i);
    atualizarIndicadorPokebolas(2, lutadores2, j);
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

  if (imgElem && imgElem.parentElement) {
    imgElem.parentElement.style.position = "relative";

    // Cria a imagem PNG flutuante do símbolo da Mega Evolução
    const iconeMegaPng = document.createElement('img');
    iconeMegaPng.src = "imagens/mega_simbolo.png"; 
    iconeMegaPng.style.cssText = "position: absolute; top: -35px; left: 50%; transform: translateX(-50%) scale(0); width: 100px; height: 100px; object-fit: contain; filter: drop-shadow(0 0 8px gold); z-index: 100; transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease;";
    
    imgElem.parentElement.appendChild(iconeMegaPng);

    setTimeout(() => {
      iconeMegaPng.style.transform = "translateX(-50%) scale(1.2)";
    }, 50);

    imgElem.style.transition = "transform 0.4s ease, filter 0.4s ease";
    imgElem.style.transform = "scale(1.3)";
    imgElem.style.filter = "brightness(2.5) drop-shadow(0 0 25px gold)";

    await new Promise(r => setTimeout(r, 500));

    imgElem.src = pkmObj.imagemMega;
    if (nomeElem) nomeElem.innerText = pkmObj.nomeMega;

    imgElem.style.transform = "scale(1)";
    imgElem.style.filter = "none";

    setTimeout(() => {
      iconeMegaPng.style.transform = "translateX(-50%) scale(0)";
      iconeMegaPng.style.opacity = "0";
      setTimeout(() => iconeMegaPng.remove(), 400);
    }, 1000);
  }

  pkmObj.ataque = pkmObj.ataqueMega;
  pkmObj.defesa = pkmObj.defesaMega;
  pkmObj.velocidade = pkmObj.velocidadeMega;
  pkmObj.tipos = pkmObj.tiposMega;
  pkmObj.jaMegaEvoluiu = true;

  logElemento.innerHTML += `<p style="color: #ffcb05;">✨ ${pkmObj.nomeBase} reagiu à Mega Stone e Mega Evoluiu!</p>`;
}

function verificarEUsarFruta(combatente, numCombatente, logElemento) {
  if (combatente.itemEquipado === 'Sitrus Berry' && !combatente.frutaConsumida) {
    if (combatente.hp > 0 && combatente.hp <= combatente.maxHp / 2) {
      combatente.frutaConsumida = true;
      combatente.hp = Math.min(combatente.maxHp, combatente.hp + 50);

      let nomeExibicao = combatente.jaMegaEvoluiu ? combatente.nomeMega : combatente.nomeBase;
      logElemento.innerHTML += `<p style="color: #4caf50;">🍑 ${nomeExibicao} comeu a Sitrus Berry e recuperou 50 HP!</p>`;

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

function aplicarEfeitosPassivosTurno(combatente, numCombatente, logElemento) {
  if (combatente.itemEquipado === 'Leftovers' && combatente.hp > 0 && combatente.hp < combatente.maxHp) {
    let cura = Math.floor(combatente.maxHp * 0.10);
    combatente.hp = Math.min(combatente.maxHp, combatente.hp + cura);
    let nomeExibicao = combatente.jaMegaEvoluiu ? combatente.nomeMega : combatente.nomeBase;
    logElemento.innerHTML += `<p style="color: #4caf50;">🛡️ ${nomeExibicao} recuperou ${cura} HP graças às Leftovers!</p>`;
  }
}

// Executa o ataque com inteligência de tipagem dupla (avalia todos os tipos do atacante e escolhe o melhor)
function executarAtaqueTurno(atacante, defensor, numeroDefensor, logElemento) {
  let danoBase = Math.max(12, Math.floor(atacante.ataque * 0.55 - defensor.defesa * 0.2));

  if (atacante.itemEquipado === 'Muscle Band') {
    danoBase = Math.floor(danoBase * 1.15);
  }

  const tiposAtacante = atacante.tipos ? atacante.tipos.map(t => t.toLowerCase()) : ['normal'];
  const tiposDefensor = defensor.tipos ? defensor.tipos.map(t => t.toLowerCase()) : ['normal'];

  const atacanteTemNormal = tiposAtacante.includes('normal');
  const defensorTemFantasma = tiposDefensor.includes('ghost');
  const atacanteTemFantasma = tiposAtacante.includes('ghost');
  const defensorTemNormal = tiposDefensor.includes('normal');

  if ((atacanteTemNormal && defensorTemFantasma) || (atacanteTemFantasma && defensorTemNormal)) {
    let danoFinal = 10;
    defensor.hp -= danoFinal;
    if (defensor.hp < 0) defensor.hp = 0;

    let nomeAtv = atacante.jaMegaEvoluiu ? atacante.nomeMega : atacante.nomeBase;
    let nomeDef = defensor.jaMegaEvoluiu ? defensor.nomeMega : defensor.nomeBase;

    logElemento.innerHTML += `<p>💥 <strong>${nomeAtv}</strong> atacou ${nomeDef} causando 10 de dano fixo <span style='color: #ff9800;'>(Imunidade cruzada!)</span></p>`;
    return;
  }

  let melhorTipoAtacker = tiposAtacante[0];
  let melhorMultiplicador = -1;
  let teveImunidadeWithMelhor = false;

  for (let tAtk of tiposAtacante) {
    let efParcial = 1.0;
    let imuneParcial = false;

    for (let tDef of tiposDefensor) {
      let ef = calcularEfetividade(tAtk, tDef);
      if (ef === 0.0) {
        imuneParcial = true;
      }
      efParcial *= ef;
    }

    if (!imuneParcial && efParcial > melhorMultiplicador) {
      melhorMultiplicador = efParcial;
      melhorTipoAtacker = tAtk;
      teveImunidadeWithMelhor = false;
    } else if (melhorMultiplicador === -1) {
      melhorMultiplicador = efParcial;
      melhorTipoAtacker = tAtk;
      teveImunidadeWithMelhor = imuneParcial;
    }
  }

  let multiplicadorTipo = melhorMultiplicador >= 0 ? melhorMultiplicador : 1.0;
  let teveImunidade = teveImunidadeWithMelhor;

  let danoFinal = Math.floor(danoBase * multiplicadorTipo);
  let textoExtra = "";

  if (teveImunidade || multiplicadorTipo === 0.0) {
    danoFinal = 1;
    textoExtra = " <span style='color: gray;'>(Imunidade de tipo! Usou a melhor tipagem disponível e causou 1 de dano)</span>";
  } else {
    if (danoFinal < 1) danoFinal = 1;

    if (multiplicadorTipo > 1.0) {
      textoExtra = ` <span style='color: #4caf50;'>(Usou ${melhorTipoAtacker} - Super Efetivo!)</span>`;
    } else if (multiplicadorTipo < 1.0) {
      textoExtra = ` <span style='color: #ff9800;'>(Usou ${melhorTipoAtacker} - Não foi muito efetivo...)</span>`;
    } else {
      textoExtra = ` <span style='color: #ccc;'>(Usou ${melhorTipoAtacker})</span>`;
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

  let nomeAtacanteExibicao = atacante.jaMegaEvoluiu ? atacante.nomeMega : atacante.nomeBase;
  let nomeDefensorExibicao = defensor.jaMegaEvoluiu ? defensor.nomeMega : defensor.nomeBase;

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