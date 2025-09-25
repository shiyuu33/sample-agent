import { createTool } from "@voltagent/core";
import axios from "axios";
import { z } from "zod";
import { config } from "../config";
import type { NewsArticle, NewsSearchResponse } from "../types";

// News API の実際のレスポンス型（提供された仕様に基づく）
interface NewsApiResponse {
	status: string;
	totalResults: number;
	articles: NewsApiArticle[];
}

interface NewsApiArticle {
	source: {
		id: string | null;
		name: string;
	};
	author: string | null;
	title: string;
	description: string;
	url: string;
	urlToImage: string | null;
	publishedAt: string;
	content: string | null;
}

/**
 * 暗号通貨ニュース検索ツール
 * News APIを使用して指定されたキーワードで最新ニュースを検索
 * 暗号通貨関連のニュースに特化
 * 
 * @tool searchCryptoNews
 * @description 指定された暗号通貨キーワードで最新ニュースを検索する（News API使用）
 * @param {string} query - 検索キーワード（例：bitcoin, ethereum, cryptocurrency）
 * @param {string} [language="en"] - 言語（デフォルト: en, 日本語: ja）
 * @param {"relevancy"|"popularity"|"publishedAt"} [sortBy="publishedAt"] - ソート順（関連性、人気、公開日）
 * @param {number} [pageSize=10] - 取得する記事数（最大100、デフォルト: 10）
 * @returns {Promise<NewsSearchResponse>} ニュース記事、センチメント分析、サマリーを含むレスポンス
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

			if (!response.data) {
				throw new Error("News API エラー");
			}

			// 記事を処理し、暗号通貨関連度でフィルタリング
			const rawArticles = makeNewsResponse(response.data);
			const processedArticles = rawArticles
				.map((article) => ({
					...article,
					relevanceScore: calculateCryptoRelevance(
						`${article.title} ${article.description}`,
						query,
					),
				}))
				.sort((a, b) => b.relevanceScore - a.relevanceScore) // 関連度順でソート
				.slice(0, pageSize);

			// センチメント分析
			const sentiment = analyzeCryptoNewsSentiment(rawArticles);

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
			console.error(`❌ ${query}に関する暗号通貨ニュースを検索中にエラー:`, error);
			throw new Error("News API");
		} finally {
			console.log(`📰 ${query}に関する暗号通貨ニュースを検索完了`);
		}
	},
});

/**
 * News APIレスポンスをNewsArticleに変換する関数
 * 
 * @param {NewsApiResponse} apiResponse - News APIからの生レスポンス
 * @returns {NewsArticle[]} 標準化されたニュース記事の配列
 */
function makeNewsResponse(apiResponse: NewsApiResponse): NewsArticle[] {
	return apiResponse.articles
		.filter((article) => article.title && article.description)
		.map((article) => ({
			title: article.title,
			description: article.description,
			url: article.url,
			publishedAt: article.publishedAt,
			source: article.source.name,
			urlToImage: article.urlToImage || undefined,
			content: article.content || undefined,
		}));
}

/**
 * テキスト内容と検索クエリから暗号通貨関連度を計算する関数
 * 
 * @param {string} text - 分析対象のテキスト（タイトル + 説明文）
 * @param {string} query - 検索クエリ
 * @returns {number} 関連度スコア（高いほど関連性が高い）
 */
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

	for (const keyword of cryptoKeywords) {
		if (lowerText.includes(keyword)) {
			score += 1;
		}
	}

	return score;
}

/**
 * ニュース記事群からセンチメントを分析する関数
 * 
 * @param {NewsArticle[]} articles - 分析対象のニュース記事配列
 * @returns {string} センチメント判定結果（ポジティブ/ネガティブ/中立）
 */
function analyzeCryptoNewsSentiment(articles: NewsArticle[]): string {
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

	for (const article of articles) {
		const text = `${article.title} ${article.description}`.toLowerCase();

		for (const word of positiveWords) {
			if (text.includes(word)) positiveCount++;
		}

		for (const word of negativeWords) {
			if (text.includes(word)) negativeCount++;
		}
	}

	if (positiveCount > negativeCount * 1.5) return "ポジティブ";
	if (negativeCount > positiveCount * 1.5) return "ネガティブ";
	return "中立";
}

/**
 * ニュース検索結果のサマリーを生成する関数
 * 
 * @param {string} query - 検索クエリ
 * @param {number} articleCount - 取得された記事数
 * @param {string} sentiment - センチメント分析結果
 * @returns {string} 日本語フォーマットされたサマリー文字列
 */
function generateNewsSearchSummary(
	query: string,
	articleCount: number,
	sentiment: string,
): string {
	return `📰 「${query}」関連の暗号通貨ニュースを${articleCount}件取得しました。
	
📊 市場センチメント: ${sentiment}
🕐 検索時刻: ${new Date().toLocaleString("ja-JP")}

${
	sentiment === "ポジティブ"
		? "📈 市場に対する楽観的な見方が多く見られます。"
		: sentiment === "ネガティブ"
			? "📉 市場に対する慎重な見方が増えています。"
			: "⚖️ ポジティブとネガティブなニュースが混在しています。"
}`;
}
