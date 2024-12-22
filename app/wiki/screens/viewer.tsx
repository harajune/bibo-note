import { Sidebar } from "../../global/$sidebar";
import { DashboardIcon } from "../../global/$icons";
import { WikiModel } from "../models/wiki_model";
import { SyntaxParser } from "../../libs/syntax_parser/syntax_parser";

interface ViewerProps {
  uuid: string;
}

export function Viewer({ uuid: uuid }: ViewerProps) {
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

  const wikiModel = new WikiModel();
  const wikiData = wikiModel.load(uuid);
  const title = wikiData.title;

  const syntaxParser = new SyntaxParser();
  const content = syntaxParser.parse(wikiData.content);

  return (
    <div>
      <Sidebar children={menuSections} />

      <main class="py-10 lg:pl-72">
        <div class="px-4 sm:px-6 lg:px-8">
          <h1>{title}</h1>
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </main>
    </div>
  );
}
