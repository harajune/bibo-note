import { v7 as uuidv7 } from 'uuid';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as TOML from 'smol-toml';
import { WikiModel } from '../app/wiki/models/wiki_model';
import { FileRepository } from '../app/wiki/repositories/repositories';

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

async function verifyArticleAccess(articles: ArticleMeta[]): Promise<void> {
  const wikiModel = new WikiModel();
  
  console.log('\nVerifying article access:');
  
  for (const article of articles) {
    try {
      const loadedArticle = await wikiModel.load(article.uuid);
      if (loadedArticle) {
        console.log(`✅ Successfully accessed article: ${loadedArticle.title} (${article.uuid})`);
      } else {
        console.log(`❌ Failed to access article: ${article.title} (${article.uuid})`);
      }
    } catch (error) {
      console.error(`❌ Error accessing article ${article.title} (${article.uuid}):`, error);
    }
  }
}

async function verifySidebarList(articles: ArticleMeta[]): Promise<void> {
  const wikiModel = new WikiModel();
  
  console.log('\nVerifying sidebar article list:');
  
  try {
    const latestArticles = await wikiModel.getLatestArticles();
    console.log(`✅ Successfully retrieved ${latestArticles.length} articles for sidebar`);
    
    const sortedUuids = [...latestArticles].sort((a, b) => b.uuid.localeCompare(a.uuid)).map(a => a.uuid);
    const currentUuids = latestArticles.map(a => a.uuid);
    
    const isSorted = JSON.stringify(sortedUuids) === JSON.stringify(currentUuids);
    console.log(`${isSorted ? '✅' : '❌'} Articles are ${isSorted ? '' : 'not '}sorted in chronological order`);
    
    console.log('\nLatest articles that would appear in the sidebar:');
    latestArticles.slice(0, 20).forEach((article, index) => {
      console.log(`${index + 1}. ${article.title} (${article.uuid})`);
    });
    
    const sidebarHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sidebar Article List</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      display: flex;
    }
    .sidebar {
      width: 300px;
      background-color: #f5f5f5;
      height: 100vh;
      padding: 20px;
      box-shadow: 2px 0 5px rgba(0,0,0,0.1);
    }
    .sidebar h2 {
      margin-top: 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #ddd;
    }
    .article-list {
      list-style: none;
      padding: 0;
    }
    .article-item {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .article-item a {
      text-decoration: none;
      color: #333;
      display: flex;
      align-items: center;
    }
    .article-item a:hover {
      color: #0066cc;
    }
    .article-icon {
      margin-right: 10px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <h2>Recent Articles</h2>
    <ul class="article-list">
${latestArticles.slice(0, 20).map(article => `      <li class="article-item">
        <a href="/v/${article.uuid}">
          <span class="article-icon">📄</span>
          ${article.title}
        </a>
      </li>`).join('\n')}
    </ul>
  </div>
</body>
</html>
`;
    
    fs.writeFileSync(path.join(screenshotsDir, 'sidebar_preview.html'), sidebarHtml, 'utf-8');
    console.log(`\n✅ Created sidebar preview HTML at ${path.join(screenshotsDir, 'sidebar_preview.html')}`);
    
  } catch (error) {
    console.error('❌ Error verifying sidebar article list:', error);
  }
}

async function main(): Promise<void> {
  console.log('Creating test articles...');
  const articles: ArticleMeta[] = [];
  
  articles.push(await createArticle('Getting Started with Bibo-Note', 'Welcome to Bibo-Note! This is a lightweight wiki that runs on Cloudflare Workers.'));
  articles.push(await createArticle('How to Create Articles', 'You can create new articles by clicking the "New" button in the sidebar.'));
  articles.push(await createArticle('Markdown Support', 'Bibo-Note supports Markdown syntax for formatting your articles.'));
  articles.push(await createArticle('Multi-tenant Support', 'Bibo-Note supports multiple tenants with isolated data.'));
  articles.push(await createArticle('Cloudflare Integration', 'Bibo-Note is designed to work seamlessly with Cloudflare Workers and R2 storage.'));
  
  await verifyArticleAccess(articles);
  
  await verifySidebarList(articles);
  
  console.log('\n✅ Verification complete!');
}

main().catch(console.error);
