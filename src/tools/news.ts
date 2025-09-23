import { createTool } from "@voltagent/core";
import { z } from "zod";
import axios from "axios";

// ニュース記事の型定義
interface NewsArticle {
	title: string;
	description: string;
	url: string;
	publishedAt: string;
	source: {
		name: string;
	};
	urlToImage?: string;
	content?: string;
}

interface NewsApiResponse {
	status: string;
	totalResults: number;
	articles: NewsArticle[];
}

/**
 * 暗号通貨ニュース検索ツール
 * News APIを使用して指定されたキーワードで最新ニュースを検索
 * 暗号通貨関連のニュースに特化
 */
export const cryptoNewsSearchTool = createTool({
	name: "searchCryptoNews",
	description: "指定された暗号通貨キーワードで最新ニュースを検索する（News API使用）",
	parameters: z.object({
		query: z.string().describe("検索キーワード（例：bitcoin, ethereum, cryptocurrency）"),
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
	execute: async ({ query, language = "en", sortBy = "publishedAt", pageSize = 10 }) => {
		try {
			console.log(`📰 ${query}に関する暗号通貨ニュースを検索中...`);

			// News API キー（環境変数から取得）
			const apiKey = process.env.NEWS_API_KEY;

			if (!apiKey) {
				const errorMessage = "NEWS_API_KEYが設定されていません。環境変数を設定してください。";
				console.error(`❌ ${errorMessage}`);
				throw new Error(errorMessage);
			}

			// News API エンドポイント
			const baseUrl = "https://newsapi.org/v2";
			const endpoint = "/everything";

			// 暗号通貨関連のキーワードを含む検索クエリを構築
			const cryptoQuery = `${query} AND (crypto OR cryptocurrency OR bitcoin OR blockchain OR digital OR currency)`;

			// APIリクエスト
			const response = await axios.get(`${baseUrl}${endpoint}`, {
				params: {
					q: cryptoQuery,
					language: language as string,
					sortBy: sortBy as string,
					pageSize: Math.min(pageSize as number, 100),
					from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 過去7日間
				},
				headers: {
					'X-API-Key': apiKey,
					'Accept': 'application/json',
				},
				timeout: 15000, // 15秒タイムアウト
			});

			const data: NewsApiResponse = response.data;

			if (data.status !== 'ok') {
				throw new Error(`News API エラー: ${data.status}`);
			}

			// 記事を処理し、暗号通貨関連度でフィルタリング
			const processedArticles = data.articles
				.filter(article => article.title && article.description)
				.map(article => ({
					title: article.title,
					description: article.description,
					url: article.url,
					publishedAt: article.publishedAt,
					source: article.source.name,
					urlToImage: article.urlToImage,
					relevanceScore: calculateCryptoRelevance(article.title + " " + article.description, query as string)
				}))
				.sort((a, b) => b.relevanceScore - a.relevanceScore) // 関連度順でソート
				.slice(0, pageSize as number);

			// センチメント分析
			const sentiment = analyzeCryptoNewsSentiment(processedArticles);

			return {
				query: query as string,
				language: language as string,
				articles: processedArticles.map(({ relevanceScore, ...article }) => article),
				totalFound: data.totalResults,
				actualReturned: processedArticles.length,
				sentiment: sentiment,
				searchTime: new Date().toISOString(),
				message: generateNewsSearchSummary(query as string, processedArticles.length, sentiment),
			};

		} catch (error) {
			console.error(`❌ ${query}のニュース検索中にエラー:`, error);

			if (axios.isAxiosError(error)) {
				if (error.response?.status === 429) {
					const errorMessage = "News APIのリクエスト制限に達しました。しばらく待ってから再試行してください。";
					console.error(`❌ APIレート制限: ${errorMessage}`);
					throw new Error(errorMessage);
				}
				if (error.response?.status === 401) {
					const errorMessage = "News APIキーが無効です。正しいAPIキーを設定してください。";
					console.error(`❌ API認証エラー: ${errorMessage}`);
					throw new Error(errorMessage);
				}
				if (error.response?.status === 403) {
					const errorMessage = "News APIへのアクセスが拒否されました。API権限を確認してください。";
					console.error(`❌ APIアクセス拒否: ${errorMessage}`);
					throw new Error(errorMessage);
				}
			}

			// その他のエラーもすべて再スローして処理を停止
			const errorMessage = `${query as string}のニュース検索に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`;
			console.error(`❌ ニュース検索エラー: ${errorMessage}`);
			throw new Error(errorMessage);
		}
	},
});

// ヘルパー関数

function calculateCryptoRelevance(text: string, query: string): number {
	const lowerText = text.toLowerCase();
	const lowerQuery = query.toLowerCase();

	let score = 0;

	// メインクエリの出現回数
	const queryMatches = (lowerText.match(new RegExp(lowerQuery, 'g')) || []).length;
	score += queryMatches * 3;

	// 暗号通貨関連キーワードの重み付け
	const cryptoKeywords = [
		'bitcoin', 'ethereum', 'cryptocurrency', 'crypto', 'blockchain',
		'defi', 'nft', 'trading', 'mining', 'wallet', 'exchange'
	];

	cryptoKeywords.forEach(keyword => {
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

	const positiveWords = ['上昇', '成長', '採用', '革新', '改善', 'bull', 'rise', 'growth', 'adoption', 'innovation'];
	const negativeWords = ['下落', '暴落', '規制', '禁止', '懸念', 'bear', 'crash', 'regulation', 'ban', 'concern'];

	articles.forEach(article => {
		const text = (article.title + " " + article.description).toLowerCase();

		positiveWords.forEach(word => {
			if (text.includes(word)) positiveCount++;
		});

		negativeWords.forEach(word => {
			if (text.includes(word)) negativeCount++;
		});
	});

	if (positiveCount > negativeCount * 1.5) return "ポジティブ";
	if (negativeCount > positiveCount * 1.5) return "ネガティブ";
	return "中立";
}

function generateNewsSearchSummary(query: string, articleCount: number, sentiment: string): string {
	return `📰 「${query}」関連の暗号通貨ニュースを${articleCount}件取得しました。
	
📊 市場センチメント: ${sentiment}
🕐 検索時刻: ${new Date().toLocaleString('ja-JP')}

${sentiment === "ポジティブ" ? "📈 市場に対する楽観的な見方が多く見られます。" :
			sentiment === "ネガティブ" ? "📉 市場に対する慎重な見方が増えています。" :
				"⚖️ ポジティブとネガティブなニュースが混在しています。"}`;
}
