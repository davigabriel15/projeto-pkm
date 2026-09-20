// 7. SIMULADOR DE BATALHA AUTOMÁTICA
async function carregarStatusPokemon(id) {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const dados = await res.json();
    return {
      hp: dados.stats[0].base_stat * 2 + 50,
      maxHp: dados.stats[0].base_stat * 2 + 50,
      ataque: dados.stats[1].base_stat,
      defesa: dados.stats[2].base_stat,
      velocidade: dados.stats[5].base_stat
    };
  } catch (e) {
    return { hp: 150, maxHp: 150, ataque: 80, defesa: 70, velocidade: 80 };
  }
}

async function iniciarBatalhaAutomatica(time1, time2, nome1, nome2) {
  const modal = document.getElementById('modal-batalha');
  const log = document.getElementById('log-batalha');
  if (modal) modal.style.display = 'flex';

  document.getElementById('batalha-nome-j1').innerText = nome1;
  document.getElementById('batalha-nome-j2').innerText = nome2;

  log.innerHTML = "<p>⚔️ Carregando status dos Pokémon para o combate...</p>";

  let lutadores1 = await Promise.all(time1.map(async p => ({ ...p, status: await carregarStatusPokemon(p.id) })));
  let lutadores2 = await Promise.all(time2.map(async p => ({ ...p, status: await carregarStatusPokemon(p.id) })));

  let i = 0, j = 0;

  while (i < lutadores1.length && j < lutadores2.length) {
    let p1 = lutadores1[i];
    let p2 = lutadores2[j];

    document.getElementById('batalha-img-pkm1').src = p1.imagem;
    document.getElementById('batalha-nome-pkm1').innerText = p1.nome;
    document.getElementById('batalha-img-pkm2').src = p2.imagem;
    document.getElementById('batalha-nome-pkm2').innerText = p2.nome;

    log.innerHTML += `<p style="color: #ffcb05;"><strong>Entram na arena:</strong> ${p1.nome} vs ${p2.nome}!</p>`;
    log.scrollTop = log.scrollHeight;

    while (p1.status.hp > 0 && p2.status.hp > 0) {
      await new Promise(r => setTimeout(r, 800));

      let primeiro = p1.status.velocidade >= p2.status.velocidade ? p1 : p2;
      let segundo = primeiro === p1 ? p2 : p1;

      let dano1 = Math.max(10, Math.floor(primeiro.status.ataque * 0.5 - segundo.status.defesa * 0.2));
      segundo.status.hp -= dano1;
      log.innerHTML += `<p>💥 <strong>${primeiro.nome}</strong> atacou ${segundo.nome} causando ${dano1} de dano!</p>`;

      if (segundo.status.hp <= 0) break;

      let dano2 = Math.max(10, Math.floor(segundo.status.ataque * 0.5 - primeiro.status.defesa * 0.2));
      primeiro.status.hp -= dano2;
      log.innerHTML += `<p>💥 <strong>${segundo.nome}</strong> contra-atacou causando ${dano2} de dano!</p>`;

      document.getElementById('hp-bar-1').style.width = `${Math.max(0, (p1.status.hp / p1.status.maxHp) * 100)}%`;
      document.getElementById('hp-bar-2').style.width = `${Math.max(0, (p2.status.hp / p2.status.maxHp) * 100)}%`;
      log.scrollTop = log.scrollHeight;
    }

    if (p1.status.hp <= 0) {
      log.innerHTML += `<p style="color: #ff4d4d;">☠️ ${p1.nome} desmaiou!</p>`;
      i++;
    }
    if (p2.status.hp <= 0) {
      log.innerHTML += `<p style="color: #ff4d4d;">☠️ ${p2.nome} desmaiou!</p>`;
      j++;
    }
  }

  const vencedor = i < lutadores1.length ? nome1 : nome2;
  log.innerHTML += `<h3 style="color: #4caf50; font-size: 18px;">🏆 FIM DE JOGO! ${vencedor} VENCEU A BATALHA!</h3>`;
  log.scrollTop = log.scrollHeight;

  document.getElementById('btn-fechar-batalha').style.display = 'inline-block';
}

function fecharModalBatalha() {
  document.getElementById('modal-batalha').style.display = 'none';
  window.location.href = "index.html";
}