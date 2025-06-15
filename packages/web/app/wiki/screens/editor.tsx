import { Sidebar } from "../../global/$sidebar";
import { WikiData } from "../models/wiki_data";
import { ArticleListItem } from "../models/wiki_model";
import { MenuSection } from "../../global/$sidebar";

interface EditorProps {
  wikiData: WikiData;
  articles?: ArticleListItem[];
}

export function Editor({ wikiData, articles = [] }: EditorProps) {

  const allSections: MenuSection[] = [];
  if (articles.length > 0) {
    allSections.push({
      header: { name: "Recent Articles" },
      items: articles.map(article => ({
        name: `${article.title || "Untitled"}${article.draft ? " (Draft)" : ""}`,
        href: `/e/${article.uuid}`,
        current: false,
      }))
    });
  }

  return (
    <div>
      <Sidebar sections={allSections} />
      <main class="py-10 lg:pl-72">
        <div class="px-4 sm:px-6 lg:px-8">

      <form action={wikiData.uuid ? `/e/${wikiData.uuid}` : `/new`} class="relative" method="post">
        <div class="rounded-lg bg-white outline outline-1 -outline-offset-1 outline-gray-300 focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600">
          <label for="title" class="sr-only">
            Title
          </label>
          <input
            type="text"
            name="title"
            id="title"
            class="block w-full px-3 pt-2.5 text-3xl font-medium text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0"
            placeholder="Title"
            value={wikiData.title}
          />
          <label for="description" class="sr-only">
            Description
          </label>
          <textarea
            rows={30}
            name="content"
            id="content"
            class="block w-full resize-none px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
            placeholder="Write a description..."
          >{wikiData.content}</textarea>

        </div>

        <div class="absolute inset-x-px bottom-0">
          <div class="flex items-center justify-between space-x-3 border-t border-gray-200 px-2 py-2 sm:px-3">
            <div class="flex items-center">
              <input
                type="checkbox"
                name="draft"
                id="draft"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                checked={wikiData.draft}
              />
              <label for="draft" class="ml-2 text-sm font-medium leading-6 text-gray-900">
                Draft
              </label>
            </div>
            <div class="shrink-0">
              <button
                type="submit"
                class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
        </form>
      </div>
    </main>
    </div>
  );
}
