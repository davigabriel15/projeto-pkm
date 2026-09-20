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
let meuNome = localStorage.getItem('pkm_meu_nome') || "Jogador";
let codigoSala = localStorage.getItem('pkm_sala_id') || "SALA1";
let modoJogo = localStorage.getItem('pkm_modo') || "padrao";
let estagioEvolucao = localStorage.getItem('pkm_estagio') || "normal";

let saldoInicial = modoJogo === "pobre" ? 20 : 100;
let limitePokemon = modoJogo === "rapido" ? 3 : 6;

let meuNumeroJogador = null; // Definido ao entrar na sala (1 ou 2)
let database = null;
let salaRef = null;

// Conecta ao Firebase
try {
  if (typeof firebase !== "undefined") {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    salaRef = database.ref(`salas/${codigoSala}`);
  }
} catch (e) {
  console.warn("Erro ao conectar no Firebase:", e);
}

// 2. CONECTAR NA SALA E REGISTRAR JOGADOR
document.addEventListener("DOMContentLoaded", () => {
  exibirCodigoSala();

  if (!salaRef) return;

  salaRef.once("value").then((snapshot) => {
    const dados = snapshot.val() || {};

    // Identifica se você é o Jogador 1 ou 2 na sala
    if (!dados.jogador1) {
      meuNumeroJogador = 1;
      salaRef.update({
        jogador1: meuNome,
        saldoJ1: saldoInicial,
        time1: [],
        modo: modoJogo,
        estagio: estagioEvolucao
      });
    } else if (dados.jogador1 === meuNome) {
      meuNumeroJogador = 1;
    } else if (!dados.jogador2) {
      meuNumeroJogador = 2;
      salaRef.update({
        jogador2: meuNome,
        saldoJ2: saldoInicial,
        time2: []
      });
    } else if (dados.jogador2 === meuNome) {
      meuNumeroJogador = 2;
    } else {
      alert("Esta sala já está cheia com 2 jogadores!");
      window.location.href = 'index.html';
      return;
    }

    escutarAtualizacoesSala();
  });
});

function exibirCodigoSala() {
  const elemSala = document.getElementById('codigo-sala-display');
  if (elemSala) elemSala.innerText = `SALA: ${codigoSala}`;
}

// 3. ESCUTAR MUDANÇAS NA SALA EM TEMPO REAL
function escutarAtualizacoesSala() {
  salaRef.on("value", (snapshot) => {
    const dados = snapshot.val();
    if (!dados) return;

    // Atualiza nomes na tela
    const elemJ1 = document.getElementById('titulo-j1');
    const elemJ2 = document.getElementById('titulo-j2');
    if (elemJ1) elemJ1.innerText = dados.jogador1 || "Aguardando Jogador 1...";
    if (elemJ2) elemJ2.innerText = dados.jogador2 || "Aguardando Jogador 2...";

    // Atualiza saldos
    if (document.getElementById('saldo-j1')) document.getElementById('saldo-j1').innerText = dados.saldoJ1 ?? saldoInicial;
    if (document.getElementById('saldo-j2')) document.getElementById('saldo-j2').innerText = dados.saldoJ2 ?? saldoInicial;

    // Atualiza Pokémon do leilão
    if (dados.pokemonAtual) {
      atualizarTelaPokemon(dados.pokemonAtual);
    }

    if (dados.mensagem) {
      exibirMensagem(dados.mensagem);
    }

    // Atualiza os times exibidos
    atualizarHTMLTime(1, dados.time1 || []);
    atualizarHTMLTime(2, dados.time2 || []);
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

function atualizarHTMLTime(num, lista) {
  const timeElem = document.querySelector(`.time${num}`);
  if (!timeElem) return;

  let html = "";
  lista.forEach(pkm => {
    html += `<img src="${pkm.imagem}" alt="${pkm.nome}" class="pkm-time" title="${pkm.nome} (R$${pkm.valor})">`;
  });
  timeElem.innerHTML = html;
}

// Busca evolução final na PokéAPI
async function obterEvolucaoFinal(pokemonId) {
  try {
    const resEspecie = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
    const dadosEspecie = await resEspecie.json();

    const resCadeia = await fetch(dadosEspecie.evolution_chain.url);
    const dadosCadeia = await resCadeia.json();

    let noAtual = dadosCadeia.chain;
    while (noAtual.evolves_to && noAtual.evolves_to.length > 0) {
      const idx = Math.floor(Math.random() * noAtual.evolves_to.length);
      noAtual = noAtual.evolves_to[idx];
    }

    const resFinal = await fetch(`https://pokeapi.co/api/v2/pokemon/${noAtual.species.name}`);
    const dadosFinal = await resFinal.json();

    return {
      id: dadosFinal.id,
      nome: dadosFinal.name.toUpperCase(),
      imagem: dadosFinal.sprites.other['official-artwork'].front_default
    };
  } catch (erro) {
    console.error("Erro na evolução:", erro);
    return null;
  }
}

// 4. AÇÕES DO LEILÃO (SORTEAR, LANCE, DESISTIR, FINALIZAR)
async function sortearPokemon() {
  if (!salaRef) return;

  exibirMensagem("Sorteando novo Pokémon para o leilão...");
  const idAleatorio = Math.floor(Math.random() * 1025) + 1;

  try {
    const resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${idAleatorio}`);
    const dados = await resposta.json();

    const novoPokemon = {
      id: dados.id,
      nome: dados.name.toUpperCase(),
      imagem: dados.sprites.other['official-artwork'].front_default
    };

    salaRef.update({
      pokemonAtual: novoPokemon,
      lanceAtual: 0,
      quemDeuMaiorLance: null,
      mensagem: `Leilão iniciado para ${novoPokemon.nome}! Faça sua oferta.`
    });

  } catch (erro) {
    console.error("Erro ao sortear:", erro);
    exibirMensagem("Erro ao carregar o Pokémon. Tente novamente.");
  }
}

function darLance(jogador) {
  if (!salaRef) return;

  if (jogador !== meuNumeroJogador) {
    exibirMensagem("Aguarde a vez de cada jogador ou use seus botões!");
    return;
  }

  salaRef.once("value").then((snapshot) => {
    const dados = snapshot.val();
    if (!dados || !dados.pokemonAtual) return;

    const inputValor = document.getElementById('valor-lance');
    if (!inputValor) return;

    const valorDigitado = parseInt(inputValor.value);
    const saldoAtual = jogador === 1 ? dados.saldoJ1 : dados.saldoJ2;
    const nomeJogador = jogador === 1 ? dados.jogador1 : dados.jogador2;

    if (isNaN(valorDigitado) || valorDigitado <= 0) return;

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
      mensagem: `${nomeJogador} assumiu o leilão com R$ ${valorDigitado}!`
    });
  });
}

function desistir() {
  if (!salaRef) return;

  salaRef.once("value").then((snapshot) => {
    const dados = snapshot.val();
    if (!dados || !dados.pokemonAtual || !dados.quemDeuMaiorLance) {
      exibirMensagem("Não há lance ativo para desistir!");
      return;
    }
    finalizarVenda(dados.quemDeuMaiorLance, dados.lanceAtual);
  });
}

async function finalizarVenda(jogadorVencedor, valorFinal) {
  salaRef.once("value").then(async (snapshot) => {
    const dados = snapshot.val();
    let pkmFinal = dados.pokemonAtual;

    if (dados.estagio === "final") {
      salaRef.update({ mensagem: `Processando evolução final de ${pkmFinal.nome}...` });
      const evo = await obterEvolucaoFinal(pkmFinal.id);
      if (evo) pkmFinal = evo;
    }

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
      mensagem: `🎉 VENDIDO! ${nomeVencedor} comprou ${pkmFinal.nome} por R$ ${valorFinal}!`
    });
  });
}