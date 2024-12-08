import Counter from "../islands/counter";
import { Sidebar } from "../global/$sidebar";
interface ViewerProps {
  name: string;
}

export function Viewer({ name }: ViewerProps) {
  return (
    <div>
      <Sidebar />

      <main class="py-10 lg:pl-72">
        <div class="px-4 sm:px-6 lg:px-8">
          <h1 class="text-3xl font-bold underline">Hello! {name} </h1>
          <Counter />
        </div>
      </main>
    </div>
  );
}
