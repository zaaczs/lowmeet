import { useAuth } from "../contexts/AuthContext";

function Login() {
  const { user, login, logout } = useAuth();

  return (
    <div style={{ padding: 20 }}>
      <h1>Login com Google</h1>
      {user ? (
        <>
          <p>Bem-vindo, {user.displayName}</p>
          <button onClick={logout}>Sair</button>
        </>
      ) : (
        <button onClick={login}>Entrar com Google</button>
      )}
    </div>
  );
}

export default Login;
