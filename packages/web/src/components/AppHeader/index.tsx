import styles from "./AppHeader.module.css";

type AuthView = "login" | "register" | "app";

type AppHeaderProps = {
  authView: AuthView;
  onNavigate: (view: "login" | "register") => void;
  onLogout: () => void;
};

function navButtonClassName({ active }: { active: boolean }) {
  return active ? styles.navActive : styles.navLink;
}

/** Persistent header shown on all screens — nav links when unauthenticated, logout when authenticated. */
function AppHeader({ authView, onNavigate, onLogout }: AppHeaderProps) {
  if (authView === "app") {
    return (
      <div className={styles.header}>
        <h1 className={styles.title}>Todos</h1>
        <button
          type="button"
          className={styles.logoutButton}
          onClick={onLogout}
        >
          Log out
        </button>
      </div>
    );
  }

  const loginActive = authView === "login";
  const registerActive = authView === "register";

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Todos</h1>
      <nav className={styles.nav}>
        <button
          type="button"
          className={navButtonClassName({ active: loginActive })}
          aria-current={loginActive ? "page" : undefined}
          onClick={() => onNavigate("login")}
        >
          Log in
        </button>
        <button
          type="button"
          className={navButtonClassName({ active: registerActive })}
          aria-current={registerActive ? "page" : undefined}
          onClick={() => onNavigate("register")}
        >
          Register
        </button>
      </nav>
    </div>
  );
}

export { AppHeader };
