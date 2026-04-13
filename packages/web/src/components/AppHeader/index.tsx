import { Button, NavLink } from "../atoms";
import styles from "./AppHeader.module.css";

type AuthView = "login" | "register" | "app";

type AppHeaderProps = {
  authView: AuthView;
  onNavigate: (view: "login" | "register") => void;
  onLogout: () => void;
};

/** Persistent header shown on all screens — nav links when unauthenticated, logout when authenticated. */
function AppHeader({ authView, onNavigate, onLogout }: AppHeaderProps) {
  if (authView === "app") {
    return (
      <div className={styles.header}>
        <h1 className={styles.title}>Todos</h1>
        <Button variant="ghost" onClick={onLogout}>
          Log out
        </Button>
      </div>
    );
  }

  const loginActive = authView === "login";
  const registerActive = authView === "register";

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Todos</h1>
      <nav className={styles.nav}>
        <NavLink active={loginActive} onClick={() => onNavigate("login")}>
          Log in
        </NavLink>
        <NavLink active={registerActive} onClick={() => onNavigate("register")}>
          Register
        </NavLink>
      </nav>
    </div>
  );
}

export { AppHeader };
