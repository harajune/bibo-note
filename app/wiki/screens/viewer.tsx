import { Sidebar } from "../../global/$sidebar";
import { DashboardIcon } from "../../global/$icons";
import { SyntaxParser } from "../../libs/syntax_parser/syntax_parser";
import { WikiData } from "../models/wiki_data";
import { ArticleListItem } from "../models/wiki_model";

interface ViewerProps {
  wikiData: WikiData;
  articles?: ArticleListItem[];
}

export function Viewer({ wikiData, articles }: ViewerProps) {
  const menuSections = [
    {
      children: [{
        name: "Dashboard",
        href: "/dashboard",
        current: true,
        icon: DashboardIcon()
      }]
    },
    {
      header: {name: "Your Teams"},
      children: [
        {
          name: "Projects",
          href: "/projects",
          current: false,
          icon: DashboardIcon()
        }
      ]
    }
  ];

  const title = wikiData.title;

  const syntaxParser = new SyntaxParser();
  const content = syntaxParser.parse(wikiData.content);

  return (
    <div>
      <Sidebar children={menuSections} articles={articles} />

      <main class="py-10 lg:pl-72">
        <div class="px-4 sm:px-6 lg:px-8" id="wiki-content">
          <h1>{title}</h1>
          <div>{content}</div>
        </div>
      </main>
    </div>
  );
}
