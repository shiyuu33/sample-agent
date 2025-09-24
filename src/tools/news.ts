import { createTool } from "@voltagent/core";
import axios from "axios";
import { z } from "zod";
import { config } from "../config";
import { type NewsSearchResponse } from "../types";

interface NewsApiResponse {
	status: string;
	totalResults: number;
	articles: {
		title: string;
		description: string;
		url: string;
		publishedAt: string;
		source: {
			name: string;
		};
		urlToImage?: string;
		content?: string;
	}[];
}

/**
 * 暗号通貨ニュース検索ツール
 * News APIを使用して指定されたキーワードで最新ニュースを検索
 * 暗号通貨関連のニュースに特化
 */
export const cryptoNewsSearchTool = createTool({
	name: "searchCryptoNews",
	description:
		"指定された暗号通貨キーワードで最新ニュースを検索する（News API使用）",
	parameters: z.object({
		query: z
			.string()
			.describe("検索キーワード（例：bitcoin, ethereum, cryptocurrency）"),
		language: z
			.string()
			.optional()
			.default("en")
			.describe("言語（デフォルト: en, 日本語: ja）"),
		sortBy: z
			.enum(["relevancy", "popularity", "publishedAt"])
			.optional()
			.default("publishedAt")
			.describe("ソート順（関連性、人気、公開日）"),
		pageSize: z
			.number()
			.optional()
			.default(10)
			.describe("取得する記事数（最大100、デフォルト: 10）"),
	}),
	execute: async ({
		query,
		language = "en",
		sortBy = "publishedAt",
		pageSize = 10,
	}): Promise<NewsSearchResponse> => {
		try {
			console.log(`📰 ${query}に関する暗号通貨ニュースを検索中...`);

			// APIリクエスト
			const response = await axios.get<NewsApiResponse>(
				`${config.apis.newsApi.baseUrl}/everything`,
				{
					params: {
						q: `${query} AND (crypto OR cryptocurrency OR bitcoin OR blockchain OR digital OR currency)`,
						language: language,
						sortBy: sortBy,
						pageSize: Math.min(pageSize, config.apis.newsApi.maxPageSize),
						from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 過去7日間
					},
					headers: config.apis.newsApi.headers,
					timeout: config.apis.newsApi.timeout,
				},
			);

			if (response.data.status !== "ok") {
				throw new Error(`News API エラー: ${response.data.status}`);
			}

			// 記事を処理し、暗号通貨関連度でフィルタリング
			const processedArticles = response.data.articles
				.filter((article) => article.title && article.description)
				.map((article) => ({
					title: article.title,
					description: article.description,
					url: article.url,
					publishedAt: article.publishedAt,
					source: article.source.name,
					urlToImage: article.urlToImage,
					relevanceScore: calculateCryptoRelevance(
						article.title + " " + article.description,
						query,
					),
				}))
				.sort((a, b) => b.relevanceScore - a.relevanceScore) // 関連度順でソート
				.slice(0, pageSize);

			// センチメント分析
			const sentiment = analyzeCryptoNewsSentiment(processedArticles);

			const result: NewsSearchResponse = {
				success: true,
				data: processedArticles.map(
					({ relevanceScore, ...article }) => article,
				),
				query: query,
				language: language,
				totalFound: response.data.totalResults,
				actualReturned: processedArticles.length,
				sentiment: sentiment,
				searchTime: new Date().toISOString(),
				message: generateNewsSearchSummary(
					query,
					processedArticles.length,
					sentiment,
				),
				timestamp: new Date().toISOString(),
			};

			return result;
		} catch (error) {
			throw new Error("News API");
		}
	},
});

// ヘルパー関数
function calculateCryptoRelevance(text: string, query: string): number {
	const lowerText = text.toLowerCase();
	const lowerQuery = query.toLowerCase();

	let score = 0;

	// メインクエリの出現回数
	const queryMatches = (lowerText.match(new RegExp(lowerQuery, "g")) || [])
		.length;
	score += queryMatches * 3;

	// 暗号通貨関連キーワードの重み付け
	const cryptoKeywords = [
		"bitcoin",
		"ethereum",
		"cryptocurrency",
		"crypto",
		"blockchain",
		"defi",
		"nft",
		"trading",
		"mining",
		"wallet",
		"exchange",
	];

	cryptoKeywords.forEach((keyword) => {
		if (lowerText.includes(keyword)) {
			score += 1;
		}
	});

	return score;
}

function analyzeCryptoNewsSentiment(articles: any[]): string {
	if (articles.length === 0) return "中立";

	let positiveCount = 0;
	let negativeCount = 0;

	const positiveWords = [
		"上昇",
		"成長",
		"採用",
		"革新",
		"改善",
		"bull",
		"rise",
		"growth",
		"adoption",
		"innovation",
	];
	const negativeWords = [
		"下落",
		"暴落",
		"規制",
		"禁止",
		"懸念",
		"bear",
		"crash",
		"regulation",
		"ban",
		"concern",
	];

	articles.forEach((article) => {
		const text = (article.title + " " + article.description).toLowerCase();

		positiveWords.forEach((word) => {
			if (text.includes(word)) positiveCount++;
		});

		negativeWords.forEach((word) => {
			if (text.includes(word)) negativeCount++;
		});
	});

	if (positiveCount > negativeCount * 1.5) return "ポジティブ";
	if (negativeCount > positiveCount * 1.5) return "ネガティブ";
	return "中立";
}

function generateNewsSearchSummary(
	query: string,
	articleCount: number,
	sentiment: string,
): string {
	return `📰 「${query}」関連の暗号通貨ニュースを${articleCount}件取得しました。
	
📊 市場センチメント: ${sentiment}
🕐 検索時刻: ${new Date().toLocaleString("ja-JP")}

${sentiment === "ポジティブ"
			? "📈 市場に対する楽観的な見方が多く見られます。"
			: sentiment === "ネガティブ"
				? "📉 市場に対する慎重な見方が増えています。"
				: "⚖️ ポジティブとネガティブなニュースが混在しています。"
		}`;
}
