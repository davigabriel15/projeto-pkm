// ==========================================
// 1. VARIÁVEIS GLOBAIS E CONFIGURAÇÃO INICIAL
// ==========================================
let meuNome = localStorage.getItem('pkm_meu_nome') || localStorage.getItem('pkm_jogador1') || "Jogador 1";
let nomeJ2Local = localStorage.getItem('pkm_jogador2') || "Jogador 2";
let codigoSala = localStorage.getItem('pkm_sala_id') || "";
let modoJogo = localStorage.getItem('pkm_modo') || "padrao";
let estagioEvolucao = localStorage.getItem('pkm_estagio') || "normal";

let saldoInicial = modoJogo === "pobre" ? 20 : 100;
let meuNumeroJogador = null; // 1 ou 2 (Online)

let database = null;
let salaRef = null;

// Controle do Leilão para MODO LOCAL (1 Tela)
let leilaoAtual = {
  pokemon: null,
  lanceAtual: 0,
  quemDeuMaiorLance: null,
  time1: [],
  time2: []
};

// ==========================================
// 2. CONEXÃO COM O FIREBASE
// ==========================================
try {
  if (typeof firebase !== "undefined" && codigoSala && typeof firebaseConfig !== "undefined") {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    salaRef = database.ref(`salas/${codigoSala}`);
  }
} catch (e) {
  console.warn("Modo Local ativo ou erro no Firebase:", e);
}

// ==========================================
// 3. CONECTAR E CONFIGURAR INTERFACE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  exibirCodigoSala();

  if (salaRef) {
    // MODO ONLINE
    salaRef.once("value").then((snapshot) => {
      const dados = snapshot.val() || {};
      const agora = Date.now();
      const umDiaEmMs = 24 * 60 * 60 * 1000;

      if (dados.ultimaAtualizacao && (agora - dados.ultimaAtualizacao > umDiaEmMs)) {
        salaRef.remove();
        window.location.reload();
        return;
      }

      if (!dados.jogador1) {
        meuNumeroJogador = 1;
        salaRef.update({
          jogador1: meuNome,
          saldoJ1: saldoInicial,
          time1: [],
          time1Organizado: null,
          modo: modoJogo,
          estagio: estagioEvolucao,
          ultimaAtualizacao: agora
        });
      } else if (dados.jogador1 === meuNome) {
        meuNumeroJogador = 1;
        salaRef.update({ ultimaAtualizacao: agora });
      } else if (!dados.jogador2) {
        meuNumeroJogador = 2;
        salaRef.update({
          jogador2: meuNome,
          saldoJ2: saldoInicial,
          time2: [],
          time2Organizado: null,
          ultimaAtualizacao: agora
        });
      } else if (dados.jogador2 === meuNome) {
        meuNumeroJogador = 2;
        salaRef.update({ ultimaAtualizacao: agora });
      } else {
        meuNumeroJogador = 2;
        salaRef.update({ 
          jogador2: meuNome,
          ultimaAtualizacao: agora 
        });
      }

      configurarBotoesPorModo(true);
      escutarAtualizacoesSala();
    });
  } else {
    // MODO LOCAL (1 Tela)
    configurarBotoesPorModo(false);
    configurarModoLocal();
  }
});

function exibirCodigoSala() {
  const elemSala = document.getElementById('codigo-sala-display');
  if (elemSala) {
    elemSala.innerText = codigoSala ? `SALA: ${codigoSala}` : "MODO LOCAL (1 TELA)";
  }
}

function configurarBotoesPorModo(isOnline) {
  const btnJ1 = document.getElementById('btn-j1');
  const btnJ2 = document.getElementById('btn-j2');

  if (!btnJ1 || !btnJ2) return;

  if (isOnline) {
    if (meuNumeroJogador === 1) {
      btnJ1.style.display = "inline-block";
      btnJ2.style.display = "none";
      btnJ1.value = `Oferta de ${meuNome}`;
    } else if (meuNumeroJogador === 2) {
      btnJ1.style.display = "none";
      btnJ2.style.display = "inline-block";
      btnJ2.value = `Oferta de ${meuNome}`;
    }
  } else {
    btnJ1.style.display = "inline-block";
    btnJ2.style.display = "inline-block";
    btnJ1.value = `Oferta de ${meuNome}`;
    btnJ2.value = `Oferta de ${nomeJ2Local}`;
  }
}

function configurarModoLocal() {
  const elemJ1 = document.getElementById('titulo-j1');
  const elemJ2 = document.getElementById('titulo-j2');
  if (elemJ1) elemJ1.innerText = meuNome;
  if (elemJ2) elemJ2.innerText = nomeJ2Local;

  const elemSaldo1 = document.getElementById('saldo-j1');
  const elemSaldo2 = document.getElementById('saldo-j2');
  if (elemSaldo1) elemSaldo1.innerText = saldoInicial;
  if (elemSaldo2) elemSaldo2.innerText = saldoInicial;

  exibirMensagem(`Bem-vindos ${meuNome} e ${nomeJ2Local}! Sorteiem o primeiro Pokémon.`);
}

// ==========================================
// 4. ESCUTAR MUDANÇAS ONLINE (FIREBASE)
// ==========================================
function escutarAtualizacoesSala() {
  salaRef.on("value", (snapshot) => {
    const dados = snapshot.val();
    if (!dados) return;

    const nomeJ1 = dados.jogador1 || "Aguardando...";
    const nomeJ2 = dados.jogador2 || "Aguardando...";

    if (dados.estagio) {
      estagioEvolucao = dados.estagio;
    }

    const elemJ1 = document.getElementById('titulo-j1');
    const elemJ2 = document.getElementById('titulo-j2');
    if (elemJ1) elemJ1.innerText = nomeJ1;
    if (elemJ2) elemJ2.innerText = nomeJ2;

    configurarBotoesPorModo(true);

    const elemSaldo1 = document.getElementById('saldo-j1');
    const elemSaldo2 = document.getElementById('saldo-j2');
    if (elemSaldo1) elemSaldo1.innerText = dados.saldoJ1 ?? saldoInicial;
    if (elemSaldo2) elemSaldo2.innerText = dados.saldoJ2 ?? saldoInicial;

    if (dados.pokemonAtual) {
      atualizarTelaPokemon(dados.pokemonAtual);
    } else {
      limparTelaPokemon();
    }

    if (dados.mensagem) {
      exibirMensagem(dados.mensagem);
    }

    atualizarHTMLTime(1, dados.time1 || [], nomeJ1);
    atualizarHTMLTime(2, dados.time2 || [], nomeJ2);

    // FLUXO DE ORGANIZAÇÃO E DISPARO DE BATALHA QUANDO OS TIMES CHEGAM A 6
    if (dados.time1 && dados.time1.length >= 6 && dados.time2 && dados.time2.length >= 6) {
      const time1Pronto = dados.time1Organizado || dados.time1;
      const time2Pronto = dados.time2Organizado || dados.time2;

      // Se ambos já organizaram, fecha o modal e inicia a batalha
      if (dados.time1Organizado && dados.time2Organizado) {
        const modalOrg = document.getElementById('modal-organizar');
        if (modalOrg) modalOrg.style.display = 'none';

        const modalBatalha = document.getElementById('modal-batalha');
        if (modalBatalha && modalBatalha.style.display !== 'flex') {
          iniciarBatalhaAutomatica(time1Pronto, time2Pronto, nomeJ1, nomeJ2);
        }
      } else {
        // Verifica se o jogador atual já enviou sua ordem
        const jaEnvieiOrdem = meuNumeroJogador === 1 ? dados.time1Organizado : dados.time2Organizado;
        const meuTimeOriginal = meuNumeroJogador === 1 ? dados.time1 : dados.time2;

        if (!jaEnvieiOrdem && meuTimeOriginal && meuTimeOriginal.length > 0) {
          const modalOrg = document.getElementById('modal-organizar');
          if (!modalOrg || modalOrg.style.display !== 'flex') {
            abrirModalOrganizacao(meuTimeOriginal, meuNumeroJogador === 1 ? nomeJ1 : nomeJ2);
          }
        } else {
          const modalOrg = document.getElementById('modal-organizar');
          if (modalOrg) modalOrg.style.display = 'none';
          exibirMensagem("Ordem salva! Aguardando o oponente organizar o time...");
        }
      }
    }
  });
}

function exibirMensagem(texto) {
  const divSituacao = document.querySelector('.situacao');
  if (divSituacao) divSituacao.innerHTML = `<p>${texto}</p>`;
}

function atualizarTelaPokemon(pkm) {
  const imgElement = document.getElementById('pokemon-img');
  const nomeElement = document.getElementById('pokemon-nome');
  if (imgElement) {
    imgElement.src = pkm.imagem;
    imgElement.style.display = 'block';
  }
  if (nomeElement) {
    nomeElement.innerText = `#${pkm.id} - ${pkm.nome}`;
  }
}

function limparTelaPokemon() {
  const imgElement = document.getElementById('pokemon-img');
  const nomeElement = document.getElementById('pokemon-nome');
  if (imgElement) {
    imgElement.src = '';
    imgElement.style.display = 'none';
  }
  if (nomeElement) {
    nomeElement.innerText = 'Aguardando sorteio...';
  }
}

function atualizarHTMLTime(num, lista, nomeJogador) {
  const timeElem = document.querySelector(`.time${num}`);
  if (!timeElem) return;

  let htmlImagens = "";
  lista.forEach(pkm => {
    htmlImagens += `<img src="${pkm.imagem}" alt="${pkm.nome}" class="pkm-time" title="${pkm.nome} (R$${pkm.valor})" style="width: 50px; height: 50px; margin: 2px;">`;
  });

  timeElem.innerHTML = `<h2 id="titulo-j${num}">${nomeJogador} (${lista.length}/6)</h2>${htmlImagens}`;
}

// ==========================================
// 5. VERIFICAÇÃO DE EVOLUÇÃO FINAL E SORTEIO
// ==========================================
async function ehEvolucaoFinal(pokemonId) {
  try {
    const resEspecie = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`);
    const dadosEspecie = await resEspecie.json();

    const resCadeia = await fetch(dadosEspecie.evolution_chain.url);
    const dadosCadeia = await resCadeia.json();

    function ehUltimoNaLinha(no, nomePokemon) {
      if (no.species.name === nomePokemon) {
        return !no.evolves_to || no.evolves_to.length === 0;
      }
      for (const proxNo of no.evolves_to) {
        const resultado = ehUltimoNaLinha(proxNo, nomePokemon);
        if (resultado !== false && resultado !== null) return resultado;
      }
      return false;
    }

    return ehUltimoNaLinha(dadosCadeia.chain, dadosEspecie.name);
  } catch (e) {
    console.error("Erro ao verificar evolução final:", e);
    return false;
  }
}

async function buscarProximoPokemonValido() {
  let pokemonValido = false;
  let tentativas = 0;
  let novoPokemon = null;

  while (!pokemonValido && tentativas < 20) {
    tentativas++;
    const idAleatorio = Math.floor(Math.random() * 1025) + 1;

    try {
      const resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${idAleatorio}`);
      const dados = await resposta.json();

      const resEspecie = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${idAleatorio}/`);
      const dadosEspecie = await resEspecie.json();

      if (estagioEvolucao === "finais") {
        const ehFinal = await ehEvolucaoFinal(idAleatorio);
        if (ehFinal) pokemonValido = true;
      } else if (estagioEvolucao === "lendarios") {
        if (dadosEspecie.is_legendary || dadosEspecie.is_mythical) pokemonValido = true;
      } else {
        pokemonValido = true;
      }

      if (pokemonValido) {
        novoPokemon = {
          id: dados.id,
          nome: dados.name.toUpperCase(),
          imagem: dados.sprites.other['official-artwork'].front_default
        };
      }
    } catch (erro) {
      console.warn("Tentativa de sorteio falhou...", erro);
    }
  }

  return novoPokemon;
}

// ==========================================
// 6. AÇÕES DO LEILÃO
// ==========================================
async function sortearPokemon() {
  exibirMensagem("Sorteando novo Pokémon para o leilão...");
  const novoPokemon = await buscarProximoPokemonValido();

  if (!novoPokemon) {
    exibirMensagem("Erro ao encontrar um Pokémon com o filtro selecionado.");
    return;
  }

  if (salaRef) {
    salaRef.update({
      pokemonAtual: novoPokemon,
      lanceAtual: 0,
      quemDeuMaiorLance: null,
      mensagem: `Leilão iniciado para ${novoPokemon.nome}! Faça sua oferta.`,
      ultimaAtualizacao: Date.now()
    });
  } else {
    leilaoAtual.pokemon = novoPokemon;
    leilaoAtual.lanceAtual = 0;
    leilaoAtual.quemDeuMaiorLance = null;
    atualizarTelaPokemon(novoPokemon);
    exibirMensagem(`Leilão iniciado para ${novoPokemon.nome}! Faça sua oferta.`);
  }
}

function darLance(jogador) {
  const inputValor = document.getElementById('valor-lance');
  if (!inputValor) return;
  const valorDigitado = parseInt(inputValor.value);

  if (isNaN(valorDigitado) || valorDigitado <= 0) return;

  if (salaRef) {
    if (jogador !== meuNumeroJogador) {
      exibirMensagem("Você só pode dar lances no seu próprio botão!");
      return;
    }

    salaRef.once("value").then((snapshot) => {
      const dados = snapshot.val();
      if (!dados || !dados.pokemonAtual) {
        exibirMensagem("Sorteie um Pokémon antes de dar um lance!");
        return;
      }

      const timeAtual = jogador === 1 ? (dados.time1 || []) : (dados.time2 || []);
      if (timeAtual.length >= 6) {
        exibirMensagem("Seu time já está cheio! (Máximo de 6 Pokémon)");
        return;
      }

      const saldoAtual = jogador === 1 ? dados.saldoJ1 : dados.saldoJ2;
      const nomeJogador = jogador === 1 ? dados.jogador1 : dados.jogador2;

      if (valorDigitado <= (dados.lanceAtual || 0)) {
        exibirMensagem(`O lance precisa ser maior que R$ ${dados.lanceAtual || 0}!`);
        return;
      }

      if (valorDigitado > saldoAtual) {
        exibirMensagem(`${nomeJogador} não tem saldo suficiente!`);
        return;
      }

      inputValor.value = '';

      salaRef.update({
        lanceAtual: valorDigitado,
        quemDeuMaiorLance: jogador,
        mensagem: `${nomeJogador} assumiu o leilão com R$ ${valorDigitado}!`,
        ultimaAtualizacao: Date.now()
      });
    });
  } else {
    if (!leilaoAtual.pokemon) {
      exibirMensagem("Sorteie um Pokémon antes de dar um lance!");
      return;
    }

    const timeAtual = jogador === 1 ? leilaoAtual.time1 : leilaoAtual.time2;
    if (timeAtual.length >= 6) {
      exibirMensagem("Seu time já está cheio! (Máximo de 6 Pokémon)");
      return;
    }

    const elemSaldo1 = document.getElementById('saldo-j1');
    const elemSaldo2 = document.getElementById('saldo-j2');
    
    let saldo1 = parseInt(elemSaldo1.innerText);
    let saldo2 = parseInt(elemSaldo2.innerText);

    const saldoAtual = jogador === 1 ? saldo1 : saldo2;
    const nomeJogador = jogador === 1 ? meuNome : nomeJ2Local;

    if (valorDigitado <= leilaoAtual.lanceAtual) {
      exibirMensagem(`O lance precisa ser maior que R$ ${leilaoAtual.lanceAtual}!`);
      return;
    }

    if (valorDigitado > saldoAtual) {
      exibirMensagem(`${nomeJogador} não tem saldo suficiente!`);
      return;
    }

    leilaoAtual.lanceAtual = valorDigitado;
    leilaoAtual.quemDeuMaiorLance = jogador;

    inputValor.value = '';
    exibirMensagem(`${nomeJogador} assumiu o leilão com R$ ${valorDigitado}!`);
  }
}

function desistir() {
  if (salaRef) {
    salaRef.once("value").then((snapshot) => {
      const dados = snapshot.val();
      if (!dados || !dados.pokemonAtual || !dados.quemDeuMaiorLance) {
        exibirMensagem("Não há nenhum lance ativo para arrematar!");
        return;
      }

      if (dados.quemDeuMaiorLance === meuNumeroJogador) {
        exibirMensagem("Você não pode desistir da sua própria oferta! Aguarde o oponente.");
        return;
      }

      finalizarVenda(dados.quemDeuMaiorLance, dados.lanceAtual);
    });
  } else {
    if (!leilaoAtual.pokemon || !leilaoAtual.quemDeuMaiorLance) {
      exibirMensagem("Não há nenhum lance ativo para arrematar!");
      return;
    }

    const jogadorVencedor = leilaoAtual.quemDeuMaiorLance;
    const valorFinal = leilaoAtual.lanceAtual;
    const pkmComprado = { ...leilaoAtual.pokemon, valor: valorFinal };

    const elemSaldo1 = document.getElementById('saldo-j1');
    const elemSaldo2 = document.getElementById('saldo-j2');

    let saldo1 = parseInt(elemSaldo1.innerText);
    let saldo2 = parseInt(elemSaldo2.innerText);

    if (jogadorVencedor === 1) {
      saldo1 -= valorFinal;
      elemSaldo1.innerText = saldo1;
      leilaoAtual.time1.push(pkmComprado);
      atualizarHTMLTime(1, leilaoAtual.time1, meuNome);
    } else {
      saldo2 -= valorFinal;
      elemSaldo2.innerText = saldo2;
      leilaoAtual.time2.push(pkmComprado);
      atualizarHTMLTime(2, leilaoAtual.time2, nomeJ2Local);
    }

    const nomeVencedor = jogadorVencedor === 1 ? meuNome : nomeJ2Local;
    exibirMensagem(`🎉 VENDIDO! ${nomeVencedor} comprou ${pkmComprado.nome} por R$ ${valorFinal}!`);

    leilaoAtual.pokemon = null;
    leilaoAtual.lanceAtual = 0;
    leilaoAtual.quemDeuMaiorLance = null;
    limparTelaPokemon();

    if (leilaoAtual.time1.length >= 6 && leilaoAtual.time2.length >= 6) {
      exibirMensagem(`⚔️ Times completos! Abrindo painel de organização...`);
      setTimeout(() => {
        abrirModalOrganizacao(leilaoAtual.time1, meuNome);
      }, 1500);
    }
  }
}

async function finalizarVenda(jogadorVencedor, valorFinal) {
  if (!salaRef) return;

  salaRef.once("value").then(async (snapshot) => {
    const dados = snapshot.val();
    let pkmFinal = dados.pokemonAtual;
    pkmFinal.valor = valorFinal;

    let novoSaldoJ1 = dados.saldoJ1;
    let novoSaldoJ2 = dados.saldoJ2;
    let time1 = dados.time1 || [];
    let time2 = dados.time2 || [];

    if (jogadorVencedor === 1) {
      novoSaldoJ1 -= valorFinal;
      time1.push(pkmFinal);
    } else {
      novoSaldoJ2 -= valorFinal;
      time2.push(pkmFinal);
    }

    const nomeVencedor = jogadorVencedor === 1 ? dados.jogador1 : dados.jogador2;

    // QUANDO OS TIMES ATINGEM 6, INICIALIZA OS CAMPOS DE ORGANIZAÇÃO NO FIREBASE
    if (time1.length >= 6 && time2.length >= 6) {
      salaRef.update({
        saldoJ1: novoSaldoJ1,
        saldoJ2: novoSaldoJ2,
        time1: time1,
        time2: time2,
        time1Organizado: null,
        time2Organizado: null,
        pokemonAtual: null,
        lanceAtual: 0,
        quemDeuMaiorLance: null,
        mensagem: `🎉 FIM DO LEILÃO! ${nomeVencedor} comprou ${pkmFinal.nome}! Times completos!`,
        ultimaAtualizacao: Date.now()
      });
      return;
    }

    exibirMensagem(`🎉 VENDIDO para ${nomeVencedor}! Sorteando o próximo...`);
    const proximoPokemon = await buscarProximoPokemonValido();

    salaRef.update({
      saldoJ1: novoSaldoJ1,
      saldoJ2: novoSaldoJ2,
      time1: time1,
      time2: time2,
      pokemonAtual: proximoPokemon,
      lanceAtual: 0,
      quemDeuMaiorLance: null,
      mensagem: `🎉 VENDIDO! ${nomeVencedor} comprou ${pkmFinal.nome} por R$ ${valorFinal}! Leilão aberto para ${proximoPokemon.nome}!`,
      ultimaAtualizacao: Date.now()
    });
  });
}

// ==========================================
// 7. MÓDULO DE ORGANIZAÇÃO DA ORDEM DO TIME
// ==========================================
let meuTimeOrganizado = [];

function abrirModalOrganizacao(timeOriginal, nomeJogador) {
  let modalOrg = document.getElementById('modal-organizar');
  if (!modalOrg) {
    const divModal = document.createElement('div');
    divModal.id = 'modal-organizar';
    divModal.style.cssText = "display: flex; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 999; justify-content: center; align-items: center; padding: 10px; box-sizing: border-box;";
    divModal.innerHTML = `
      <div style="background: #222; padding: 20px; border-radius: 12px; width: 100%; max-width: 450px; text-align: center; color: white; border: 2px solid #ffcb05; box-shadow: 0 0 20px rgba(255,203,5,0.5); display: flex; flex-direction: column; max-height: 90vh;">
        <h2 style="font-size: 1.2rem; margin-bottom: 8px;">🏆 Organizar Ordem de Batalha</h2>
        <p style="font-size: 12px; color: #ccc; margin-bottom: 12px;">Use as setas para definir quem vai primeiro (1º) até o último (6º).</p>
        
        <div id="lista-organizacao" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; overflow-y: auto; flex-grow: 1; padding-right: 5px;"></div>
        
        <button onclick="confirmarOrdemTime()" style="background: #4caf50; color: white; border: none; padding: 10px; font-weight: bold; border-radius: 5px; cursor: pointer; font-size: 14px; width: 100%;">Confirmar Ordem e Ir para Batalha</button>
      </div>
    `;
    document.body.appendChild(divModal);
    modalOrg = divModal;
  }

  modalOrg.style.display = 'flex';
  meuTimeOrganizado = [...timeOriginal];
  renderizarListaOrganizacao();
}

function renderizarListaOrganizacao() {
  const lista = document.getElementById('lista-organizacao');
  if (!lista) return;

  lista.innerHTML = "";
  meuTimeOrganizado.forEach((pkm, index) => {
    lista.innerHTML += `
      <div style="display: flex; align-items: center; justify-content: space-between; background: #333; padding: 8px 12px; border-radius: 6px; border: 1px solid #555;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: bold; color: #ffcb05; width: 25px;">#${index + 1}</span>
          <img src="${pkm.imagem}" style="width: 40px; height: 40px; object-fit: contain;">
          <span style="font-size: 14px; font-weight: bold;">${pkm.nome}</span>
        </div>
        <div style="display: flex; gap: 5px;">
          <button onclick="moverPokemon(${index}, -1)" style="background: #555; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;" ${index === 0 ? 'disabled style="opacity: 0.3;"' : ''}>⬆️</button>
          <button onclick="moverPokemon(${index}, 1)" style="background: #555; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;" ${index === meuTimeOrganizado.length - 1 ? 'disabled style="opacity: 0.3;"' : ''}>⬇️</button>
        </div>
      </div>
    `;
  });
}

function moverPokemon(index, direcao) {
  const novoIndex = index + direcao;
  if (novoIndex < 0 || novoIndex >= meuTimeOrganizado.length) return;

  const temp = meuTimeOrganizado[index];
  meuTimeOrganizado[index] = meuTimeOrganizado[novoIndex];
  meuTimeOrganizado[novoIndex] = temp;

  renderizarListaOrganizacao();
}

// Substitua a função confirmarOrdemTime inteira no seu script.js por esta:
function confirmarOrdemTime() {
  const modal = document.getElementById('modal-organizar');
  if (modal) modal.style.display = 'none';

  if (salaRef) {
    const campoAtualizar = meuNumeroJogador === 1 ? { time1Organizado: meuTimeOrganizado } : { time2Organizado: meuTimeOrganizado };
    salaRef.update(campoAtualizar);
    exibirMensagem("Ordem salva! Aguardando o oponente organizar o time...");
  } else {
    // MODO LOCAL (1 TELA)
    // Se o Jogador 1 acabou de organizar, guardamos o time dele e abrimos para o Jogador 2
    if (!window.time1OrganizadoLocal) {
      window.time1OrganizadoLocal = [...meuTimeOrganizado];
      exibirMensagem(`Agora é a vez de ${nomeJ2Local} organizar o time!`);
      setTimeout(() => {
        abrirModalOrganizacao(leilaoAtual.time2, nomeJ2Local);
      }, 500);
    } else {
      // Se o Jogador 2 acabou de organizar, temos os dois times prontos!
      const time1Pronto = window.time1OrganizadoLocal;
      const time2Pronto = [...meuTimeOrganizado];
      window.time1OrganizadoLocal = null; // limpa para futuros jogos
      iniciarBatalhaAutomatica(time1Pronto, time2Pronto, meuNome, nomeJ2Local);
    }
  }
}