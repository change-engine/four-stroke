import type { Viewer } from "../util/auth";

interface ViewerMenuProps {
  logoutUrl: string;
  viewer: Viewer;
}

export default function ViewerMenu({ logoutUrl, viewer }: ViewerMenuProps): React.ReactNode {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md px-2 py-1.5 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-900 focus:ring-offset-2 [&::-webkit-details-marker]:hidden">
        {viewer.picture ? (
          <img
            alt=""
            className="size-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
            src={viewer.picture}
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-full bg-emerald-950 text-sm font-semibold text-white"
          >
            {viewer.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="max-w-48 truncate text-sm font-medium">{viewer.name}</span>
      </summary>
      <nav className="absolute right-0 mt-2 w-40 rounded-md border border-stone-200 bg-white py-1 shadow-lg">
        <a
          className="block px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-stone-100 focus:bg-stone-100 focus:outline-none"
          href={logoutUrl}
        >
          Logout
        </a>
      </nav>
    </details>
  );
}
