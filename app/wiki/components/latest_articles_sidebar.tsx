import { WikiModel } from '../models/wiki_model';
import { WikiData } from '../models/wiki_data';
import { DashboardIcon } from '../../global/$icons';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '../../libs/logger/logger';

interface LatestArticlesCache {
  articles: Array<{
    uuid: string;
    title: string;
    updatedAt: string;
  }>;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_FILE = path.join(process.cwd(), 'data', '.cache', 'latest_articles.json');

export async function getLatestArticlesMenuSection(limit: number = 20) {
  const wikiModel = new WikiModel();
  
  const cachedArticles = loadFromCache();
  if (cachedArticles) {
    return createMenuSection(cachedArticles.slice(0, limit));
  }
  
  try {
    const uuids = await wikiModel.list();
    
    const sortedUuids = uuids.sort((a, b) => b.localeCompare(a));
    
    const articlesPromises = sortedUuids.map(uuid => wikiModel.load(uuid));
    const articles = (await Promise.all(articlesPromises))
      .filter(article => article !== null) as WikiData[];
    
    const simplifiedArticles = articles.map(article => ({
      uuid: article.uuid,
      title: article.title || "Untitled",
      updatedAt: article.updatedAt.toISOString()
    }));
    
    saveToCache(simplifiedArticles);
    
    return createMenuSection(simplifiedArticles.slice(0, limit));
  } catch (error) {
    logger.error('Error fetching latest articles:', error);
    return createEmptyLatestArticlesSection();
  }
}

function createMenuSection(articles: Array<{uuid: string, title: string}>) {
  return {
    header: { name: "Latest Articles" },
    children: articles.map(article => ({
      name: article.title,
      href: `/v/${article.uuid}`,
      current: false,
      icon: DashboardIcon()
    }))
  };
}

export function createEmptyLatestArticlesSection() {
  return {
    header: { name: "Latest Articles" },
    children: []
  };
}

function loadFromCache(): Array<{uuid: string, title: string, updatedAt: string}> | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }
    
    const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as LatestArticlesCache;
    
    if (Date.now() - cacheData.timestamp > CACHE_TTL) {
      return null;
    }
    
    return cacheData.articles;
  } catch (error) {
    logger.error('Error reading latest articles cache:', error);
    return null;
  }
}

function saveToCache(articles: Array<{uuid: string, title: string, updatedAt: string}>) {
  try {
    const cacheDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const cacheData: LatestArticlesCache = {
      articles,
      timestamp: Date.now()
    };
    
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Error writing latest articles cache:', error);
  }
}
