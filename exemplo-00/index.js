import tf, { tensor2d } from '@tensorflow/tfjs-node';

async function trainModel(inputXs, outputYs) {
    const model = tf.sequential();

    // Primeira camada da rede:
    // entrada de 7 posiçoes (idade normalizada + 3 cores + 3 localizações)
    
    // 80 neuronios = aqui coloquei tudo isso, pq tem pouca base de treino
    // quando mais neuronios, mais complexa a rede, e mais dados de treino precisa
    // e consequentemente, mais processamento ela vai usar

    // A ReLU age como um  filtro
    // é como se ela deixasse somentre os dados interessantes seguirem viagem na rede
    // se a informa~c"ao chegou nesse neuronio é positiva, passa para frente:
    // se for zero ou negativa, pode jogar fora, não vai servir pra nada
    model.add(tf.layers.dense({ inputShape: [7], units: 80, activation: 'relu' }));

    // Saída: 3 neuronios, 
    // um para cada categoria (premium, medium, basic)

    // activation: softmax normaliza a saida em probabilidades
    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

    // Compilando o modelo
    // optimizer Adam (Adaptive Moment Estimation)
    // é um treinador pessoal moderno para redes neurais
    // ajusta os pesos de forma eficiente e inteligente
    // aprender com histórico de erros, e se adaptar ao longo do tempo

    // loss: categoricalCrossentropy
    // Ele compara o que o modelo "acha" (os scores de cada categoria)
    // com o que é a resposta correta (as labels one-hot encoded)
    // cadegoria premium: [1, 0, 0]
    // categoria medium: [0, 1, 0]
    // categoria basic: [0, 0, 1]

    // quanto maior a distância entre o que o modelo acha e a resposta correta, maior a perda
    // maior o erro (loss), pior o modelo está se saindo
    // Exemplo classico: classificação de imagens, onde o modelo tenta adivinhar se a imagem é de um gato, cachorro ou pássaro
    model.compile({ 
        optimizer: 'adam', 
        loss: 'categoricalCrossentropy', 
        metrics: ['accuracy'] 
    });

    // Treinamento do modelo
    // verbose: 0 para não mostrar detalhes do treinamento, mas aqui vamos mostrar a cada época
    // epochs: número de vezes que o modelo vai passar por todo o conjunto de dados de treino
    // shuffle: true para embaralhar os dados a cada época, evitando que o modelo aprenda padrões específicos da ordem dos dados
    await model.fit(
        inputXs, 
        outputYs, {
            verbose: 0,
            epochs: 100,
            shuffle: true,
            callbacks: {
               // onEpochEnd: (epoch, logs) => {
                //    console.log(`Epoch ${epoch + 1}: loss = ${logs.loss}, accuracy = ${logs.acc}`);
               // }
            }
        }
    );

    return model;
}

async function predict(model, pessoa) {
    
    // Faz a previsão usando o modelo treinado(output será um vetor de 3 probabilidades, uma para cada categoria)
    const pred = model.predict(pessoa)
    const predArray = await pred.array()
    
    return predArray[0].map((prob, index) => ({
        index,
        probabilidade: prob
    }));
}

// Exemplo de pessoas para treino (cada pessoa com idade, cor e localização)
// const pessoas = [
//     { nome: "Erick", idade: 30, cor: "azul", localizacao: "São Paulo" },
//     { nome: "Ana", idade: 25, cor: "vermelho", localizacao: "Rio" },
//     { nome: "Carlos", idade: 40, cor: "verde", localizacao: "Curitiba" }
// ];

// Vetores de entrada com valores já normalizados e one-hot encoded
// Ordem: [idade_normalizada, azul, vermelho, verde, São Paulo, Rio, Curitiba]
// const tensorPessoas = [
//     [0.33, 1, 0, 0, 1, 0, 0], // Erick
//     [0, 0, 1, 0, 0, 1, 0],    // Ana
//     [1, 0, 0, 1, 0, 0, 1]     // Carlos
// ]

// Usamos apenas os dados numéricos, como a rede neural só entende números.
// tensorPessoasNormalizado corresponde ao dataset de entrada do modelo.
const tensorPessoasNormalizado = [
    [0.33, 1, 0, 0, 1, 0, 0], // Erick
    [0, 0, 1, 0, 0, 1, 0],    // Ana
    [1, 0, 0, 1, 0, 0, 1]     // Carlos
]

// Labels das categorias a serem previstas (one-hot encoded)
// [premium, medium, basic]
const labelsNomes = ["premium", "medium", "basic"]; // Ordem dos labels
const tensorLabels = [
    [1, 0, 0], // premium - Erick
    [0, 1, 0], // medium - Ana
    [0, 0, 1]  // basic - Carlos
];

// Criamos tensores de entrada (xs) e saída (ys) para treinar o modelo
const inputXs = tf.tensor2d(tensorPessoasNormalizado)
const outputYs = tf.tensor2d(tensorLabels)

// Treinamos o modelo com os dados de entrada e saída
// O resultado é um modelo treinado, pronto para fazer previsões com novos dados
// quanto mais dados de treino, melhor o modelo pode aprender a generalizar e fazer previsões precisas
const model = await trainModel(inputXs, outputYs)

const pessoa = { nome: "Maria", idade: 28, cor: "verde", localizacao: "Curitiba" }
// Normalizamos os dados de Maria da mesma forma que fizemos com os dados de treino
// Exemplo de normalização: idade_min 25, idade_max 40
// idade_normalizada = (idade - idade_min) / (idade_max - idade_min) = (28 - 25) / (40 - 25) = 0.28
const pessoaTensorNormalizado = tf.tensor2d(
    [
        [
            0.2,    // idade normalizada
            0,      // cor azul
            0,      // cor vermelho
            1,      // cor verde
            0,      // localização São Paulo
            0,      // localização Rio
            1       // localização Curitiba
        ]
    ]
)

const predictions = await predict(model, pessoaTensorNormalizado)
const results = predictions
                    .sort((a, b) => b.probabilidade - a.probabilidade)
                    .map(pred => ({
                        categoria: labelsNomes[pred.index],
                        probabilidade: (pred.probabilidade * 100).toFixed(2) + "%"
                    }))
                    
console.log("Previsão para Maria:", results)