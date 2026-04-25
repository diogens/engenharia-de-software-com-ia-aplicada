import { AIMessage, SystemMessage } from "langchain"
import { GraphState } from "../graph.ts"

export function fallbackNode(state: GraphState): GraphState {
    const message = "Não entendi o comando. Tente novamente ou use 'upper' ou 'lower' no comando."
    const fallbackMessage = new AIMessage(message).content.toString()
    return {
        ...state,
        output: fallbackMessage,
        messages: [
            ...state.messages,
            // new SystemMessage('Hey there, I am not sure what you mean. Could you rephrase?')
        ],
    }
}