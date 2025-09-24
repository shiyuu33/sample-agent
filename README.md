## 🎯 概要

この**VoltAgent暗号通貨分析デモ**は、TypeScript製AIエージェントフレームワークVoltAgentの主要機能を実演するサンプルアプリケーションです。

**マルチエージェントアーキテクチャ**により、複数の専門エージェントが連携して暗号通貨の包括的な市場分析を行います。

### ✨ 主な特徴

- 🤖 **マルチエージェント連携**: 司令塔 + 専門エージェント構成
- 📊 **リアルタイム市場データ**: CoinGecko API統合
- 📰 **ニュース分析**: News API + センチメント分析
- 🧠 **永続メモリ**: LibSQL（SQLite）による会話履歴管理
- 👀 **可観測性**: VoltOpsによるリアルタイム監視
- 🛡️ **型安全性**: TypeScript + Zod完全対応


### インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-repo/sample-agent
cd sample-agent

# 依存関係をインストール
npm ci

# 環境変数をセットアップ
cp .env.example .env
```

### 実行

```bash
# 開発モード（ホットリロード）
npm run dev

# 本番ビルド
npm run build
npm start
```

アプリケーションは `http://localhost:3141` で起動します。

## 📊 VoltOps監視

### ローカル開発

1. アプリケーション起動: `npm run dev`
2. [VoltOps Console](https://console.voltagent.dev)にアクセス
3. 自動的に`localhost:3141`に接続

### 監視機能

- 🔍 **リアルタイム実行可視化**: エージェント間通信の追跡
- 🐛 **ステップバイステップデバッグ**: 各処理段階の詳細確認
- 📈 **パフォーマンス分析**: レスポンス時間・成功率の監視
- 💾 **データプライバシー**: すべてのデータはローカルに保持

## 📁 プロジェクト構造

```
sample-agent/
├── src/
│   ├── index.ts              # メインエージェント設定
│   ├── config/
│   │   └── index.ts          # API設定
│   ├── tools/                # カスタムツール
│   │   ├── crypto.ts         # CoinGecko API連携
│   │   ├── news.ts           # News API連携
│   │   ├── crypto-analysis.ts # 総合分析ツール
│   │   └── index.ts          # ツールエクスポート
│   ├── types/
│   │   └── index.ts          # 型定義
│   └── workflows/            # ワークフロー定義
│       ├── crypto-analysis-workflow.ts
│       └── index.ts
├── .voltagent/               # エージェントメモリ
│   └── memory.db
└── package.json
```

## 🧪 機能確認

### 市場データ分析

```bash
{"message": "イーサリアムの技術分析と今後の見通しを分析して"}
```

### ニュース・センチメント分析

```bash
{"message": "ビットコインの最新ニュースを15件取得してセンチメントを分析して"}
```

## 📚 参考資料

- **VoltAgent公式**: [voltagent.dev](https://voltagent.dev)
- **ドキュメント**: [voltagent.dev/docs](https://voltagent.dev/docs)
- **サンプル**: [github.com/VoltAgent/examples](https://github.com/VoltAgent/examples)

### API ドキュメント

- **CoinGecko API**: [coingecko.com/api/docs/v3](https://docs.coingecko.com/api/docs/v3)
- **News API**: [newsapi.org/docs](https://newsapi.org/docs)
- **Google AI**: [ai.google.dev](https://ai.google.dev)

## 📄 ライセンス

MIT License

## ⚠️ 免責事項

このアプリケーションは**教育・デモンストレーション目的**のみで提供されています。本アプリケーションの使用により生じたいかなる損失についても、開発者は責任を負いません