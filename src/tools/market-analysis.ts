import { createTool } from "@voltagent/core";
import { z } from "zod";
import { newsSearchTool } from "./news";
import { stockPriceTool } from "./stock";

// 型定義
interface PriceResult {
	symbol: string;
	name: string;
	sector: string;
	current: number;
	change: number;
	changePercent: number;
	volume: number;
	marketCap: number;
	error?: string;
	message?: string;
}

interface NewsResult {
	articles: NewsArticle[];
	totalFound: number;
	query: string;
}

interface NewsArticle {
	title: string;
	description: string;
	publishedAt: string;
	source: string;
}

interface AnalysisData {
	symbol: string;
	companyName: string;
	sector: string;
	analysisDate: string;
	priceAnalysis: {
		currentPrice: number;
		priceChange: number;
		priceChangePercent: number;
		trend: string;
		volatility: string;
	};
	newsAnalysis: {
		totalNews: number;
		recentNewsCount: number;
		sentiment: string;
	};
	overallAssessment: {
		recommendation: string;
		riskLevel: string;
		confidenceScore: number;
	};
	detailedMetrics?: {
		marketCap: number;
		volume: number;
		volumeAnalysis: string;
		newsTopics: string[];
	};
	sectorComparison?: {
		sector: string;
		peers: string[];
		analysis: string;
	};
}

/**
 * 市場統合分析ツール
 * 銘柄の株価と関連ニュースを統合して分析
 * サブエージェントでの使用を想定した高度な分析機能
 * 
 * ⚠️ 【重要：免責事項】
 * - このツールはデモ・教育用途のみです。実際の投資助言や金融アドバイスではありません。分析結果は学習・参考目的であり、投資判断に使用しないでください
 */
export const marketAnalysisTool = createTool({
	name: "analyzeMarket",
	description:
		"銘柄の株価と関連ニュースを統合分析し、投資判断の参考情報を提供する",
	parameters: z.object({
		symbol: z.string().describe("分析する銘柄コード（例：AAPL, GOOGL, TSLA）"),
		analysisType: z
			.enum(["quick", "detailed"])
			.default("quick")
			.describe("分析の詳細度（quick: 簡易分析, detailed: 詳細分析）"),
		includeComparison: z
			.boolean()
			.optional()
			.default(false)
			.describe("同業他社との比較を含めるか"),
	}),
	execute: async ({ symbol, analysisType, includeComparison = false }) => {
		try {
			console.log(
				`🔍 ${symbol}の市場分析を開始します（${analysisType}モード）`,
			);

			// 1. 株価データを取得
			console.log("📊 株価データを取得中...");
			const priceResult = await stockPriceTool.execute({
				symbol,
				includeNews: false,
			}) as PriceResult;

			if (priceResult.error) {
				return {
					symbol: symbol.toUpperCase(),
					error: priceResult.error,
					message: `${symbol}の分析に失敗しました: ${priceResult.message}`,
				};
			}

			// 2. 関連ニュースを検索
			console.log("📰 関連ニュースを検索中...");
			const newsResult = await newsSearchTool.execute({
				query: symbol,
				category: "business",
				count: analysisType === "detailed" ? 10 : 5,
			}) as NewsResult;

			// 3. 分析ロジック
			const analysis: AnalysisData = {
				symbol: priceResult.symbol,
				companyName: priceResult.name,
				sector: priceResult.sector,
				analysisDate: new Date().toISOString(),

				// 価格分析
				priceAnalysis: {
					currentPrice: priceResult.current,
					priceChange: priceResult.change,
					priceChangePercent: priceResult.changePercent,
					trend:
						priceResult.change > 0
							? "上昇"
							: priceResult.change < 0
								? "下落"
								: "横ばい",
					volatility:
						Math.abs(priceResult.changePercent) > 5
							? "高"
							: Math.abs(priceResult.changePercent) > 2
								? "中"
								: "低",
				},

				// ニュース分析
				newsAnalysis: {
					totalNews: newsResult.articles.length,
					recentNewsCount: newsResult.articles.filter((article) => {
						const publishedHours =
							(new Date().getTime() - new Date(article.publishedAt).getTime()) /
							(1000 * 60 * 60);
						return publishedHours <= 24;
					}).length,
					sentiment: analyzeSentiment(
						priceResult.changePercent,
						newsResult.articles.length,
					),
				},

				// 総合評価
				overallAssessment: {
					recommendation: generateRecommendation(
						priceResult.changePercent,
						newsResult.articles.length,
					),
					riskLevel: assessRiskLevel(
						Math.abs(priceResult.changePercent),
						newsResult.articles.length,
					),
					confidenceScore: calculateConfidenceScore(priceResult, newsResult),
				},
			};

			// 詳細分析の場合の追加情報
			if (analysisType === "detailed") {
				analysis.detailedMetrics = {
					marketCap: priceResult.marketCap,
					volume: priceResult.volume,
					volumeAnalysis:
						priceResult.volume > 10000000
							? "高"
							: priceResult.volume > 5000000
								? "中"
								: "低",
					newsTopics: extractNewsTopics(newsResult.articles),
				};
			}

			// 同業他社比較（要求された場合）
			if (includeComparison && priceResult.sector) {
				console.log("🔄 同業他社との比較分析中...");
				analysis.sectorComparison = await getSectorComparison(
					priceResult.sector,
					symbol,
				);
			}

			const summaryMessage = generateSummaryMessage(analysis);

			return {
				symbol: analysis.symbol,
				analysis,
				priceData: priceResult,
				newsData: newsResult,
				message: summaryMessage,
			};
		} catch (error) {
			console.error(`❌ ${symbol}の分析中にエラーが発生:`, error);
			return {
				symbol: symbol.toUpperCase(),
				error: "分析処理中にエラーが発生しました",
				message: `${symbol}の市場分析に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
			};
		}
	},
});

// ヘルパー関数（市場分析用のユーティリティ）
function analyzeSentiment(priceChangePercent: number, newsCount: number) {
	if (priceChangePercent > 3) return "非常にポジティブ";
	if (priceChangePercent > 1) return "ポジティブ";
	if (priceChangePercent > -1) return "中立";
	if (priceChangePercent > -3) return "ネガティブ";
	return "非常にネガティブ";
}

function generateRecommendation(priceChangePercent: number, newsCount: number) {
	const score = priceChangePercent + newsCount * 0.1;
	if (score > 2) return "強い買い";
	if (score > 0.5) return "買い";
	if (score > -0.5) return "様子見";
	if (score > -2) return "売り";
	return "強い売り";
}

function assessRiskLevel(absChangePercent: number, newsCount: number) {
	const riskScore =
		absChangePercent + (newsCount > 8 ? 2 : newsCount > 4 ? 1 : 0);
	if (riskScore > 5) return "高";
	if (riskScore > 2) return "中";
	return "低";
}

function calculateConfidenceScore(
	priceData: PriceResult,
	newsData: NewsResult,
) {
	let score = 50; // ベーススコア

	// ニュース数による信頼度調整
	score += Math.min(newsData.articles.length * 5, 25);

	// 価格変動による信頼度調整
	if (Math.abs(priceData.changePercent) < 1) score += 10; // 安定している
	if (Math.abs(priceData.changePercent) > 10) score -= 15; // 過度に不安定

	return Math.max(0, Math.min(100, score));
}

function extractNewsTopics(articles: NewsArticle[]) {
	const topics = ["決算", "新製品", "提携", "買収", "規制", "技術革新"];
	return topics.filter((topic) =>
		articles.some(
			(article) =>
				article.title.includes(topic) || article.description.includes(topic),
		),
	);
}

async function getSectorComparison(sector: string, currentSymbol: string) {
	// 簡易的なセクター比較（実際の実装ではより複雑な分析を行う）
	const sectorStocks: Record<string, string[]> = {
		Technology: ["AAPL", "GOOGL", "MSFT", "META"],
		Automotive: ["TSLA", "7203"],
		"E-commerce": ["AMZN"],
		Semiconductors: ["NVDA"],
		Entertainment: ["NFLX"],
	};

	const peers = sectorStocks[sector]?.filter((s) => s !== currentSymbol) || [];

	return {
		sector,
		peers,
		analysis: `${sector}セクターの中で${currentSymbol}は${peers.length > 0 ? "主要企業の一つ" : "特殊な位置"}`,
	};
}

function generateSummaryMessage(analysis: AnalysisData) {
	const {
		symbol,
		companyName,
		priceAnalysis,
		newsAnalysis,
		overallAssessment,
	} = analysis;

	return `📈 ${companyName} (${symbol}) 市場分析結果:
    
💰 株価: $${priceAnalysis.currentPrice} (${priceAnalysis.priceChangePercent >= 0 ? "+" : ""}${priceAnalysis.priceChangePercent}%) - ${priceAnalysis.trend}トレンド
📰 ニュース: ${newsAnalysis.totalNews}件（24時間以内: ${newsAnalysis.recentNewsCount}件）
😊 市場心理: ${newsAnalysis.sentiment}
📊 推奨: ${overallAssessment.recommendation}
⚠️  リスクレベル: ${overallAssessment.riskLevel}
🎯 信頼度: ${overallAssessment.confidenceScore}%

${priceAnalysis.volatility === "高" ? "⚠️ 高いボラティリティに注意が必要です。" : ""}`;
}
