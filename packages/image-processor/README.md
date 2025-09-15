# image-processor (Rust Lambda)

S3にアップロードされた画像をPNGに変換し、images/ディレクトリに保存するLambda関数です。

## 機能概要
- S3の`{user}/temp-uploads/{uuid}`に画像がアップロードされるとトリガー
- 画像をダウンロードし、PNGに変換
- `{user}/images/{uuid}.png`に保存
- 変換後、元ファイル（temp-uploads）は削除

## Lambda環境変数
- `WIKI_BUCKET_NAME` : 画像保存先S3バケット名
- `AWS_REGION` : AWSリージョン
- `MULTITENANT` : マルチテナントモード（"1"推奨）

## ローカルビルド手順
```sh
# Lambda用バイナリをビルド
cargo build --release --target x86_64-unknown-linux-gnu

# バイナリをbootstrapにリネームしlambda/へコピー
mkdir -p lambda
cp target/x86_64-unknown-linux-gnu/release/image-processor lambda/bootstrap

# zip化
cd lambda
zip lambda.zip bootstrap
```

## デプロイ（CDK経由）
- `cloudfront-distribution-stack.ts`でLambdaのデプロイ先が指定されています。
- Lambdaのコード更新は`image-processor/lambda/lambda.zip`を参照するようにしてください。
- 例: 
```ts
code: lambda.Code.fromAsset('../image-processor/lambda'),
```

## GitHub Actions連携例
```yaml
# .github/workflows/deploy-image-processor.yml
name: Deploy image-processor Lambda
on:
  push:
    paths:
      - 'packages/image-processor/**'
      - '.github/workflows/deploy-image-processor.yml'
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: x86_64-unknown-linux-gnu
          override: true
      - name: Build Lambda binary
        run: |
          cd packages/image-processor
          cargo build --release --target x86_64-unknown-linux-gnu
          mkdir -p lambda
          cp target/x86_64-unknown-linux-gnu/release/image-processor lambda/bootstrap
      - name: Zip Lambda binary
        run: |
          cd packages/image-processor/lambda
          zip lambda.zip bootstrap
      # 以降、S3アップロードやCDKデプロイなどを追加
```

## 注意
- LambdaランタイムはAmazon Linux 2 (provided.al2)を想定
- バイナリ名は`bootstrap`にリネームしてください
- デプロイ用zipは`lambda/lambda.zip`に配置してください 