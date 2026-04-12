import { CONFIG } from "./config.ts";
import { DocumentProcessor } from "./documentProcessor.ts";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import {type  PretrainedOptions } from "@huggingface/transformers";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { displayResults } from "./util.ts";
import { ChatOpenAI } from "@langchain/openai";
import { AI } from "./ai.ts";
import { writeFile, mkdir } from 'node:fs/promises'

let _neo4jVectorStore: Neo4jVectorStore | null = null

async function clearAll(verctorStore: Neo4jVectorStore, nodeModel: string): Promise<void> {
    console.log("🗑️ Limpando o banco de dados Neo4j...")
    await verctorStore.query(`MATCH (n:${nodeModel}) DETACH DELETE n`)
    console.log("✅ Banco de dados Neo4j limpo.")
}

try {
    console.log("🚀 Iniciando Sistema de Embeddings com Neo4j... \n  ")
    const documentProcessor = new DocumentProcessor(
        CONFIG.pdf.path,
        CONFIG.textSplitter
    )

    const documents = await documentProcessor.loadAndSplit()

    const  nlpModel = new ChatOpenAI({
        temperature: CONFIG.openRouter.temperature,
        maxRetries: CONFIG.openRouter.maxRetries,
        modelName: CONFIG.openRouter.nlpModel,
        openAIApiKey: CONFIG.openRouter.apiKey,
        configuration: {
            baseURL: CONFIG.openRouter.url,
            defaultHeaders: CONFIG.openRouter.defaultHeaders
        }
    })

    const embeddings = new HuggingFaceTransformersEmbeddings({
        model: CONFIG.embedding.modelName,
        pretrainedOptions: CONFIG.embedding.pretrainedOptions as PretrainedOptions,
    })

    /* const documentEmbeddings = await embeddings.embedQuery(
        documents.map(doc => doc.pageContent).join("\n\n")
    ) */

    /* const documentEmbeddings = await embeddings.embedDocuments(
        documents.map(doc => doc.pageContent)
    ) */
    
    _neo4jVectorStore = await Neo4jVectorStore.fromExistingGraph(
        embeddings,
        CONFIG.neo4j
    )
    await clearAll(_neo4jVectorStore, CONFIG.neo4j.nodeLabel)
    console.log("📊 Inserindo documentos e embeddings no Neo4j...")
    for (const [index, document] of documents.entries()) {
        console.log(`📄 Processando documento ${index + 1}/${documents.length}...`)
        await _neo4jVectorStore.addDocuments([document])
    }

    console.log("✅ Documentos e embeddings inseridos no Neo4j com sucesso!")

    // ======================= STEP 2: CONSULTA DE TESTE =======================
    console.log("\n🔍 Etapa 2: Realizando consulta de teste...")
    const questions = [
        "O que significa treinar uma rede neural?",
        "Como converter objetos JvaScript em Tensores?",
        "Quais são as vantagens de usar tensores em machine learning?",
        "O que são tensores e com sao representados em javascript?",
        "Como converter objetos JavaScript em tensores para machine learning?",
        "Como funcionna uma rede neural  no TensorFlow.js?",
        "O que é hot encoding e como é usado em machine learning?",
    ]
    
    const ai = new AI({
        nlpModel,
        debugLog: console.log,
        vectorStore: _neo4jVectorStore,
        promptConfig: CONFIG.promptConfig,
        templateText: CONFIG.templateText,
        topK: CONFIG.similarity.topK
    })

    for (const question of questions) {
       /*  console.log(`\n❓ Pergunta: ${question}`) */

        const result = await ai.answerQuestion(question)
        if(result.error) {
            console.error("❌ Erro ao responder a pergunta:", result.error)
            continue
        } 

        await mkdir(CONFIG.output.answersFolder, { recursive: true })
        const fileName = `${CONFIG.output.answersFolder}/${CONFIG.output.fileName}_${Date.now()}.md`
        await writeFile(fileName, result.answer!, 'utf-8')
    }

} catch (error) {
    console.error("Error processing document:", error)
} finally {
    console.log("Sistema de Embeddings com Neo4j finalizado.")
    await _neo4jVectorStore?.close() // Fecha a conexão com o Neo4j ao final do processo
}