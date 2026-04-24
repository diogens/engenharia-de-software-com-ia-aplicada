import Fastify from "fastify"
import { OpenRouterService } from "./openrouterService.ts"

export const createServer = (routerService: OpenRouterService) => {
    const app = Fastify({})

    app.post('/chat', {
        schema: {
            body: {
                type: 'object',
                required: ['question'],
                properties: {
                    question: { type: 'string', minLength: 5 }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const { question } = request.body as { question: string }
            const response = await routerService.generate(question)
            return reply.send(response)
        } catch (error) {
            console.error("Erro handling /chat request", error)
            return reply.code(500)
        }
    })

    return app
}