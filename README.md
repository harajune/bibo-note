# bibo-note

bibo-noteは、モダンなクラウドネイティブWikiアプリケーションです。AWSサービスを使い、高速でスケーラブルなマイクロフロントエンドアーキテクチャを採用しています。

## 特徴

- **📝 シンプルなWiki機能**: 記事の作成・編集・閲覧が可能
- **☁️ AWSフルマネージドサービス**: Lambda@Edge + CloudFront + S3による構成
- **🖼️ OGP画像自動生成**: 各記事に対してOGP画像を自動生成
- **📱 レスポンシブデザイン**: Tailwind CSSによるモダンなUI
- **🔐 Basic認証**: 環境に応じた柔軟な認証設定
- **📋 ドラフト機能**: 記事を下書きとして保存可能
- **🚀 高速配信**: CloudFrontによるグローバルCDN配信
- **🏗️ Infrastructure as Code**: AWS CDKによる完全なインフラ管理

## 技術スタック

### フロントエンド
- **Framework**: [Hono](https://hono.dev/) + [HonoX](https://github.com/honojs/honox)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### バックエンド
- **Runtime**: Lambda@Edge (Node.js)
- **Storage**: AWS S3
- **CDN**: AWS CloudFront
- **認証**: Basic認証 (Lambda@Edge)

### インフラストラクチャ
- **IaC**: AWS CDK
- **CI/CD**: GitHub Actions
- **Package Manager**: pnpm (workspace)

### OGP画像生成
- **Library**: @vercel/og
- **Font**: BIZ UDGothic

## プロジェクト構成

```
bibo-note/
├── packages/
│   ├── web/              # Webアプリケーション (Hono)
│   ├── infrastructure/   # AWS CDKインフラコード
│   └── ogp/             # OGP画像生成サービス
├── .github/workflows/    # GitHub Actions ワークフロー
└── pnpm-workspace.yaml  # pnpmワークスペース設定
```

## 環境

プロジェクトは2つの環境をサポートしています：

### 開発環境
- **ドメイン**: `bibo-note.dev`
- **デプロイ**: `main`ブランチへのプッシュで自動デプロイ
- **認証**: サイト全体でBasic認証が必要

### 本番環境
- **ドメイン**: `bibo-note.jp`
- **デプロイ**: `prod`ブランチへのプッシュで自動デプロイ
- **認証**: 編集機能（`/e/*`, `/new`）のみBasic認証が必要

## セットアップ

### 必要な環境

- Node.js 18.x 以上
- pnpm 10.x 以上
- AWS CLI v2
- AWS アカウント（SSO設定済み）

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/bibo-note.git
cd bibo-note

# 依存関係のインストール
pnpm install
```

### ローカル開発

```bash
# Webアプリケーションの開発サーバー起動
pnpm web dev

# OGPサービスの開発サーバー起動
pnpm ogp dev

# テストの実行
pnpm test
```

## デプロイ

### AWS インフラストラクチャのセットアップ

#### 開発環境

```bash
# AWS SSOの設定（初回のみ）
pnpm infrastructure dev:login:configure

# AWS SSOへのログイン
pnpm infrastructure dev:login

# インフラのデプロイ
pnpm infrastructure dev:deploy
```

#### 本番環境

```bash
# AWS SSOの設定（初回のみ）
pnpm infrastructure prod:login:configure

# AWS SSOへのログイン
pnpm infrastructure prod:login

# インフラのデプロイ
pnpm infrastructure prod:deploy
```

### アプリケーションのデプロイ

GitHub Actionsによる自動デプロイが設定されています：

- **開発環境**: `main`ブランチにプッシュすると自動デプロイ
- **本番環境**: `prod`ブランチにプッシュすると自動デプロイ

手動デプロイの場合：

```bash
# ビルド
pnpm build
```

## 使い方

### 記事の作成

1. `/new` にアクセス
2. タイトルと本文を入力
3. 必要に応じて「Save as draft」にチェック
4. 「Save」ボタンをクリック

### 記事の編集

1. `/e/{uuid}` にアクセス（記事のUUID）
2. 内容を編集
3. 「Save」ボタンをクリック

### 記事の閲覧

- トップページ（`/`）: 最新記事を表示
- 個別記事（`/v/{uuid}`）: 特定の記事を表示

## アーキテクチャ

```
┌─────────────────┐
│       AWS       │
│                 │
│  ┌───────────┐  │     ┌──────────────┐
│  │CloudFront │  │────▶│   HonoX App  │
│  │    CDN    │  │     │ (Lambda@Edge)│
│  └─────┬─────┘  │     └──────────────┘
│        │        │
│  ┌─────▼─────┐  │
│  │    S3     │  │
│  │  Storage  │  │
│  └───────────┘  │
│                 │
│  ┌───────────┐  │
│  │Lambda@Edge│  │
│  │   Auth    │  │
│  └───────────┘  │
└─────────────────┘
```

## 主要なコンポーネント

### WikiModel
記事の保存、読み込み、一覧取得を管理するモデルクラス。開発環境ではファイルシステム、本番環境ではS3を使用。

### Repository Pattern
ストレージの抽象化層。FileRepositoryとS3Repositoryの2つの実装を提供。

### CloudFront Cache Model
CloudFrontのキャッシュ無効化を管理。記事の更新時に自動的にキャッシュをクリア。

### Authorization Edge Function
Lambda@Edgeを使用したBasic認証の実装。環境ごとに異なる認証ルールを適用。

## 開発ガイドライン

- **コミット**: Conventional Commitsに従う
- **ブランチ戦略**: 
  - `main`: 開発環境へのデプロイ
  - `prod`: 本番環境へのデプロイ
  - feature branches: 新機能の開発
- **テスト**: プッシュ前に `pnpm test` を実行

## トラブルシューティング

### AWS SSOログインエラー
```bash
# プロファイルを再設定
pnpm infrastructure [dev|prod]:login:configure
```

### CloudFront キャッシュの問題
記事が更新されない場合は、CloudFrontのキャッシュ無効化が正しく動作しているか確認してください。
