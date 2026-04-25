import { END, MessagesZodMeta, START, StateGraph } from "@langchain/langgraph"
import { withLangGraph } from "@langchain/langgraph/zod"
import { z } from "zod"
import { indentifyIntent } from "./nodes/indentifyIntentNode.ts"
import { chatResponseNode } from "./nodes/chatResponseNode.ts"
import { lowerCaseNode } from "./nodes/lowerCaseNode.ts"
import { upperCaseNode } from "./nodes/upperCaseNode.ts"
import { fallbackNode } from "./nodes/fallbackNode.ts"

export const GraphState = z.object({
    messages: withLangGraph(
        z.array(z.any()).default([]) as any,
        MessagesZodMeta
    ) as any,
    output: z.string(),
    command: z.enum(["uppercase", "lowercase", "unknown"])
})

export type GraphState = z.infer<typeof GraphState>

export function buildGraph() {
    const workflow = new StateGraph({
        stateSchema: GraphState
    })

        /* .addNode("indentifyIntent", (state: GraphState) => {
            return {
                ...state,
                output: "teste testado"
            }
        }) */
        .addNode("indentifyIntent", indentifyIntent)
        .addNode("chatResponse", chatResponseNode)

        .addNode("upperCase", upperCaseNode)
        .addNode("lowerCase", lowerCaseNode)
        .addNode("fallback", fallbackNode)

        .addEdge(START, "indentifyIntent")
        .addConditionalEdges(
            "indentifyIntent",
            (state: GraphState) => {
                switch (state.command) {
                    case "uppercase":
                        return "uppercase"
                    case "lowercase":
                        return "lowercase"
                    default:
                        return "fallback"
                }
            },
            {
                "uppercase": "upperCase",
                "lowercase": "lowerCase",
                "fallback": "fallback"
            }
        )

        .addEdge("upperCase", "chatResponse")
        .addEdge("lowerCase", "chatResponse")
        .addEdge("fallback", "chatResponse")

        .addEdge("chatResponse", END)

    return workflow.compile()
}
