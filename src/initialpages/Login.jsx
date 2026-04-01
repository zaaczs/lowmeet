import { useState } from "react";
import { useAuth } from "../assets/contexts/AuthContext";

function Login() {
  const { user, login, register, loginWithGoogle, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegistering) { 
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <div className="main-content">
      <h2>{isRegistering ? "Registrar" : "Login"}</h2>
      {user ? (
        <div>
          <p>Bem-vindo, {user.email}</p>
          <button onClick={logout}>Sair</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form-evento">
          <div className="form-row">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" className="cta-button">
            {isRegistering ? "Registrar" : "Entrar"}
          </button>
          <button
            type="button"
            className="cta-button"
            onClick={loginWithGoogle}
            style={{ marginTop: "1rem" }}
          >
            Entrar com Google
          </button>
          <p
            style={{ marginTop: "1rem", cursor: "pointer", color: "#2563eb" }}
            onClick={() => setIsRegistering(!isRegistering)}
          >
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
