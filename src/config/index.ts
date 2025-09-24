import type { AppConfig } from "../types";

// アプリケーション設定
export const config: AppConfig = {
	apis: {
		coinGecko: {
			baseUrl: "https://api.coingecko.com/api/v3",
			timeout: 10000,
			retries: 3,
			headers: {
				Accept: "application/json",
			},
		},
		newsApi: {
			baseUrl: "https://newsapi.org/v2",
			timeout: 15000,
			maxPageSize: 100,
			headers: {
				"X-API-Key": `${process.env.NEWS_API_KEY}`,
				Accept: "application/json",
			},
		},
	},
} as const;
