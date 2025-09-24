import { createTool } from "@voltagent/core";
import { z } from "zod";
import type {
	CryptoData,
	CryptoDataResponse,
	NewsArticle,
	NewsSearchResponse,
} from "../types";
import { cryptoDataTool } from "./crypto";
import { cryptoNewsSearchTool } from "./news";

// 暗号通貨分析レポートの型定義
interface CryptoAnalysisReport {
	cryptoId: string;
	cryptoName: string;
	symbol: string;
	analysisDate: string;
	marketDataSummary: {
		currentPriceUsd: number;
		currentPriceJpy: number;
		priceChange24h: number;
		priceChangePercentage24h: number;
		marketCapUsd: number;
		volumeUsd: number;
		marketCapRank?: string;
		volatilityLevel: string;
	};
	newsSentimentAnalysis: {
		totalArticles: number;
		sentiment: string;
		keyTopics: string[];
		recentNewsCount: number;
		sentimentScore: number;
	};
	conclusion: {
		overallAssessment: string;
		riskLevel: string;
		recommendationSummary: string;
		keyFactors: string[];
		confidenceLevel: number;
	};
	detailedAnalysis?: {
		technicalIndicators: string[];
		marketComparison: string;
		futureOutlook: string;
	};
}

/**
 * 暗号通貨総合分析ツール
 * CoinGecko APIとNews APIを統合して暗号通貨の包括的分析レポートを生成
 * 市場データサマリー、最新ニュースのセンチメント、結論の3セクション構成
 */
export const cryptoAnalysisTool = createTool({
	name: "analyzeCryptocurrency",
	description:
		"指定された暗号通貨について市場データとニュースを統合分析し、日本語レポートを生成する",
	parameters: z.object({
		cryptoId: z
			.string()
			.describe("分析する暗号通貨ID（例：bitcoin, ethereum, cardano, solana）"),
		includeDetailedAnalysis: z
			.boolean()
			.optional()
			.default(false)
			.describe("詳細分析を含めるか（技術指標、市場比較等）"),
		newsCount: z
			.number()
			.optional()
			.default(15)
			.describe("収集するニュース記事数（デフォルト: 10、最大: 20）"),
	}),
	execute: async ({
		cryptoId,
		includeDetailedAnalysis = false,
		newsCount = 15,
	}) => {
		// パラメータの型チェックと制限
		const validatedCryptoId = cryptoId as string;
		const validatedNewsCount = Math.min(Math.max(newsCount as number, 1), 20); // 1-20の範囲に制限
		try {
			console.log(`🚀 ${validatedCryptoId}の総合分析を開始します...`);

			// 1. 市場データの取得
			console.log("📊 CoinGecko APIから市場データを取得中...");
			const marketDataResult = (await cryptoDataTool.execute({
				cryptoId: validatedCryptoId,
				vs_currencies: ["usd", "jpy"],
			})) as CryptoDataResponse;

			const marketData = marketDataResult.data;
			if (!marketData) {
				const errorMessage = `${validatedCryptoId}の市場データが取得できませんでした`;
				console.error(`❌ 市場データエラー: ${errorMessage}`);
				throw new Error(errorMessage);
			}

			// 2. 関連ニュースの収集
			console.log("📰 News APIから関連ニュースを収集中...");
			const newsResult = (await cryptoNewsSearchTool.execute({
				query: validatedCryptoId,
				language: "en",
				sortBy: "publishedAt",
				pageSize: validatedNewsCount,
			})) as NewsSearchResponse;

			// ニュース取得でエラーが発生した場合は処理を停止
			if (!newsResult.data) {
				const errorMessage = `${validatedCryptoId}のニュース収集に失敗しました: ${newsResult.message}`;
				console.error(`❌ ニュース収集エラー: ${errorMessage}`);
				throw new Error(errorMessage);
			}

			const newsData = newsResult;
			const articles = newsData.data || [];

			// 3. 分析レポートの生成
			console.log("🔍 統合分析レポートを生成中...");

			const report: CryptoAnalysisReport = {
				cryptoId: marketData.id,
				cryptoName: marketData.name,
				symbol: marketData.symbol,
				analysisDate: new Date().toISOString(),

				// 市場データサマリー
				marketDataSummary: {
					currentPriceUsd: marketData.current_price_usd,
					currentPriceJpy: marketData.current_price_jpy,
					priceChange24h: marketData.price_change_24h,
					priceChangePercentage24h: marketData.price_change_percentage_24h,
					marketCapUsd: marketData.market_cap_usd,
					volumeUsd: marketData.total_volume_usd,
					volatilityLevel: analyzeVolatility(
						marketData.price_change_percentage_24h,
					),
				},

				// ニュースセンチメント分析
				newsSentimentAnalysis: {
					totalArticles: articles.length,
					sentiment: newsData.sentiment || "中立",
					keyTopics: extractKeyTopics(articles),
					recentNewsCount: countRecentNews(articles, 24), // 24時間以内
					sentimentScore: calculateSentimentScore(newsData.sentiment || "中立"),
				},

				// 結論
				conclusion: {
					overallAssessment: generateOverallAssessment(
						marketData,
						newsData.sentiment || "中立",
					),
					riskLevel: assessRiskLevel(
						Math.abs(marketData.price_change_percentage_24h),
						marketData.total_volume_usd,
						newsData.sentiment || "中立",
					),
					recommendationSummary: generateRecommendationSummary(
						marketData.price_change_percentage_24h,
						newsData.sentiment || "中立",
						articles.length,
					),
					keyFactors: identifyKeyFactors(marketData, articles),
					confidenceLevel: calculateConfidenceLevel(
						marketData,
						articles.length,
					),
				},
			};

			// 詳細分析（オプション）
			if (includeDetailedAnalysis) {
				report.detailedAnalysis = {
					technicalIndicators: generateTechnicalIndicators(marketData),
					marketComparison: generateMarketComparison(marketData),
					futureOutlook: generateFutureOutlook(
						marketData,
						newsData.sentiment || "中立",
					),
				};
			}

			// 日本語レポートの生成
			const japaneseReport = generateJapaneseReport(report);

			return {
				cryptoId: report.cryptoId,
				report: report,
				japaneseReport: japaneseReport,
				marketData: marketDataResult,
				newsData: newsData,
				message: `${report.cryptoName} (${report.symbol})の包括的分析レポートを生成しました。`,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			const errorMessage = `${validatedCryptoId}の総合分析に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`;
			console.error(`❌ 分析処理エラー: ${errorMessage}`);
			throw error;
		}
	},
});

// ヘルパー関数

function analyzeVolatility(priceChangePercent: number): string {
	const absChange = Math.abs(priceChangePercent);
	if (absChange > 15) return "非常に高い";
	if (absChange > 10) return "高い";
	if (absChange > 5) return "中程度";
	if (absChange > 2) return "低い";
	return "非常に低い";
}

function extractKeyTopics(articles: NewsArticle[]): string[] {
	const topics = [
		"価格変動",
		"技術開発",
		"規制",
		"採用",
		"パートナーシップ",
		"DeFi",
		"NFT",
		"機関投資",
		"アップデート",
		"セキュリティ",
	];

	return topics.filter((topic) => {
		const topicKeywords: Record<string, string[]> = {
			価格変動: ["price", "surge", "drop", "rally", "crash", "pump"],
			技術開発: ["development", "upgrade", "technology", "innovation"],
			規制: ["regulation", "regulatory", "compliance", "legal"],
			採用: ["adoption", "mainstream", "institutional", "integration"],
			パートナーシップ: ["partnership", "collaboration", "alliance"],
			DeFi: ["defi", "decentralized", "yield", "liquidity"],
			NFT: ["nft", "collectible", "digital art"],
			機関投資: ["institutional", "fund", "investment", "corporate"],
			アップデート: ["update", "upgrade", "release", "launch"],
			セキュリティ: ["security", "hack", "vulnerability", "breach"],
		};

		const keywords = topicKeywords[topic] || [];
		return articles.some((article) =>
			keywords.some(
				(keyword) =>
					article.title?.toLowerCase().includes(keyword) ||
					article.description?.toLowerCase().includes(keyword),
			),
		);
	});
}

function countRecentNews(articles: NewsArticle[], hours: number): number {
	const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
	return articles.filter((article) => new Date(article.publishedAt) > cutoff)
		.length;
}

function calculateSentimentScore(sentiment: string): number {
	const sentimentMap: Record<string, number> = {
		非常にポジティブ: 90,
		ポジティブ: 70,
		中立: 50,
		ネガティブ: 30,
		非常にネガティブ: 10,
	};
	return sentimentMap[sentiment] || 50;
}

function generateOverallAssessment(
	marketData: CryptoData,
	sentiment: string,
): string {
	const priceChange = marketData.price_change_percentage_24h;
	const volume = marketData.total_volume_usd;

	if (priceChange > 10 && sentiment === "ポジティブ") {
		return "強力な上昇トレンドで、市場センチメントも良好";
	}
	if (priceChange < -10 && sentiment === "ネガティブ") {
		return "下落トレンドで、市場センチメントも悪化";
	}
	if (Math.abs(priceChange) < 2) {
		return "価格は安定しており、レンジ相場が継続";
	}
	if (volume > 1000000000) {
		return "高い取引量と注目度を維持";
	}
	return "混合的なシグナルで、慎重な観察が必要";
}

function assessRiskLevel(
	volatility: number,
	volume: number,
	sentiment: string,
): string {
	let riskScore = 0;

	// ボラティリティによるリスク
	if (volatility > 15) riskScore += 3;
	else if (volatility > 10) riskScore += 2;
	else if (volatility > 5) riskScore += 1;

	// 取引量によるリスク調整
	if (volume < 100000000) riskScore += 1; // 低流動性リスク

	// センチメントによるリスク調整
	if (sentiment === "ネガティブ" || sentiment === "非常にネガティブ")
		riskScore += 1;

	if (riskScore >= 4) return "高";
	if (riskScore >= 2) return "中";
	return "低";
}

function generateRecommendationSummary(
	priceChange: number,
	sentiment: string,
	newsCount: number,
): string {
	if (priceChange > 5 && sentiment === "ポジティブ" && newsCount >= 5) {
		return "上昇トレンドと良好なニュースフローにより、短期的に楽観視";
	}
	if (priceChange < -5 && sentiment === "ネガティブ") {
		return "下落圧力とネガティブなセンチメントにより、慎重な姿勢を推奨";
	}
	if (Math.abs(priceChange) < 2) {
		return "安定的な価格動向、長期投資に適している可能性";
	}
	return "混合的なシグナルのため、追加情報の収集を推奨";
}

function identifyKeyFactors(
	marketData: CryptoData,
	articles: NewsArticle[],
): string[] {
	const factors = [];

	if (Math.abs(marketData.price_change_percentage_24h) > 5) {
		factors.push("大幅な価格変動");
	}
	if (marketData.total_volume_usd > 1000000000) {
		factors.push("高い取引量");
	}
	if (articles.length >= 10) {
		factors.push("豊富なニュースカバレッジ");
	}
	if (marketData.market_cap_usd > 10000000000) {
		factors.push("大型時価総額");
	}

	return factors;
}

function calculateConfidenceLevel(
	marketData: CryptoData,
	newsCount: number,
): number {
	let confidence = 50;

	// ニュース数による信頼度
	confidence += Math.min(newsCount * 3, 30);

	// 取引量による信頼度
	if (marketData.total_volume_usd > 1000000000) confidence += 10;
	else if (marketData.total_volume_usd > 100000000) confidence += 5;

	// 時価総額による信頼度
	if (marketData.market_cap_usd > 10000000000) confidence += 10;

	return Math.min(95, confidence);
}

function generateTechnicalIndicators(marketData: CryptoData): string[] {
	const indicators = [];

	const priceChange = marketData.price_change_percentage_24h;
	if (priceChange > 5) indicators.push("短期上昇モメンタム");
	if (priceChange < -5) indicators.push("短期下落モメンタム");
	if (Math.abs(priceChange) < 2) indicators.push("価格レンジ内推移");

	const volume = marketData.total_volume_usd;
	if (volume > 1000000000) indicators.push("高流動性");
	else if (volume < 100000000) indicators.push("低流動性リスク");

	return indicators;
}

function generateMarketComparison(marketData: CryptoData): string {
	const marketCap = marketData.market_cap_usd;

	if (marketCap > 100000000000) {
		return "ビットコイン・イーサリアムレベルの大型通貨";
	}
	if (marketCap > 10000000000) {
		return "主要アルトコインクラスの中型通貨";
	}
	if (marketCap > 1000000000) {
		return "新興アルトコインクラスの小型通貨";
	}
	return "マイクロキャップクラスの通貨";
}

function generateFutureOutlook(
	marketData: CryptoData,
	sentiment: string,
): string {
	const priceChange = marketData.price_change_percentage_24h;

	if (priceChange > 10 && sentiment === "ポジティブ") {
		return "短期的な上昇トレンド継続の可能性が高い";
	}
	if (priceChange < -10 && sentiment === "ネガティブ") {
		return "下落圧力継続のリスクに注意が必要";
	}
	if (Math.abs(priceChange) < 2) {
		return "安定的な価格推移が継続する見込み";
	}
	return "不確実性が高く、慎重な監視が必要";
}

function generateJapaneseReport(report: CryptoAnalysisReport): string {
	const marketSummary = report.marketDataSummary;
	const newsSummary = report.newsSentimentAnalysis;
	const conclusion = report.conclusion;

	return `# ${report.cryptoName} (${report.symbol}) 暗号通貨分析レポート

## 📊 市場データサマリー

**現在価格:**
- USD: $${marketSummary.currentPriceUsd.toLocaleString()}
- JPY: ¥${marketSummary.currentPriceJpy.toLocaleString()}

**24時間変動:**
- 価格変動: ${marketSummary.priceChangePercentage24h >= 0 ? "+" : ""}${marketSummary.priceChangePercentage24h.toFixed(2)}%
- 変動額: ${marketSummary.priceChange24h >= 0 ? "+" : ""}$${marketSummary.priceChange24h.toFixed(4)}

**市場指標:**
- 時価総額: $${(marketSummary.marketCapUsd / 1000000000).toFixed(2)}B
- 24時間取引量: $${(marketSummary.volumeUsd / 1000000).toFixed(2)}M
- ボラティリティレベル: ${marketSummary.volatilityLevel}

## 📰 最新ニュースのセンチメント

**ニュース分析:**
- 取得記事数: ${newsSummary.totalArticles}件
- 24時間以内の記事: ${newsSummary.recentNewsCount}件
- 市場センチメント: ${newsSummary.sentiment}
- センチメントスコア: ${newsSummary.sentimentScore}/100

**主要トピック:**
${newsSummary.keyTopics.map((topic) => `- ${topic}`).join("\n")}

## 🎯 結論

**総合評価:**
${conclusion.overallAssessment}

**リスクレベル:** ${conclusion.riskLevel}

**推奨サマリー:**
${conclusion.recommendationSummary}

**主要要因:**
${conclusion.keyFactors.map((factor) => `- ${factor}`).join("\n")}

**分析信頼度:** ${conclusion.confidenceLevel}%

---

*分析日時: ${new Date(report.analysisDate).toLocaleString("ja-JP")}*

**⚠️ 重要な免責事項:**
このレポートは情報提供のみを目的としており、投資助言ではありません。暗号通貨投資には高いリスクが伴います。投資判断は自己責任で行ってください。`;
}
