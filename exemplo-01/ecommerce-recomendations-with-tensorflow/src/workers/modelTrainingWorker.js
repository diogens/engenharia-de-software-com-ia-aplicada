import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';
let _globalCtx = {};
let _model = null
const WEIGHT = {
    category: 0.4,
    color: 0.3,
    price: 0.2,
    age: 0.1,
}

// 🔢 Normalize continuous values (price, age) to 0–1 range
// Why? Keeps all features balanced so no one dominates training
// Formula: (val - min) / (max - min)
// Example: price=129.99, minPrice=39.99, maxPrice=199.99 → 0.56
const normalize = (valor, min, max) => (valor - min) / (max - min) || 1;

function makeContext(products, users) {
    const ages = users.map(u => u.age);
    const prices = products.map(p => p.price);

    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const colors = [...new Set(products.map(u => u.color))];
    const categories = [...new Set(products.map(u => u.category))];

    const colorIndex = Object.fromEntries(
        colors.map((color, index) => {
            return [color, index]
        })
    );

    const categoryIndex = Object.fromEntries(
        categories.map((category, index) => {
            return [category, index]
        })
    );

    // Computar a média de idade para cada produto, para ter uma ideia do perfil de idade dos compradores de cada produto
    const midAge = (minAge + maxAge) / 2;
    const ageSums = {}
    const ageCounts = {}

    users.forEach(user => {
        user.purchases.forEach(p => {
            ageSums[p.name] = (ageSums[p.name] || 0) + user.age;
            ageCounts[p.name] = (ageCounts[p.name] || 0) + 1;
        }) 
    })

    const productAvgAgeNorm = Object.fromEntries(
        products.map((product) => {
            const avg = ageCounts[product.name] ?
                ageSums[product.name] / ageCounts[product.name] :
                midAge;

            return [product.name, normalize(avg, minAge, maxAge)]
        }));

    return {
        products,
        users,
        colorIndex,
        productAvgAgeNorm,
        categoryIndex,
        minPrice,
        maxPrice,
        numCategories: categories.length,
        numColors: colors.length,
        dimetions: 2 +categories.length + colors.length, // age + price + one-hot categories + one-hot colors
    }
}

const oneHotWeight = (index, length, weight) => {
    return tf.oneHot(index, length).cast('float32').mul(weight);
}

function encodeProduct(product, context) {
    // normalizando o dados para ficar entre 0 e 1, para evitar que um dado com escala maior domine o treinamento
    // aplicando o peso na recomendação
    const price = tf.tensor1d([
        normalize(
            product.price,
            context.minPrice,
            context.maxPrice
        ) * WEIGHT.price
    ]);

    const age = tf.tensor1d([
        (
            context.productAvgAgeNorm[product.name] ?? 0.5
        ) * WEIGHT.age
    ]);

    const category = oneHotWeight(
        context.categoryIndex[product.category],
        context.numCategories,
        WEIGHT.category
    );

    const color = oneHotWeight(
        context.colorIndex[product.color],
        context.numColors,
        WEIGHT.color
    );

    return tf.concat1d([price, age, category, color]);
}

function encodeUser(user, context) {
    if(user.purchases.length) {
        return tf.stack(
            user.purchases.map(
                product => encodeProduct(product, context)
            )
        )
        .mean(0) // Média dos vetores dos produtos comprados para representar o usuário
        .reshape([1, context.dimetions]); // Reshape para garantir que seja um vetor 2D (1, dimetions)
    }

    return tf.concat1d(
        [
            tf.zeros([1]), //preco é ignorado
            tf.tensor1d([
                normalize(
                    user.age,
                    context.minAge,
                    context.maxAge
                ) * WEIGHT.age
            ]), // idade normalizada e ponderada
            tf.zeros([context.numCategories]), // categorias são ignoradas
            tf.zeros([context.numColors]), // cores são ignoradas
        ]
    ).reshape([1, context.dimetions]); // Reshape para garantir que seja um vetor 2D (1, dimetions)
}

function createTrainingData(context) {
    const inputs = []
    const labels = []
    context.users
        .filter(u => u.purchases.length)
        .forEach(user => {
            const userVector = encodeUser(user, context).dataSync()
            context.products.forEach(product => {
                const productVector = encodeProduct(product, context).dataSync()

                const label = user.purchases.some(
                    purchase => purchase.name === product.name ?
                        1 :
                        0
                )
                // combinar user + product
                inputs.push([...userVector, ...productVector])
                labels.push(label)

            })
        })
        
        return {
            xs: tf.tensor2d(inputs),
            ys: tf.tensor2d(labels, [labels.length, 1]),
            inputDimensions: context.dimetions * 2, // Combinação do vetor do usuário e do produto
            // Tamanho do conjunto de treinamento: número de usuários(userVector) * número de produtos(productVector)
        }
}

// ====================================================================
// 📌 Exemplo de como um usuário é ANTES da codificação
// ====================================================================
/*
const exampleUser = {
id: 201,
name: 'Rafael Souza',
age: 27,
purchases: [
    { id: 8, name: 'Boné Estiloso', category: 'acessórios', price: 39.99, color: 'preto' },
    { id: 9, name: 'Mochila Executiva', category: 'acessórios', price: 159.99, color: 'cinza' }
]
};
*/

// ====================================================================
// 📌 Após a codificação, o modelo NÃO vê nomes ou palavras.
// Ele vê um VETOR NUMÉRICO (todos normalizados entre 0–1).
// Exemplo: [preço_normalizado, idade_normalizada, cat_one_hot..., cor_one_hot...]
//
// Suponha categorias = ['acessórios', 'eletrônicos', 'vestuário']
// Suponha cores      = ['preto', 'cinza', 'azul']
//
// Para Rafael (idade 27, categoria: acessórios, cores: preto/cinza),
// o vetor poderia ficar assim:
//
// [
//   0.45,            // peso do preço normalizado
//   0.60,            // idade normalizada
//   1, 0, 0,         // one-hot de categoria (acessórios = ativo)
//   1, 0, 0          // one-hot de cores (preto e cinza ativos, azul inativo)
// ]
//
// São esses números que vão para a rede neural.
// ====================================================================



// ====================================================================
// 🧠 Configuração e treinamento da rede neural
// ====================================================================
async function configureNeuralNetAndTrain(trainData) {
    const model = tf.sequential();
    // Camada de entrada
    // - inputShape: Número de features por exemplo de treino (trainData.inputDim)
    //   Exemplo: Se o vetor produto + usuário = 20 números, então inputDim = 20
    // - units: 128 neurônios (muitos "olhos" para detectar padrões)
    // - activation: 'relu' (mantém apenas sinais positivos, ajuda a aprender padrões não-lineares)
    model.add(tf.layers.dense({ inputShape: [trainData.inputDimensions], units: 128, activation: 'relu' }));
    // Camada oculta 1
    // - 64 neurônios (menos que a primeira camada: começa a comprimir informação)
    // - activation: 'relu' (ainda extraindo combinações relevantes de features)
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    // Camada oculta 2
    // - 32 neurônios (mais estreita de novo, destilando as informações mais importantes)
    //   Exemplo: De muitos sinais, mantém apenas os padrões mais fortes
    // - activation: 'relu'
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));

    // Camada de saída
    // - 1 neurônio (saída binária: compra ou não compra)
    // - activation: 'sigmoid' (converte o output para um valor entre 0 e 1, interpretado como probabilidade)
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    // Compilação do modelo
    // - optimizer: 'adam' (um algoritmo eficiente para ajustar os pesos da rede)
    // - loss: 'binaryCrossentropy' (função de perda adequada para classificação binária)
    model.compile({
        optimizer: tf.train.adam(0.01), // Taxa de aprendizado: 0.01 (ajuste rápido, mas cuidado com overfitting)
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });

    await model.fit(trainData.xs, trainData.ys, {
        epochs: 100, // Número de vezes que o modelo verá todo o conjunto de treinamento
        batchSize: 32, // Quantidade de exemplos processados antes de atualizar os pesos
        shuffle: true, // Embaralha os dados a cada época para melhorar a generalização
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                postMessage({ 
                    type: workerEvents.trainingLog, 
                    epoch: epoch + 1, // +1 para começar a contagem em 1
                    loss: logs.loss.toFixed(4), // Perda formatada para 4 casas decimais
                    accuracy: (logs.acc * 100).toFixed(2) // Acurácia em porcentagem
                });
            }
        }
    });

    return model;
}

async function trainModel({ users }) {
    console.log('Training model with users:', users);
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 1 } });
    const products = await (await fetch('/data/products.json')).json();
    console.log('Catalog data:', products);

    const context =  makeContext(products, users);
    context.productVetors = products.map(product => {
        return{
           name: product.name,
           meta: { ...product },
           vector: encodeProduct(product, context).dataSync(), // Convertendo o tensor para array normal para facilitar o uso posterior
        }
    });
    
    _globalCtx = context;
    
    const trainData = createTrainingData(context);
    _model = await configureNeuralNetAndTrain(trainData);

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });

}
async function recommend({ user }) {
    if(!_model) return;
    const context = _globalCtx;

    // 1️⃣ Converta o usuário fornecido no vetor de features codificadas
    //    (preço ignorado, idade normalizada, categorias ignoradas)
    //    Isso transforma as informações do usuário no mesmo formato numérico
    //    que foi usado para treinar o modelo.
    const userVector = encodeUser(user, _globalCtx).dataSync();

     // Em aplicações reais:
    //  Armazene todos os vetores de produtos em um banco de dados vetorial (como Postgres, Neo4j ou Pinecone)
    //  Consulta: Encontre os 200 produtos mais próximos do vetor do usuário
    //  Execute _model.predict() apenas nesses produtos

    // 2️⃣ Crie pares de entrada: para cada produto, concatene o vetor do usuário
    //    com o vetor codificado do produto.
    //    Por quê? O modelo prevê o "score de compatibilidade" para cada par (usuário, produto).
    const inputs = context.productVetors.map(product => {
        return [...userVector, ...product.vector];  
    });

    // 3️⃣ Converta todos esses pares (usuário, produto) em um único Tensor.
    //    Formato: [numProdutos, inputDim]
    const inputTensor = tf.tensor2d(inputs);

    // 4️⃣ Rode a rede neural treinada em todos os pares (usuário, produto) de uma vez.
    //    O resultado é uma pontuação para cada produto entre 0 e 1.
    //    Quanto maior, maior a probabilidade do usuário querer aquele produto.
    const predictions = _model.predict(inputTensor);

    // 5️⃣ Extraia as pontuações para um array JS normal.
    const scores = predictions.dataSync();
    const recommendations = context.productVetors
        .map((product, index) => ({
            ...product.meta,
            score: scores[index]
        }))
        .sort((a, b) => b.score - a.score) // Ordena do mais relevante para o menos relevante

    //postMessage({ type: workerEvents.recommendationsReady, recommendations });
    
    // 8️⃣ Envie a lista ordenada de produtos recomendados
    //    para a thread principal (a UI pode exibi-los agora).
    postMessage({ 
        type: workerEvents.recommend, 
        user,
        recommendations: recommendations
    });

    console.log('Recommending for user:', user);
    
}
const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: recommend,
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
