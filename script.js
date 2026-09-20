// ==========================================
// 1. CARREGAR DADOS DA TELA INICIAL
// ==========================================
let nomeJ1 = localStorage.getItem('pkm_jogador1') || "Jogador 1";
let nomeJ2 = localStorage.getItem('pkm_jogador2') || "Jogador 2";
let modoJogo = localStorage.getItem('pkm_modo') || "padrao";
let estagioEvolucao = localStorage.getItem('pkm_estagio') || "normal"; // "normal" ou "final"

// Configura o saldo inicial de acordo com o modo
let saldoInicial = 100;
if (modoJogo === "pobre") {
    saldoInicial = 20;
}

let saldoJ1 = saldoInicial;
let saldoJ2 = saldoInicial;

// Configura o limite de Pokémon no time
let limitePokemon = modoJogo === "rapido" ? 3 : 6;

// Variáveis de estado do jogo
let pokemonAtual = null;
let lanceAtual = 0;
let quemDeuMaiorLance = null;

// Inicializa a interface quando o HTML carregar
document.addEventListener("DOMContentLoaded", () => {
    const elemJ1 = document.getElementById('titulo-j1');
    const elemJ2 = document.getElementById('titulo-j2');
    
    if (elemJ1) elemJ1.innerText = nomeJ1;
    if (elemJ2) elemJ2.innerText = nomeJ2;

    const elemSaldo1 = document.getElementById('saldo-j1');
    const elemSaldo2 = document.getElementById('saldo-j2');
    if (elemSaldo1) elemSaldo1.innerText = saldoJ1;
    if (elemSaldo2) elemSaldo2.innerText = saldoJ2;

    exibirMensagem(`Bem-vindos ${nomeJ1} e ${nomeJ2}! Sorteiem o primeiro Pokémon.`);
});

// ==========================================
// 2. FUNÇÕES AUXILIARES
// ==========================================
function exibirMensagem(texto) {
    const divSituacao = document.querySelector('.situacao');
    if (divSituacao) {
        divSituacao.innerHTML = `<p>${texto}</p>`;
    }
}

function obterQtdPokemon(timeNumero) {
    const time = document.querySelector(`.time${timeNumero}`);
    if (!time) return 0;
    return time.querySelectorAll('.pkm-time').length;
}

// Busca a evolução final na PokéAPI
async function obterEvolucaoFinal(pokemonId) {
    try {
        // 1. Busca a espécie para pegar a URL da cadeia de evolução
        const resEspecie = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
        const dadosEspecie = await resEspecie.json();
        
        // 2. Busca a cadeia de evolução completa
        const resCadeia = await fetch(dadosEspecie.evolution_chain.url);
        const dadosCadeia = await resCadeia.json();

        // 3. Navega até o último estágio disponível da linha evolutiva
        let noAtual = dadosCadeia.chain;
        while (noAtual.evolves_to && noAtual.evolves_to.length > 0) {
            // Caso existam várias evoluções (ex: Eevee), pega a primeira da lista
            noAtual = noAtual.evolves_to[0];
        }

        // 4. Busca os dados do Pokémon final para pegar a artwork oficial
        const nomeFinal = noAtual.species.name;
        const resFinal = await fetch(`https://pokeapi.co/api/v2/pokemon/${nomeFinal}`);
        const dadosFinal = await resFinal.json();

        return {
            nome: dadosFinal.name.toUpperCase(),
            imagem: dadosFinal.sprites.other['official-artwork'].front_default
        };
    } catch (erro) {
        console.error("Erro ao buscar evolução final:", erro);
        // Em caso de erro na API, retorna os dados normais
        return pokemonAtual;
    }
}

// ==========================================
// 3. FUNÇÃO DE SORTEIO
// ==========================================
async function sortearPokemon() {
    const qtdJ1 = obterQtdPokemon(1);
    const qtdJ2 = obterQtdPokemon(2);

    if (qtdJ1 >= limitePokemon && qtdJ2 >= limitePokemon) {
        exibirMensagem(`🏆 O LEILÃO ACABOU! Ambos os times atingiram o limite de ${limitePokemon} Pokémon!`);
        return;
    }

    lanceAtual = 0;
    quemDeuMaiorLance = null;
    
    const nomeElement = document.getElementById('pokemon-nome');
    if (nomeElement) nomeElement.innerText = "Sorteando...";

    exibirMensagem("Sorteando novo Pokémon para o leilão...");

    const idAleatorio = Math.floor(Math.random() * 1025) + 1;

    try {
        const resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${idAleatorio}`);
        const dados = await resposta.json();

        pokemonAtual = {
            id: dados.id,
            nome: dados.name.toUpperCase(),
            imagem: dados.sprites.other['official-artwork'].front_default
        };

        const imgElement = document.getElementById('pokemon-img');
        if (imgElement) {
            imgElement.src = pokemonAtual.imagem;
            imgElement.style.display = 'block';
        }
        
        if (nomeElement) {
            nomeElement.innerText = `#${pokemonAtual.id} - ${pokemonAtual.nome}`;
        }

        if (qtdJ1 >= limitePokemon) {
            exibirMensagem(`Time de ${nomeJ1} cheio! Apenas ${nomeJ2} pode dar lances para ${pokemonAtual.nome}.`);
        } else if (qtdJ2 >= limitePokemon) {
            exibirMensagem(`Time de ${nomeJ2} cheio! Apenas ${nomeJ1} pode dar lances para ${pokemonAtual.nome}.`);
        } else {
            exibirMensagem(`Leilão iniciado para ${pokemonAtual.nome}! Faça sua oferta.`);
        }

    } catch (erro) {
        console.error("Erro ao buscar Pokémon:", erro);
        exibirMensagem("Falha ao carregar o Pokémon. Tente novamente!");
    }
}

// ==========================================
// 4. LANCES E FINALIZAÇÃO
// ==========================================
function darLance(jogador) {
    if (!pokemonAtual) {
        exibirMensagem("Sorteie um Pokémon primeiro!");
        return;
    }

    const qtdJ1 = obterQtdPokemon(1);
    const qtdJ2 = obterQtdPokemon(2);
    const nomeJogador = jogador === 1 ? nomeJ1 : nomeJ2;

    if (jogador === 1 && qtdJ1 >= limitePokemon) {
        exibirMensagem(`${nomeJ1} já tem ${limitePokemon} Pokémon! Seu time está completo.`);
        return;
    }
    if (jogador === 2 && qtdJ2 >= limitePokemon) {
        exibirMensagem(`${nomeJ2} já tem ${limitePokemon} Pokémon! Seu time está completo.`);
        return;
    }

    const inputValor = document.getElementById('valor-lance');
    if (!inputValor) return;

    const valorDigitado = parseInt(inputValor.value);

    if (isNaN(valorDigitado) || valorDigitado <= 0) {
        exibirMensagem("Digite um valor válido para o lance!");
        return;
    }

    if (valorDigitado <= lanceAtual) {
        exibirMensagem(`O lance deve ser maior que o lance atual (R$ ${lanceAtual})!`);
        return;
    }

    const saldoDisponivel = (jogador === 1) ? saldoJ1 : saldoJ2;
    if (valorDigitado > saldoDisponivel) {
        exibirMensagem(`${nomeJogador} não tem saldo suficiente! Saldo disponível: R$ ${saldoDisponivel}`);
        return;
    }

    lanceAtual = valorDigitado;
    quemDeuMaiorLance = jogador;
    inputValor.value = '';

    if ((jogador === 1 && qtdJ2 >= limitePokemon) || (jogador === 2 && qtdJ1 >= limitePokemon)) {
        finalizarVenda(jogador, lanceAtual);
        return;
    }

    exibirMensagem(`${nomeJogador} assumiu o leilão com R$ ${lanceAtual}!`);
}

function desistir() {
    if (!pokemonAtual || quemDeuMaiorLance === null) {
        exibirMensagem("Não há nenhum lance ativo para desistir!");
        return;
    }

    const jogadorVencedor = quemDeuMaiorLance;
    finalizarVenda(jogadorVencedor, lanceAtual);
}

async function finalizarVenda(jogadorVencedor, valorFinal) {
    const nomeVencedor = jogadorVencedor === 1 ? nomeJ1 : nomeJ2;
    let pokemonParaAdicionar = pokemonAtual;

    // Se a opção de evolução final estiver ativada, busca os dados da evolução final
    if (estagioEvolucao === "final") {
        exibirMensagem(`Processando evolução final de ${pokemonAtual.nome}...`);
        pokemonParaAdicionar = await obterEvolucaoFinal(pokemonAtual.id);
    }

    if (jogadorVencedor === 1) {
        saldoJ1 -= valorFinal;
        document.getElementById('saldo-j1').innerText = saldoJ1;
        
        const time1 = document.querySelector('.time1');
        if (time1) {
            time1.innerHTML += `<img src="${pokemonParaAdicionar.imagem}" alt="${pokemonParaAdicionar.nome}" class="pkm-time" title="${pokemonParaAdicionar.nome} (R$${valorFinal})">`;
        }
    } else {
        saldoJ2 -= valorFinal;
        document.getElementById('saldo-j2').innerText = saldoJ2;
        
        const time2 = document.querySelector('.time2');
        if (time2) {
            time2.innerHTML += `<img src="${pokemonParaAdicionar.imagem}" alt="${pokemonParaAdicionar.nome}" class="pkm-time" title="${pokemonParaAdicionar.nome} (R$${valorFinal})">`;
        }
    }

    exibirMensagem(`🎉 VENDIDO! ${nomeVencedor} comprou ${pokemonParaAdicionar.nome} por R$ ${valorFinal}!`);

    setTimeout(() => {
        sortearPokemon();
    }, 2500);
}