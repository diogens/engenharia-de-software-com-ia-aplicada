import { GraphState } from "../graph.ts"

export function indentifyIntent(state: GraphState): GraphState {
    const inputContent = state.messages.at(-1)?.text ?? ""
    const input = typeof inputContent === "string" ? inputContent : ""
    const inputLower = input.toLowerCase()

    let command: GraphState["command"] = "unknown"

    if (inputLower.includes("upper")) {
        command = "uppercase"
    } else if (inputLower.includes("lower")) {
        command = "lowercase"
    }
    return {
        ...state,
        command,
        output: input
    }
}