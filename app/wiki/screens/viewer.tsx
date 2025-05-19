import { Sidebar } from "../../global/$sidebar";
import { DashboardIcon } from "../../global/$icons";
import { SyntaxParser } from "../../libs/syntax_parser/syntax_parser";
import { WikiData } from "../models/wiki_data";
import { getLatestArticlesMenuSection } from "../components/latest_articles_sidebar";

interface ViewerProps {
  wikiData: WikiData;
}

export async function Viewer({ wikiData }: ViewerProps) {
  const latestArticlesSection = await getLatestArticlesMenuSection();
  
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
    },
    latestArticlesSection
  ];

  const title = wikiData.title;

  const syntaxParser = new SyntaxParser();
  const content = syntaxParser.parse(wikiData.content);

  return (
    <div>
      <Sidebar children={menuSections} />

      <main class="py-10 lg:pl-72">
        <div class="px-4 sm:px-6 lg:px-8" id="wiki-content">
          <h1>{title}</h1>
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </main>
    </div>
  );
}
