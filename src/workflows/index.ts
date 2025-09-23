import { Agent, createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

// ==============================================================================
// Investment Decision Workflow
// 投資判断ワークフロー - 金融分析結果に基づく投資意思決定
// 
// 使用例:
// 1. 市場分析の実行
// 2. リスク評価の自動化
// 3. 投資額に応じた承認プロセス
// 4. ポートフォリオへの影響分析
//
// Test Scenarios for VoltOps Platform
//
// Scenario 1: 低リスク小額投資 (自動承認)
// Input JSON:
// {
//   "symbol": "AAPL",
//   "amount": 5000,
//   "investorId": "INV-001",
//   "portfolioId": "PF-001"
// }
// Result: 自動承認（リスクが低く、投資額が小さい）
//
// Scenario 2: 中リスク中額投資 (アナリスト承認)
// Input JSON:
// {
//   "symbol": "TSLA", 
//   "amount": 50000,
//   "investorId": "INV-002",
//   "portfolioId": "PF-002"
// }
// Result: アナリスト承認待ち
//
// Scenario 3: 高リスク高額投資 (ディレクター承認)
// Input JSON:
// {
//   "symbol": "NVDA",
//   "amount": 500000,
//   "investorId": "INV-003", 
//   "portfolioId": "PF-003"
// }
// Result: ディレクター承認が必要
// ==============================================================================
export const investmentDecisionWorkflow = createWorkflowChain({
	id: "investment-decision",
	name: "Investment Decision Workflow",
	purpose: "投資判断ワークフロー - 市場分析に基づく投資意思決定プロセス",

	input: z.object({
		symbol: z.string().describe("投資対象の銘柄コード"),
		amount: z.number().describe("投資予定額（USD）"),
		investorId: z.string().describe("投資家ID"),
		portfolioId: z.string().describe("ポートフォリオID"),
	}),
	result: z.object({
		status: z.enum(["approved", "rejected", "pending"]),
		approvedBy: z.string(),
		finalAmount: z.number(),
		riskLevel: z.string(),
		recommendation: z.string(),
	}),
})
	// Step 1: 市場分析とリスク評価
	.andThen({
		id: "market-analysis",
		execute: async ({ data }) => {
			console.log(`🔍 ${data.symbol} の市場分析を開始（投資額: $${data.amount}）`);

			// 簡易リスク評価（実際の実装では marketAnalysisTool を使用）
			const volatilityMap: Record<string, string> = {
				"AAPL": "low",
				"GOOGL": "low", 
				"MSFT": "low",
				"TSLA": "high",
				"NVDA": "high",
				"META": "medium",
			};

			const riskLevel = volatilityMap[data.symbol] || "medium";
			const recommendation = generateRecommendation(data.amount, riskLevel);

			return {
				...data,
				riskLevel,
				recommendation,
				needsApproval: needsApproval(data.amount, riskLevel),
			};
		},
	})

	// Step 2: 承認プロセスの判定
	.andThen({
		id: "approval-process",
		resumeSchema: z.object({
			approved: z.boolean(),
			approverId: z.string(),
			comments: z.string().optional(),
			adjustedAmount: z.number().optional(),
		}),
		execute: async ({ data, suspend, resumeData }) => {
			// 承認者からの決定を受信した場合
			if (resumeData) {
				console.log(`承認者 ${resumeData.approverId} が判断を下しました`);
				return {
					...data,
					approved: resumeData.approved,
					approvedBy: resumeData.approverId,
					finalAmount: resumeData.adjustedAmount || data.amount,
					comments: resumeData.comments,
				};
			}

			// 承認が必要かどうかの判定
			if (data.needsApproval) {
				const approverType = data.amount > 100000 ? "ディレクター" : "アナリスト";
				console.log(`投資額 $${data.amount} (リスク: ${data.riskLevel}) - ${approverType}承認が必要`);

				// ワークフロー一時停止
				await suspend(`${approverType}承認待ち`, {
					symbol: data.symbol,
					amount: data.amount,
					riskLevel: data.riskLevel,
					recommendation: data.recommendation,
				});
			}

			// 自動承認（低リスク・少額投資）
			console.log(`投資を自動承認: ${data.symbol} - $${data.amount}`);
			return {
				...data,
				approved: true,
				approvedBy: "system",
				finalAmount: data.amount,
			};
		},
	})

	// Step 3: 最終決定の処理
	.andThen({
		id: "final-decision",
		execute: async ({ data }) => {
			if (data.approved) {
				console.log(`✅ 投資承認: ${data.symbol} - $${data.finalAmount}`);
			} else {
				console.log(`❌ 投資却下: ${data.symbol}`);
			}

			return {
				status: data.approved ? "approved" : "rejected",
				approvedBy: data.approvedBy,
				finalAmount: data.finalAmount,
				riskLevel: data.riskLevel,
				recommendation: data.recommendation,
			};
		},
	});

// ヘルパー関数
function generateRecommendation(amount: number, riskLevel: string): string {
	if (riskLevel === "high" && amount > 50000) {
		return "高リスク・高額投資のため慎重な検討が必要";
	}
	if (riskLevel === "low" && amount < 10000) {
		return "低リスク・少額投資のため推奨";
	}
	return "標準的な投資として検討可能";
}

function needsApproval(amount: number, riskLevel: string): boolean {
	// $10,000以上 または 高リスク銘柄の場合は承認が必要
	return amount >= 10000 || riskLevel === "high";
}
