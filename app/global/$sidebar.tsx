import { useState } from 'hono/jsx'

interface MenuItem {
  name: string;
  href: string;
  // honox JSX.Element 型はエラーになるので無視
  // @ts-ignore
  icon: JSX.Element;
  current?: boolean;
}

interface MenuSection {
  header?: HeaderItem;
  children: MenuItem[];
}

interface HeaderItem {
  name: string;
}

interface SidebarProps {
  children: MenuSection[];
}

// Common components
const Logo = () => (
  <div class="flex h-16 shrink-0 items-center">
    <img
      class="h-8 w-auto"
      src="https://tailwindui.com/plus/img/logos/mark.svg?color=indigo&shade=600"
      alt="Your Company"
    />
  </div>
);

const Navigation = ({ sections }: { sections: MenuSection[] }) => (
  <nav class="flex flex-1 flex-col">
    <ul role="list" class="flex flex-1 flex-col gap-y-7">
      {sections.map((section) => renderSection(section))}
    </ul>
  </nav>
);

const renderSection = (section: MenuSection) => {
  const baseClasses = "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold";
  
  return (
    <li>
      {section.header && (
        <div class="text-xs/6 font-semibold text-gray-400">
          {section.header.name}
        </div>
      )}
      <ul role="list" class="-mx-2 space-y-1">
        {section.children.map((menuItem) => {
          const activeClasses = menuItem.current
            ? "bg-gray-50 text-indigo-600"
            : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600";

          return (
            <li key={menuItem.name}>
              <a href={menuItem.href} class={`${baseClasses} ${activeClasses}`}>
                {menuItem.icon}
                {menuItem.name}
              </a>
            </li>
          );
        })}
      </ul>
    </li>
  );
};

export function Sidebar({ children }: SidebarProps) {
  const [isOpen, setOpen] = useState(false);

  return (
    <>
      <NarrowScreenSidebar isOpen={isOpen} setOpen={setOpen} children={children} />

      <div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
          <Logo />
          <Navigation sections={children} />
        </div>
      </div>

      <div class="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button type="button" onClick={() => { setOpen(true); }} class="-m-2.5 p-2.5 text-gray-700 lg:hidden">
          <span class="sr-only">Open sidebar</span>
          <svg
            class="size-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            aria-hidden="true"
            data-slot="icon"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </div>
    </>
  );
}

interface NarrowSidebarProps {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  children: MenuSection[];
}

function NarrowScreenSidebar({ isOpen, setOpen, children }: NarrowSidebarProps) {
  return (
    <div class={`relative z-50 lg:hidden ${isOpen ? '' : 'pointer-events-none'}`} role="dialog" aria-modal="true">
      <div 
        class={`fixed inset-0 bg-gray-900/80 transition-opacity ease-linear duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`} 
        aria-hidden="true"
      ></div>

      <div class="fixed inset-0 flex">
        <div class={`relative mr-16 flex w-full max-w-xs flex-1 transition ease-in-out duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div class={`absolute left-full top-0 flex w-16 justify-center pt-5 transition-opacity ease-in-out duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}>
            <button type="button" onClick={() => setOpen(false)} class="-m-2.5 p-2.5">
              <span class="sr-only">Close sidebar</span>
              <svg
                class="size-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                aria-hidden="true"
                data-slot="icon"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
            <Logo />
            <Navigation sections={children} />
          </div>
        </div>
      </div>
    </div>
  );
}
