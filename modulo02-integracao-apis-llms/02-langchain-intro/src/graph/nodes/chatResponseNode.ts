import { AIMessage } from "langchain"
import { GraphState } from "../graph.ts"

export function chatResponseNode(state: GraphState): GraphState {
    const responseText = state.output
    const aiMessage = new AIMessage(responseText)
    return {
        ...state,
        messages: [
            ...state.messages,
            aiMessage
        ],
    }
}