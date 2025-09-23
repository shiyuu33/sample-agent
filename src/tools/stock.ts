import { createTool } from "@voltagent/core";
import { z } from "zod";

// 株価データの型定義
const StockData = z.object({
	symbol: z.string(),
	name: z.string(),
	current: z.number(),
	change: z.number(),
	changePercent: z.number(),
	volume: z.number(),
	marketCap: z.number(),
	lastUpdated: z.string(),
});

/**
 * 株価取得ツール
 * 指定された銘柄の現在の株価情報を取得
 * デモ用にモックデータを使用（実際の実装ではYahoo Finance API等を使用）
 */
export const stockPriceTool = createTool({
	name: "getStockPrice",
	description: "指定された銘柄の現在の株価と関連情報を取得する",
	parameters: z.object({
		symbol: z
			.string()
			.describe("銘柄コード（例：AAPL, GOOGL, TSLA, MSFT, AMZN）"),
		includeNews: z
			.boolean()
			.optional()
			.default(false)
			.describe("関連ニュースも取得するか"),
	}),
	execute: async ({ symbol, includeNews = false }) => {
		try {
			// 有名な銘柄のマスタデータ
			const stockMasterData: Record<
				string,
				{ name: string; sector: string; basePrice: number }
			> = {
				AAPL: { name: "Apple Inc.", sector: "Technology", basePrice: 180 },
				GOOGL: { name: "Alphabet Inc.", sector: "Technology", basePrice: 140 },
				TSLA: { name: "Tesla Inc.", sector: "Automotive", basePrice: 200 },
				MSFT: {
					name: "Microsoft Corporation",
					sector: "Technology",
					basePrice: 380,
				},
				AMZN: { name: "Amazon.com Inc.", sector: "E-commerce", basePrice: 150 },
				META: {
					name: "Meta Platforms Inc.",
					sector: "Technology",
					basePrice: 350,
				},
				NVDA: {
					name: "NVIDIA Corporation",
					sector: "Semiconductors",
					basePrice: 500,
				},
				NFLX: { name: "Netflix Inc.", sector: "Entertainment", basePrice: 450 },
				"7203": { name: "トヨタ自動車", sector: "Automotive", basePrice: 2500 },
				"6758": {
					name: "ソニーグループ",
					sector: "Technology",
					basePrice: 12000,
				},
			};

			const symbolUpper = symbol.toUpperCase();
			const masterData = stockMasterData[symbolUpper];

			if (!masterData) {
				return {
					symbol: symbolUpper,
					error: "銘柄が見つかりません",
					availableSymbols: Object.keys(stockMasterData),
					message: `銘柄コード「${symbolUpper}」は見つかりませんでした。利用可能な銘柄: ${Object.keys(stockMasterData).join(", ")}`,
				};
			}

			// リアルな株価変動を模擬
			const variationPercent = (Math.random() - 0.5) * 0.1; // ±5%の変動
			const currentPrice = masterData.basePrice * (1 + variationPercent);
			const change = currentPrice - masterData.basePrice;
			const changePercent = (change / masterData.basePrice) * 100;

			// ボリュームと時価総額の生成
			const volume = Math.floor(Math.random() * 50000000) + 1000000; // 100万-5000万株
			const sharesOutstanding =
				Math.floor(Math.random() * 5000000000) + 1000000000; // 10億-50億株
			const marketCap = currentPrice * sharesOutstanding;

			const stockData = {
				symbol: symbolUpper,
				name: masterData.name,
				sector: masterData.sector,
				current: Math.round(currentPrice * 100) / 100,
				change: Math.round(change * 100) / 100,
				changePercent: Math.round(changePercent * 100) / 100,
				volume,
				marketCap: Math.round(marketCap),
				lastUpdated: new Date().toISOString(),
			};

			const result: any = {
				...stockData,
				message: `${stockData.name} (${symbolUpper}): $${stockData.current.toFixed(2)} ${stockData.change >= 0 ? "+" : ""}${stockData.change.toFixed(2)} (${stockData.changePercent >= 0 ? "+" : ""}${stockData.changePercent.toFixed(2)}%)`,
			};

			// 関連ニュースが要求された場合
			if (includeNews) {
				const relatedNews = [
					`${masterData.name}の業績発表に投資家の注目集まる`,
					`${masterData.name}の新戦略が市場に与える影響`,
					`${masterData.sector}セクター全体の動向と${masterData.name}の位置づけ`,
				];

				result.relatedNews = relatedNews;
				result.message += ` 関連ニュース${relatedNews.length}件も取得しました。`;
			}

			return result;
		} catch (error) {
			return {
				symbol: symbol.toUpperCase(),
				error: "株価取得中にエラーが発生しました",
				message: `銘柄「${symbol}」の株価取得に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
			};
		}
	},
});
