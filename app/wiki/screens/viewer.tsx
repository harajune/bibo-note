import { Sidebar } from "../../global/$sidebar";
import { SyntaxParser } from "../../libs/syntax_parser/syntax_parser";
import { WikiData } from "../models/wiki_data";
import { ArticleListItem } from "../models/wiki_model";

interface ViewerProps {
  wikiData: WikiData;
  articles?: ArticleListItem[];
}

export function Viewer({ wikiData, articles = [] }: ViewerProps) {

  const allSections = [
    {
      header: { name: "Wiki" },
      children: []
    }
  ];
  if (articles.length > 0) {
    allSections.push({
      header: { name: "Recent Articles" },
      children: articles.map(article => ({
        name: article.title || "Untitled",
        href: `/v/${article.uuid}`,
        current: false,
        icon: <span class="size-5 flex-none text-gray-400">📄</span>
      }))
    });
  }

  const title = wikiData.title;

  const syntaxParser = new SyntaxParser();
  const content = syntaxParser.parse(wikiData.content);

  return (
    <div>
      <Sidebar children={allSections} />

      <main class="py-10 lg:pl-72">
        <div class="px-4 sm:px-6 lg:px-8" id="wiki-content">
          <h1>{title}</h1>
          <div>{content}</div>
        </div>
      </main>
    </div>
  );
}
