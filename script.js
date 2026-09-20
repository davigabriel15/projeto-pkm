// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAMyxe2W8c05Tr0dR63PNIqOHKBEXSVe4w",
  authDomain: "pkm-multiplayer.firebaseapp.com",
  databaseURL: "https://pkm-multiplayer-default-rtdb.firebaseio.com",
  projectId: "pkm-multiplayer",
  storageBucket: "pkm-multiplayer.firebasestorage.app",
  messagingSenderId: "1088629364702",
  appId: "1:1088629364702:web:9242cefd258cf72922ef4f",
  measurementId: "G-39JTEX5N8J"
};

// 1. CARREGAR DADOS DA SESSÃO LOCAL
let meuNome = localStorage.getItem('pkm_meu_nome') || localStorage.getItem('pkm_jogador1') || "Jogador 1";
let nomeJ2Local = localStorage.getItem('pkm_jogador2') || "Jogador 2";
let codigoSala = localStorage.getItem('pkm_sala_id') || "";
let modoJogo = localStorage.getItem('pkm_modo') || "padrao";
let estagioEvolucao = localStorage.getItem('pkm_estagio') || "normal";

let saldoInicial = modoJogo === "pobre" ? 20 : 100;
let meuNumeroJogador = null; // 1 ou 2 (Online)

let database = null;
let salaRef = null;

// Controle de Leilão para MODO LOCAL
let leilaoAtual = {
  pokemon: null,
  lanceAtual: 0,
  quemDeuMaiorLance: null,
  time1: [],
  time2: []
};

// Tenta conectar ao Firebase se houver código de sala
try {
  if (typeof firebase !== "undefined" && codigoSala) {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    salaRef = database.ref(`salas/${codigoSala}`);
  }
} catch (e) {
  console.warn("Modo Local ativo ou erro no Firebase:", e);
}

// 2. CONECTAR E CONFIGURAR INTERFACE
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

// 3. ESCUTAR MUDANÇAS NA SALA EM TEMPO REAL (ONLINE)
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

  timeElem.innerHTML = `<h2 id="titulo-j${num}">${nomeJogador}</h2>${htmlImagens}`;
}

// 4. VERIFICAÇÃO DE ESTÁGIO DE EVOLUÇÃO
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
    console.error("Erro ao verificar se é evolução final:", e);
    return false;
  }
}

// 5. AÇÕES DO LEILÃO
async function sortearPokemon() {
  exibirMensagem("Sorteando novo Pokémon para o leilão...");

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

      if (estagioEvolucao === "primeiro") {
        if (!dadosEspecie.evolves_from_species) {
          pokemonValido = true;
        }
      } else if (estagioEvolucao === "finais") {
        const ehFinal = await ehEvolucaoFinal(idAleatorio);
        if (ehFinal) {
          pokemonValido = true;
        }
      } else if (estagioEvolucao === "lendarios") {
        if (dadosEspecie.is_legendary || dadosEspecie.is_mythical) {
          pokemonValido = true;
        }
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
      console.warn("Tentativa de sorteio falhou, tentando outro ID...", erro);
    }
  }

  if (!novoPokemon) {
    exibirMensagem("Erro ao encontrar um Pokémon com o filtro selecionado. Tente novamente.");
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
    // MODO ONLINE
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
    // MODO LOCAL
    if (!leilaoAtual.pokemon) {
      exibirMensagem("Sorteie um Pokémon antes de dar um lance!");
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
    // MODO ONLINE
    salaRef.once("value").then((snapshot) => {
      const dados = snapshot.val();
      if (!dados || !dados.pokemonAtual || !dados.quemDeuMaiorLance) {
        exibirMensagem("Não há nenhum lance ativo para arrematar!");
        return;
      }
      finalizarVenda(dados.quemDeuMaiorLance, dados.lanceAtual);
    });
  } else {
    // MODO LOCAL
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

    // Reseta o estado local do leilão
    leilaoAtual.pokemon = null;
    leilaoAtual.lanceAtual = 0;
    leilaoAtual.quemDeuMaiorLance = null;
    limparTelaPokemon();
  }
}

async function finalizarVenda(jogadorVencedor, valorFinal) {
  if (!salaRef) return;

  salaRef.once("value").then((snapshot) => {
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

    salaRef.update({
      saldoJ1: novoSaldoJ1,
      saldoJ2: novoSaldoJ2,
      time1: time1,
      time2: time2,
      pokemonAtual: null,
      lanceAtual: 0,
      quemDeuMaiorLance: null,
      mensagem: `🎉 VENDIDO! ${nomeVencedor} comprou ${pkmFinal.nome} por R$ ${valorFinal}!`,
      ultimaAtualizacao: Date.now()
    });
  });
}