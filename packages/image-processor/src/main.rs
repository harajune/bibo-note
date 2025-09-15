use lambda_runtime::{service_fn, LambdaEvent, Error};
use aws_lambda_events::event::s3::S3Event;
use tracing::info;
use std::env;
use aws_sdk_s3::{Client};
use aws_sdk_s3::primitives::ByteStream;
use aws_config;
use image::codecs::png::PngEncoder;
use image::ColorType;
use image::GenericImageView;
use image::ImageEncoder;

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();
    
    lambda_runtime::run(service_fn(handler)).await?;
    Ok(())
}

async fn handler(event: LambdaEvent<S3Event>) -> Result<(), Error> {
    let bucket_env = env::var("WIKI_BUCKET_NAME").unwrap_or_else(|_| "(not set)".to_string());
    let image_bucket_env = env::var("IMAGE_BUCKET_NAME").unwrap_or_else(|_| "(not set)".to_string());
    let region_env = env::var("AWS_REGION").unwrap_or_else(|_| "ap-northeast-1".to_string());
    let region_str: &'static str = Box::leak(region_env.clone().into_boxed_str());
    let multitenant_env = env::var("MULTITENANT").unwrap_or_else(|_| "(not set)".to_string());

    info!("Lambda env: WIKI_BUCKET_NAME={}, IMAGE_BUCKET_NAME={}, AWS_REGION={}, MULTITENANT={}", bucket_env, image_bucket_env, region_env, multitenant_env);

    let config = aws_config::from_env().region(region_str).load().await;
    let s3_client = Client::new(&config);

    for record in event.payload.records.iter() {
        let bucket = match &record.s3.bucket.name {
            Some(b) => b,
            None => continue,
        };
        let key = match &record.s3.object.key {
            Some(k) => k,
            None => continue,
        };
        info!("Processing S3 object: bucket={}, key={}", bucket, key);

        // 1. S3から画像をダウンロード
        let get_obj = s3_client.get_object()
            .bucket(&image_bucket_env)
            .key(key)
            .send()
            .await;
        let obj = match get_obj {
            Ok(o) => o,
            Err(e) => {
                tracing::error!("Failed to get object from S3: {}", e);
                continue;
            }
        };
        let data = match obj.body.collect().await {
            Ok(bytes) => bytes.into_bytes(),
            Err(e) => {
                tracing::error!("Failed to read S3 object body: {}", e);
                continue;
            }
        };

        // 2. imageクレートでPNG変換
        let img = match image::load_from_memory(&data) {
            Ok(i) => i,
            Err(e) => {
                tracing::error!("Failed to decode image: {}", e);
                continue;
            }
        };
        
        // 画像をPNG形式に変換
        let mut png_buf = Vec::new();
        {
            let (width, height) = img.dimensions();
            let rgba = img.to_rgba8();
            let encoder = PngEncoder::new(&mut png_buf);
            if let Err(e) = encoder.write_image(
                &rgba,
                width,
                height,
                ColorType::Rgba8.into()
            ) {
                tracing::error!("Failed to encode PNG: {}", e);
                continue;
            }
            info!("Successfully converted image to PNG: {}x{}", width, height);

        }
        

        // 3. 保存先キーを決定
        // 例: user/uuid → user/images/uuid
        let new_key = {
            let parts: Vec<&str> = key.split('/').collect();
            if parts.len() == 2 {
                format!("{}/images/{}", parts[0], parts[1])
            } else {
                format!("images/{}", key)
            }
        };
        info!("Uploading converted PNG to: {}", new_key);

        // 4. S3へアップロード（Wikiバケットのuser/imagesディレクトリに保存）
        let put_res = s3_client.put_object()
            .bucket(&bucket_env)
            .key(&new_key)
            .body(ByteStream::from(png_buf))
            .content_type("image/png")
            .cache_control("public, max-age=31536000")
            .send()
            .await;
        if let Err(e) = put_res {
            tracing::error!("Failed to upload PNG to S3: {}", e);
            continue;
        }
        info!("Successfully uploaded PNG: {}", new_key);

    }
    Ok(())
} 