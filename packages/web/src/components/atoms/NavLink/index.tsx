import { clsx } from "clsx";

import styles from "./NavLink.module.css";

type NavLinkProps = {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

/**
 * Nav link atom rendered as a <button>. Shows an accent underline when active.
 * Uses <button> (not <a>) because the app does not use a routing library.
 * `aria-current="page"` is derived automatically from `active` so callers
 * cannot accidentally set the visual state without the accessibility attribute.
 */
function NavLink({ active = false, onClick, children }: NavLinkProps) {
  const className = clsx(styles.navLink, active && styles.active);

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}

export type { NavLinkProps };
export { NavLink };
