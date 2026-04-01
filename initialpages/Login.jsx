import { useState } from "react";
import { useAuth } from "../assets/contexts/AuthContext";

function Login() {
  const auth = useAuth();

  if (!auth) {
    return <p>Erro: O contexto de autenticação não está disponível.</p>;
  }

  const { user, login, register, logout } = auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegistering) {
      await register(email, password);
    } else {
      await login(email, password);
    }
  };

  return (
    <div className="main-content">
      {user ? (
        <div>
          <p>Bem-vindo, {user.email}</p>
          <button onClick={logout}>Sair</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <h2>{isRegistering ? "Registrar" : "Login"}</h2>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">
            {isRegistering ? "Registrar" : "Entrar"}
          </button>
          <p onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering
              ? "Já tem uma conta? Faça login"
              : "Não tem uma conta? Registre-se"}
          </p>
        </form>
      )}
    </div>
  );
}

export default Login;
