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
    })
    
    _globalCtx = context;
  
    const trainData = createTrainingData(context);
    debugger;

    postMessage({ 
        type: workerEvents.trainModel, 
        epoch: 1,
        loss: 1,
        accuracy: 1
    });

    setTimeout(() => {
        postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
        postMessage({ type: workerEvents.trainingComplete });
    }, 1000)

}
function recommend({ user }) {
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
