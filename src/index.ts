import "dotenv/config";
import { google } from "@ai-sdk/google";
import { Agent, Memory, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { marketAnalysisTool, newsSearchTool, stockPriceTool } from "./tools";
import { expenseApprovalWorkflow } from "./workflows";

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
		"A helpful assistant that can search news, get stock prices, and perform market analysis. I specialize in financial research, investment insights, and business information analysis.",
	model: google("gemini-2.0-flash-exp"),
	tools: [newsSearchTool, stockPriceTool, marketAnalysisTool],
	memory,
});

// 市場分析専門サブエージェント
const marketAnalyst = new Agent({
	name: "market-analyst",
	instructions:
		"I am a specialized market analyst agent. I focus on analyzing stock prices, news sentiment, and providing investment insights. I use comprehensive data analysis to provide accurate market assessments.",
	model: google("gemini-2.0-flash-exp"),
	tools: [stockPriceTool, newsSearchTool, marketAnalysisTool],
	memory,
});

// ニュース検索専門サブエージェント
const newsResearcher = new Agent({
	name: "news-researcher",
	instructions:
		"I am a specialized news research agent. I excel at finding relevant news articles, analyzing information trends, and providing summarized insights about companies and market events.",
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
		expenseApprovalWorkflow,
	},
	server: honoServer(),
	logger,
	voltOpsClient: new VoltOpsClient({
		publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
		secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
	}),
});
