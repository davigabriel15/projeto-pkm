// ==========================================
// 1. VARIÁVEIS GLOBAIS DE ESTADO
// ==========================================
let pokemonAtual = null;
let saldoJ1 = 100;
let saldoJ2 = 100;
let lanceAtual = 0;
let quemDeuMaiorLance = null;

// ==========================================
// 2. FUNÇÃO AUXILIAR DE MENSAGENS NA TELA
// ==========================================
function exibirMensagem(texto) {
    const divSituacao = document.querySelector('.situacao');
    if (divSituacao) {
        divSituacao.innerHTML = `<p>${texto}</p>`;
    }
}

// ==========================================
// 3. VERIFICAR QUANTIDADE DE POKÉMON NOS TIMES
// ==========================================
function obterQtdPokemon(timeNumero) {
    const time = document.querySelector(`.time${timeNumero}`);
    if (!time) return 0;
    return time.querySelectorAll('.pkm-time').length;
}

// ==========================================
// 4. FUNÇÃO DE SORTEIO
// ==========================================
async function sortearPokemon() {
    const qtdJ1 = obterQtdPokemon(1);
    const qtdJ2 = obterQtdPokemon(2);

    // Se ambos já têm 6 Pokémon, o leilão acabou!
    if (qtdJ1 >= 6 && qtdJ2 >= 6) {
        exibirMensagem("🏆 O LEILÃO ACABOU! Ambos os times têm 6 Pokémon!");
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

        // Avisa de quem é a vez caso um time já esteja cheio
        if (qtdJ1 >= 6) {
            exibirMensagem(`Time 1 cheio! Apenas o Jogador 2 pode dar lances para ${pokemonAtual.nome}.`);
        } else if (qtdJ2 >= 6) {
            exibirMensagem(`Time 2 cheio! Apenas o Jogador 1 pode dar lances para ${pokemonAtual.nome}.`);
        } else {
            exibirMensagem(`Leilão iniciado para ${pokemonAtual.nome}! Faça sua oferta.`);
        }

    } catch (erro) {
        console.error("Erro ao buscar Pokémon:", erro);
        exibirMensagem("Falha ao carregar o Pokémon. Tente novamente!");
    }
}

// ==========================================
// 5. REGRA DE LANCES E COMPRA
// ==========================================
function darLance(jogador) {
    if (!pokemonAtual) {
        exibirMensagem("Sorteie um Pokémon primeiro!");
        return;
    }

    const qtdJ1 = obterQtdPokemon(1);
    const qtdJ2 = obterQtdPokemon(2);

    // Validação 0: Time do jogador já está cheio
    if (jogador === 1 && qtdJ1 >= 6) {
        exibirMensagem("Jogador 1 já tem 6 Pokémon! Seu time está completo.");
        return;
    }
    if (jogador === 2 && qtdJ2 >= 6) {
        exibirMensagem("Jogador 2 já tem 6 Pokémon! Seu time está completo.");
        return;
    }

    const inputValor = document.getElementById('valor-lance');
    if (!inputValor) return;

    const valorDigitado = parseInt(inputValor.value);

    // Validação 1: Valor válido
    if (isNaN(valorDigitado) || valorDigitado <= 0) {
        exibirMensagem("Digite um valor válido para o lance!");
        return;
    }

    // Validação 2: Lance maior que o atual
    if (valorDigitado <= lanceAtual) {
        exibirMensagem(`O lance deve ser maior que o lance atual (R$ ${lanceAtual})!`);
        return;
    }

    // Validação 3: Saldo suficiente
    const saldoDisponivel = (jogador === 1) ? saldoJ1 : saldoJ2;
    if (valorDigitado > saldoDisponivel) {
        exibirMensagem(`Jogador ${jogador} não tem saldo suficiente! Saldo: R$ ${saldoDisponivel}`);
        return;
    }

    // Atualiza o estado
    lanceAtual = valorDigitado;
    quemDeuMaiorLance = jogador;
    inputValor.value = '';

    // Regra especial: Se o outro time JÁ ESTÁ CHEIO, a compra é direta pois não há disputa!
    if ((jogador === 1 && qtdJ2 >= 6) || (jogador === 2 && qtdJ1 >= 6)) {
        finalizarVenda(jogador, lanceAtual);
        return;
    }

    exibirMensagem(`Jogador ${jogador} assumiu o leilão com R$ ${lanceAtual}!`);
}

function desistir() {
    if (!pokemonAtual || quemDeuMaiorLance === null) {
        exibirMensagem("Não há nenhum lance ativo para desistir!");
        return;
    }

    const jogadorVencedor = quemDeuMaiorLance;
    finalizarVenda(jogadorVencedor, lanceAtual);
}

function finalizarVenda(jogadorVencedor, valorFinal) {
    if (jogadorVencedor === 1) {
        saldoJ1 -= valorFinal;
        document.getElementById('saldo-j1').innerText = saldoJ1;
        
        const time1 = document.querySelector('.time1');
        if (time1) {
            time1.innerHTML += `<img src="${pokemonAtual.imagem}" alt="${pokemonAtual.nome}" class="pkm-time" title="${pokemonAtual.nome} (R$${valorFinal})">`;
        }
    } else {
        saldoJ2 -= valorFinal;
        document.getElementById('saldo-j2').innerText = saldoJ2;
        
        const time2 = document.querySelector('.time2');
        if (time2) {
            time2.innerHTML += `<img src="${pokemonAtual.imagem}" alt="${pokemonAtual.nome}" class="pkm-time" title="${pokemonAtual.nome} (R$${valorFinal})">`;
        }
    }

    exibirMensagem(`🎉 VENDIDO! Jogador ${jogadorVencedor} comprou ${pokemonAtual.nome} por R$ ${valorFinal}!`);

    // Sorteia o próximo após 2.5 segundos
    setTimeout(() => {
        sortearPokemon();
    }, 2500);
}