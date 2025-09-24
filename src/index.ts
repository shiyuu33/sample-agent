import "dotenv/config";
import { google } from "@ai-sdk/google";
import { Agent, Memory, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import {
	cryptoAnalysisTool,
	cryptoDataTool,
	cryptoNewsSearchTool,
} from "./tools";
// import { cryptoAnalysisWorkflow } from "./workflows";

/**
 * アプリケーション用のロガーインスタンスを作成
 * Pinoログライブラリを使用して構造化ログを出力
 */
const logger = createPinoLogger({
	name: "crypto-analysis-agent",
	level: "info",
});

/**
 * 永続メモリの設定（LibSQL / SQLite）
 * エージェントの会話履歴と学習データを保存
 */
const memory = new Memory({
	storage: new LibSQLMemoryAdapter({
		url: "file:./.voltagent/memory.db",
		logger: logger.child({ component: "libsql" }),
	}),
});

// メイン暗号通貨分析エージェント
const cryptoAgent = new Agent({
	name: "crypto-analysis-agent",
	instructions:
		"暗号通貨の市場データ分析、ニュース収集、包括的レポート生成を行う専門AIエージェントです。CoinGecko APIとNews APIを使用してリアルタイムな暗号通貨分析を提供し、投資判断の参考情報を日本語で提供します。",
	model: google("gemini-2.0-flash-exp"),
	tools: [cryptoDataTool, cryptoNewsSearchTool, cryptoAnalysisTool],
	memory,
});

// 暗号通貨市場データ専門サブエージェント
const cryptoDataAnalyst = new Agent({
	name: "crypto-data-analyst",
	instructions:
		"私は暗号通貨市場データ分析に特化したエージェントです。CoinGecko APIを使用して価格、時価総額、取引量などの市場データを収集・分析し、技術的指標やトレンド分析を提供します。",
	model: google("gemini-2.0-flash-exp"),
	tools: [cryptoDataTool],
	memory,
});

// 暗号通貨ニュース専門サブエージェント
const cryptoNewsAnalyst = new Agent({
	name: "crypto-news-analyst",
	instructions:
		"私は暗号通貨関連ニュースの収集と分析に特化したエージェントです。News APIを使用して最新の暗号通貨ニュースを収集し、センチメント分析、トレンド分析、市場への影響評価を行います。",
	model: google("gemini-2.0-flash-exp"),
	tools: [cryptoNewsSearchTool],
	memory,
});

/**
 * VoltAgentシステムの初期化
 * 複数のエージェント、ワークフロー、サーバー、ロガーを統合
 */
new VoltAgent({
	agents: {
		cryptoAgent,
		cryptoDataAnalyst,
		cryptoNewsAnalyst,
	},
	workflows: {
		// cryptoAnalysisWorkflow,
	},
	server: honoServer(),
	logger,
	voltOpsClient: new VoltOpsClient({
		publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
		secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
	}),
});
