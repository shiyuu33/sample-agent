import "dotenv/config";
import { google } from "@ai-sdk/google";
import { Agent, Memory, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { marketAnalysisTool, newsSearchTool, stockPriceTool } from "./tools";
import { investmentDecisionWorkflow } from "./workflows";

// Create a logger instance
const logger = createPinoLogger({
	name: "sample-agent",
	level: "info",
});

// Configure persistent memory (LibSQL / SQLite)
const memory = new Memory({
	storage: new LibSQLMemoryAdapter({
		url: "file:./.voltagent/memory.db",
		logger: logger.child({ component: "libsql" }),
	}),
});

// メインエージェント
const agent = new Agent({
	name: "sample-agent",
	instructions:
		"ニュース検索、株価取得、市場分析を行う便利なアシスタントです。金融リサーチ、投資インサイト、ビジネス情報分析を専門としています。",
	model: google("gemini-2.0-flash-exp"),
	tools: [newsSearchTool, stockPriceTool, marketAnalysisTool],
	memory,
});

// 市場分析専門サブエージェント
const marketAnalyst = new Agent({
	name: "market-analyst",
	instructions:
		"私は市場分析に特化したエージェントです。株価分析、ニュースセンチメント分析、投資インサイトの提供に焦点を当てています。包括的なデータ分析を用いて正確な市場評価を提供します。",
	model: google("gemini-2.0-flash-exp"),
	tools: [stockPriceTool, newsSearchTool, marketAnalysisTool],
	memory,
});

// ニュース検索専門サブエージェント
const newsResearcher = new Agent({
	name: "news-researcher",
	instructions:
		"私はニュース調査に特化したエージェントです。関連するニュース記事の検索、情報トレンドの分析、企業や市場イベントに関する要約されたインサイトの提供を得意としています。",
	model: google("gemini-2.0-flash-exp"),
	tools: [newsSearchTool],
	memory,
});

new VoltAgent({
	agents: {
		agent,
		marketAnalyst,
		newsResearcher,
	},
	workflows: {
		investmentDecisionWorkflow,
	},
	server: honoServer(),
	logger,
	voltOpsClient: new VoltOpsClient({
		publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
		secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
	}),
});
