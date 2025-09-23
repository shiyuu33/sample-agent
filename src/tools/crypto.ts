import { createTool } from "@voltagent/core";
import { z } from "zod";
import axios from "axios";

// 暗号通貨データの型定義
interface CryptoData {
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

interface CryptoApiResponse {
	id: string;
	symbol: string;
	name: string;
	current_price: number;
	market_cap: number;
	total_volume: number;
	price_change_24h: number;
	price_change_percentage_24h: number;
	market_cap_change_24h: number;
	market_cap_change_percentage_24h: number;
	last_updated: string;
}

/**
 * 暗号通貨市場データ取得ツール
 * CoinGecko APIを使用して指定された暗号通貨の最新市場データを取得
 * 価格（円建て・ドル建て）、24時間取引量、市場キャップ（時価総額）を含む
 */
export const cryptoDataTool = createTool({
	name: "getCryptoData",
	description: "指定された暗号通貨の現在の市場データを取得する（CoinGecko API使用）",
	parameters: z.object({
		cryptoId: z
			.string()
			.describe("暗号通貨ID（例：bitcoin, ethereum, cardano, solana, dogecoin）"),
		vs_currencies: z
			.array(z.string())
			.optional()
			.default(["usd", "jpy"])
			.describe("表示通貨（デフォルト: USD, JPY）"),
	}),
	execute: async ({ cryptoId, vs_currencies = ["usd", "jpy"] }) => {
		try {
			console.log(`🔍 ${cryptoId}の市場データを取得中...`);

			// CoinGecko API エンドポイント
			const baseUrl = "https://api.coingecko.com/api/v3";
			const endpoint = `/coins/${cryptoId}`;

			// APIリクエスト
			const response = await axios.get(`${baseUrl}${endpoint}`, {
				params: {
					localization: false,
					tickers: false,
					market_data: true,
					community_data: false,
					developer_data: false,
					sparkline: false
				},
				headers: {
					'Accept': 'application/json',
				},
				timeout: 10000, // 10秒タイムアウト
			});

			const data = response.data;

			if (!data || !data.market_data) {
				return {
					cryptoId: cryptoId,
					error: "市場データが見つかりません",
					message: `暗号通貨「${cryptoId}」の市場データを取得できませんでした。正しいIDを確認してください。`,
					suggestedIds: ["bitcoin", "ethereum", "cardano", "solana", "dogecoin", "chainlink", "polkadot"]
				};
			}

			// データの整形
			const marketData = data.market_data;
			const cryptoData: CryptoData = {
				id: data.id,
				symbol: data.symbol?.toUpperCase() || "N/A",
				name: data.name || "N/A",
				current_price_usd: marketData.current_price?.usd || 0,
				current_price_jpy: marketData.current_price?.jpy || 0,
				market_cap_usd: marketData.market_cap?.usd || 0,
				market_cap_jpy: marketData.market_cap?.jpy || 0,
				total_volume_usd: marketData.total_volume?.usd || 0,
				total_volume_jpy: marketData.total_volume?.jpy || 0,
				price_change_24h: marketData.price_change_24h || 0,
				price_change_percentage_24h: marketData.price_change_percentage_24h || 0,
				market_cap_change_24h: marketData.market_cap_change_24h || 0,
				market_cap_change_percentage_24h: marketData.market_cap_change_percentage_24h || 0,
				last_updated: marketData.last_updated || new Date().toISOString()
			};

			// 取引量分析
			const volumeAnalysis = analyzeVolume(cryptoData.total_volume_usd);

			// 価格変動分析
			const volatilityAnalysis = analyzeVolatility(cryptoData.price_change_percentage_24h);

			// 市場キャップ分析
			const marketCapAnalysis = analyzeMarketCap(cryptoData.market_cap_usd);

			const message = generateCryptoSummary(cryptoData, volumeAnalysis, volatilityAnalysis, marketCapAnalysis);

			return {
				cryptoId: cryptoData.id,
				data: cryptoData,
				analysis: {
					volume: volumeAnalysis,
					volatility: volatilityAnalysis,
					marketCap: marketCapAnalysis
				},
				message: message,
				timestamp: new Date().toISOString()
			};

		} catch (error) {
			console.error(`❌ ${cryptoId}の市場データ取得中にエラー:`, error);

			if (axios.isAxiosError(error)) {
				if (error.response?.status === 404) {
					const errorMessage = `暗号通貨ID「${cryptoId}」は存在しません。正しいIDを確認してください。`;
					console.error(`❌ 暗号通貨が見つかりません: ${errorMessage}`);
					throw new Error(errorMessage);
				}
				if (error.response?.status === 429) {
					const errorMessage = "CoinGecko APIのリクエスト制限に達しました。しばらく待ってから再試行してください。";
					console.error(`❌ APIレート制限: ${errorMessage}`);
					throw new Error(errorMessage);
				}
				if (error.response?.status === 403) {
					const errorMessage = "CoinGecko APIへのアクセスが拒否されました。API権限を確認してください。";
					console.error(`❌ APIアクセス拒否: ${errorMessage}`);
					throw new Error(errorMessage);
				}
			}

			// その他のエラーもすべて再スローして処理を停止
			const errorMessage = `${cryptoId}の市場データ取得に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`;
			console.error(`❌ データ取得エラー: ${errorMessage}`);
			throw new Error(errorMessage);
		}
	},
});

// ヘルパー関数

function analyzeVolume(volumeUsd: number): string {
	if (volumeUsd > 10000000000) return "非常に高い"; // 100億USD以上
	if (volumeUsd > 1000000000) return "高い"; // 10億USD以上
	if (volumeUsd > 100000000) return "中程度"; // 1億USD以上
	if (volumeUsd > 10000000) return "低い"; // 1000万USD以上
	return "非常に低い";
}

function analyzeVolatility(priceChangePercent: number): string {
	const absChange = Math.abs(priceChangePercent);
	if (absChange > 20) return "非常に高い";
	if (absChange > 10) return "高い";
	if (absChange > 5) return "中程度";
	if (absChange > 2) return "低い";
	return "非常に低い";
}

function analyzeMarketCap(marketCapUsd: number): string {
	if (marketCapUsd > 100000000000) return "大型（100B+ USD）"; // 1000億USD以上
	if (marketCapUsd > 10000000000) return "中型（10B-100B USD）"; // 100億-1000億USD
	if (marketCapUsd > 1000000000) return "小型（1B-10B USD）"; // 10億-100億USD
	if (marketCapUsd > 100000000) return "マイクロ（100M-1B USD）"; // 1億-10億USD
	return "ナノ（<100M USD）";
}

function generateCryptoSummary(
	data: CryptoData,
	volumeAnalysis: string,
	volatilityAnalysis: string,
	marketCapAnalysis: string
): string {
	const changeDirection = data.price_change_percentage_24h >= 0 ? "上昇" : "下降";
	const changeIcon = data.price_change_percentage_24h >= 0 ? "📈" : "📉";

	return `🪙 ${data.name} (${data.symbol}) 市場データ:

💰 価格:
  - USD: $${data.current_price_usd.toLocaleString()}
  - JPY: ¥${data.current_price_jpy.toLocaleString()}

${changeIcon} 24時間変動:
  - 価格変動: ${data.price_change_percentage_24h.toFixed(2)}% (${changeDirection})
  - 変動額 (USD): $${data.price_change_24h.toFixed(4)}

📊 市場指標:
  - 時価総額 (USD): $${(data.market_cap_usd / 1000000000).toFixed(2)}B (${marketCapAnalysis})
  - 時価総額 (JPY): ¥${(data.market_cap_jpy / 1000000000000).toFixed(2)}兆円
  - 24時間取引量 (USD): $${(data.total_volume_usd / 1000000).toFixed(2)}M

📈 分析:
  - 取引量: ${volumeAnalysis}
  - ボラティリティ: ${volatilityAnalysis}
  
最終更新: ${new Date(data.last_updated).toLocaleString('ja-JP')}`;
}
