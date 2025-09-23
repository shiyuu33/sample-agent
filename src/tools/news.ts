import { createTool } from "@voltagent/core";
import { z } from "zod";

// ニュース記事の型定義
const NewsArticle = z.object({
	title: z.string(),
	description: z.string(),
	url: z.string(),
	publishedAt: z.string(),
	source: z.string(),
});

/**
 * ニュース検索ツール
 * 指定されたキーワードで最新ニュースを検索
 * デモ用にモックデータを使用（実際の実装ではNews API等を使用）
 */
export const newsSearchTool = createTool({
	name: "searchNews",
	description: "指定されたキーワードで最新ニュースを検索する",
	parameters: z.object({
		query: z.string().describe("検索キーワード（例：Apple, Tesla, 半導体）"),
		category: z
			.string()
			.optional()
			.describe("カテゴリ（business, technology, finance, market）"),
		count: z
			.number()
			.optional()
			.default(5)
			.describe("取得する記事数（デフォルト: 5）"),
	}),
	execute: async ({ query, category, count = 5 }) => {
		try {
			// デモ用のモックニュースデータ
			const mockNewsTemplates = [
				{
					title: `${query}の第4四半期業績が予想を上回る`,
					description: `${query}の最新四半期決算で、売上高と利益が市場予想を大幅に上回った。業界全体への影響も注目される。`,
					source: "TechNews",
				},
				{
					title: `${query}関連株に注目、新技術発表で株価上昇`,
					description: `${query}が発表した新技術により、関連企業の株価が軒並み上昇。投資家の関心が高まっている。`,
					source: "BusinessDaily",
				},
				{
					title: `${query}の市場シェア拡大、競合他社への影響は？`,
					description: `${query}の市場シェア拡大により、業界構造に変化の兆し。競合他社の対応策に注目が集まる。`,
					source: "MarketWatch",
				},
				{
					title: `専門家が語る${query}の将来性と投資戦略`,
					description: `業界専門家による${query}の詳細分析。今後の成長可能性と投資における注意点を解説。`,
					source: "InvestmentJournal",
				},
				{
					title: `${query}の新製品発表が業界に与える影響`,
					description: `${query}が発表した革新的な新製品により、業界の競争環境が大きく変わる可能性が浮上。`,
					source: "InnovationToday",
				},
			];

			// カテゴリに応じてニュースをフィルタリング（簡易実装）
			let filteredNews = mockNewsTemplates;
			if (category) {
				// カテゴリに応じた追加情報を付与
				filteredNews = mockNewsTemplates.map((news) => ({
					...news,
					title: `[${category.toUpperCase()}] ${news.title}`,
				}));
			}

			// 現在時刻から過去24時間以内のランダムな時刻を生成
			const generateRecentDate = () => {
				const now = new Date();
				const hoursAgo = Math.floor(Math.random() * 24);
				const minutesAgo = Math.floor(Math.random() * 60);
				return new Date(
					now.getTime() - (hoursAgo * 60 + minutesAgo) * 60 * 1000,
				).toISOString();
			};

			// 完全なニュース記事を生成
			const articles = filteredNews.slice(0, count).map((template, index) => ({
				title: template.title,
				description: template.description,
				url: `https://example.com/news/${query.toLowerCase()}-${index + 1}`,
				publishedAt: generateRecentDate(),
				source: template.source,
			}));

			return {
				query,
				category: category || "general",
				articles,
				totalFound: articles.length,
				searchTime: new Date().toISOString(),
				message: `「${query}」に関するニュースを${articles.length}件見つけました。${category ? `カテゴリ: ${category}` : ""}`,
			};
		} catch (error) {
			return {
				query,
				error: "ニュース検索中にエラーが発生しました",
				articles: [],
				totalFound: 0,
				message: `「${query}」のニュース検索に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
			};
		}
	},
});
