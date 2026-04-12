import { type Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector"
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai"

type DebugLog = (...args: unknown[]) => void
type params = {
    debugLog: DebugLog;
    vectorStore: Neo4jVectorStore;
    nlpModel: ChatOpenAI;
    promptConfig: any;
    templateText: string;
    topK: number;
}

interface ChainState {
    question: string;
    context?: string;
    topScore?: number;
    error?: string;
    answer?: string;
}

export class AI {
    private params: params
    constructor(params: params) {
        this.params = params
    }

    async retriveVectorSearchResults(input: ChainState): Promise<ChainState> {
        this.params.debugLog("🔍 Realizando busca vetorial no Neo4j...")
        const vectorResults = await this.params.vectorStore.similaritySearchWithScore(
            input.question,
            this.params.topK
        )

        if (vectorResults.length === 0) {
            this.params.debugLog("⚠️ Nenhum resultado encontrado para a pergunta.")
            return {
                ...input,
                error: "Desculpe, não consegui encontrar informações relevantes para responder à sua pergunta."
            }
        }

        const topScore = vectorResults[0]![1]
        this.params.debugLog(`✅ Encontrados ${vectorResults.length} resultados ( Melhor score: ${topScore.toFixed(4)} )`)
        const context = vectorResults
            .filter(([_, score]) => score === 0.5)
            .map(([doc]) => doc.pageContent)
            .join("\n\n---\n\n")

        return {
            ...input,
            context: context,
            topScore
        };
    }

    async generateNLPResponse(input: ChainState): Promise<ChainState> {
        if (input.error) return input
        this.params.debugLog("🤖 Gerando resposta com IA...");

        const responsePrompt = ChatPromptTemplate.fromTemplate(
            this.params.templateText
        )
        const responseChain = responsePrompt
            .pipe(this.params.nlpModel)
            .pipe(new StringOutputParser())

        let rawResponse: string;
        let attempts = 0;
        const maxAttempts = 5;
        while (attempts < maxAttempts) {
            try {
                rawResponse = await responseChain.invoke({
                    role: this.params.promptConfig.role,
                    task: this.params.promptConfig.task,
                    tone: this.params.promptConfig.constraints.tone,
                    language: this.params.promptConfig.constraints.language,
                    format: this.params.promptConfig.constraints.format,
                    instructions: this.params.promptConfig.instructions.map((instruction: string, idx: number) =>
                        `${idx + 1}. ${instruction}`
                    ).join('\n'),
                    question: input.question,
                    context: input.context
                })
                break; // Success, exit loop
            } catch (error: any) {
                attempts++;
                if (error.code === 429 && attempts < maxAttempts) {
                    const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
                    this.params.debugLog(`Rate limit atingido, tentando novamente em ${delay}ms (tentativa ${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }

        console.log("Resposta bruta da IA:", rawResponse!)
        return {
            ...input,
            answer: rawResponse!
        }
    }

    async answerQuestion(question: string) {
        const chain = RunnableSequence.from([
            this.retriveVectorSearchResults.bind(this),
            this.generateNLPResponse.bind(this)
        ])

        const result = await chain.invoke({
            question
        })

        this.params.debugLog("\n🎙️  Pergunta:");
        this.params.debugLog(question, "\n");
        this.params.debugLog("💬 Resposta:");
        this.params.debugLog(result.answer || result.error, "\n");

        return result

    }
}