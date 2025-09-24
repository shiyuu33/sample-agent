/**
 * 共通型定義ファイル
 * アプリケーション全体で使用される型定義を集約
 */

// API共通レスポンス型
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: ApiError;
	timestamp: string;
}

export interface ApiError {
	code: string;
	message: string;
	details?: Record<string, unknown> | string | null;
	httpStatus?: number;
}

// 暗号通貨データ型（CoinGecko API レスポンス構造に対応）
export interface CryptoData {
	id: string;
	symbol: string;
	name: string;
	current_price_usd: number;
	current_price_jpy: number;
	market_cap_usd: number;
	market_cap_jpy: number;
	total_volume_usd: number;
	total_volume_jpy: number;
	price_change_24h: number;
	price_change_percentage_24h: number;
	market_cap_change_24h: number;
	market_cap_change_percentage_24h: number;
	last_updated: string;
}

// CoinGecko API の実際のレスポンス型
export interface CoinGeckoApiResponse {
	id: string;
	symbol: string;
	name: string;
	market_data: {
		current_price: Record<string, number>;
		market_cap: Record<string, number>;
		total_volume: Record<string, number>;
		price_change_24h: number;
		price_change_percentage_24h: number;
		market_cap_change_24h: number;
		market_cap_change_percentage_24h: number;
		last_updated: string;
	};
	last_updated: string;
}

export interface CryptoAnalysis {
	volume: string;
	volatility: string;
	marketCap: string;
}

export interface CryptoDataResponse extends ApiResponse<CryptoData> {
	analysis?: CryptoAnalysis;
	message?: string;
}

// ニュース関連型
export interface NewsArticle {
	title: string;
	description: string;
	url: string;
	publishedAt: string;
	source: string;
	urlToImage?: string;
	content?: string;
}

export interface NewsSearchResponse extends ApiResponse<NewsArticle[]> {
	query: string;
	language: string;
	totalFound: number;
	actualReturned: number;
	sentiment: string;
	searchTime: string;
	message?: string;
}

// 暗号通貨分析レポート型
export interface CryptoAnalysisReport {
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

export interface CryptoAnalysisResponse
	extends ApiResponse<CryptoAnalysisReport> {
	japaneseReport: string;
	marketData: CryptoDataResponse;
	newsData: NewsSearchResponse;
	message?: string;
}

// 設定型
export interface AppConfig {
	apis: {
		coinGecko: {
			baseUrl: string;
			timeout: number;
			retries: number;
			headers: {
				Accept: string;
				"x-cg-demo-api-key": string;
			};
		};
		newsApi: {
			baseUrl: string;
			timeout: number;
			maxPageSize: number;
			headers: {
				"X-API-Key": string;
				Accept: string;
			};
		};
	};
}

// エラーコード定義
export enum ErrorCodes {
	API_KEY_MISSING = "API_KEY_MISSING",
	API_RATE_LIMIT = "API_RATE_LIMIT",
	API_UNAUTHORIZED = "API_UNAUTHORIZED",
	API_FORBIDDEN = "API_FORBIDDEN",
	CRYPTO_NOT_FOUND = "CRYPTO_NOT_FOUND",
	NETWORK_ERROR = "NETWORK_ERROR",
	VALIDATION_ERROR = "VALIDATION_ERROR",
	UNKNOWN_ERROR = "UNKNOWN_ERROR",
}
