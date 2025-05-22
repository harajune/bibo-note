import { v7 as uuidv7 } from 'uuid';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as TOML from 'smol-toml';
import { WikiData } from '../app/wiki/models/wiki_data';

const baseDir = path.join(__dirname, '..');
const dataDir = path.join(baseDir, 'data', 'data');
const cacheDir = path.join(baseDir, 'cache');
const screenshotsDir = path.join(baseDir, 'screenshots');

[dataDir, cacheDir, screenshotsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface ArticleMeta {
  uuid: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

async function createArticle(title: string, content: string): Promise<ArticleMeta> {
  const uuid = uuidv7();
  const now = new Date();
  
  const articleData = {
    header: {
      fileVersion: "0.0.1",
      updatedAt: now.toISOString(),
      createdAt: now.toISOString(),
      uuid: uuid
    },
    content: {
      title: title,
      content: content
    }
  };
  
  const tomlString = TOML.stringify(articleData);
  const filePath = path.join(dataDir, `${uuid}.toml`);
  fs.writeFileSync(filePath, tomlString, 'utf-8');
  
  console.log(`Created article: ${title} (${uuid})`);
  
  return {
    uuid,
    title,
    updatedAt: now.toISOString(),
    createdAt: now.toISOString()
  };
}

async function updateCache(articles: ArticleMeta[]): Promise<void> {
  const cacheFilePath = path.join(cacheDir, 'article_list_cache.json');
  fs.writeFileSync(cacheFilePath, JSON.stringify(articles), 'utf-8');
  console.log(`Updated cache with ${articles.length} articles`);
}

async function main(): Promise<void> {
  const articles: ArticleMeta[] = [];
  
  articles.push(await createArticle('Getting Started with Bibo-Note', 'Welcome to Bibo-Note! This is a lightweight wiki that runs on Cloudflare Workers.'));
  articles.push(await createArticle('How to Create Articles', 'You can create new articles by clicking the "New" button in the sidebar.'));
  articles.push(await createArticle('Markdown Support', 'Bibo-Note supports Markdown syntax for formatting your articles.'));
  articles.push(await createArticle('Multi-tenant Support', 'Bibo-Note supports multiple tenants with isolated data.'));
  articles.push(await createArticle('Cloudflare Integration', 'Bibo-Note is designed to work seamlessly with Cloudflare Workers and R2 storage.'));
  
  await updateCache(articles);
  
  console.log('Articles created successfully!');
  console.log('To view the sidebar in the application, run:');
  console.log('  yarn dev');
  console.log('Then navigate to http://localhost:5173/ in your browser');
  console.log('Take a screenshot of the sidebar showing the latest articles');
}

main().catch(console.error);
