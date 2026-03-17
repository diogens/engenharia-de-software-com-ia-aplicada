import Database from "better-sqlite3";
import { betterAuth } from "better-auth";

const database = new Database("./better-auth.sqlite");

const auth = betterAuth({
	database,
	secret:
		process.env.BETTER_AUTH_SECRET ??
		"local-demo-secret-change-this-please-1234567890",
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID ?? "demo-github-client-id",
			clientSecret:
				process.env.GITHUB_CLIENT_SECRET ?? "demo-github-client-secret",
		},
	},
});

export default auth;