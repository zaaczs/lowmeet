import { Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import "./App.css";
import CalendarioEncontros from "./CalendarioEncontros";

function Home() {
  return (
    <div className="main-content">
      <div className="hero-section">
        <h2>Bem-vindo ao LowMeet</h2>
        <p>Organize e participe de eventos de forma simples e eficiente</p>
        <Link to="/criar-evento" className="cta-button">
          Criar Evento
        </Link>
      </div>
      <div className="features-section">
        <div className="feature-card">
          <h3>Eventos</h3>
          <p>Encontre eventos próximos a você</p>
        </div>
        <div className="feature-card">
          <h3>Crie</h3>
          <p>Organize seu próprio evento</p>
        </div>
        <div className="feature-card">
          <h3>Conecte</h3>
          <p>Conecte-se com pessoas com interesses similares</p>
        </div>
      </div>
    </div>
  );
}

function Eventos({ eventos }) {
  return <CalendarioEncontros eventos={eventos} />;
}

function CriarEvento({ onNovoEvento }) {
  const [form, setForm] = useState({
    nome: "",
    tipo: "",
    organizadores: "",
    email: "",
    rua: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    data: "",
    horario: "",
    info: "",
    folder: null,
    folderUrl: "",
  });
  const [msg, setMsg] = useState("");

  function handleChange(e) {
    const { name, value, files } = e.target;
    if (name === "folder" && files && files[0]) {
      const file = files[0];
      setForm((f) => ({
        ...f,
        folder: file,
        folderUrl: URL.createObjectURL(file),
      }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    onNovoEvento(form);
    setMsg("Evento publicado com sucesso!");
    setForm({
      nome: "",
      tipo: "",
      organizadores: "",
      email: "",
      rua: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
      data: "",
      horario: "",
      info: "",
      folder: null,
      folderUrl: "",
    });
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <div className="main-content">
      <h2>Publique um Encontro</h2>
      <form onSubmit={handleSubmit} className="form-evento">
        <div className="form-row">
          <input
            name="nome"
            value={form.nome}
            onChange={handleChange}
            required
            placeholder="Nome do Evento*"
          />
          <input
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            required
            placeholder="Tipo / Clube de Veículos*"
          />
        </div>
        <div className="form-row">
          <input
            name="organizadores"
            value={form.organizadores}
            onChange={handleChange}
            required
            placeholder="Organizadores*"
          />
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="E-mail para contato*"
            type="email"
          />
        </div>
        <div className="form-row">
          <input
            name="rua"
            value={form.rua}
            onChange={handleChange}
            required
            placeholder="Rua*"
          />
          <input
            name="bairro"
            value={form.bairro}
            onChange={handleChange}
            required
            placeholder="Bairro*"
          />
        </div>
        <div className="form-row">
          <input
            name="cidade"
            value={form.cidade}
            onChange={handleChange}
            required
            placeholder="Cidade*"
          />
          <input
            name="estado"
            value={form.estado}
            onChange={handleChange}
            required
            placeholder="Estado*"
          />
          <input
            name="cep"
            value={form.cep}
            onChange={handleChange}
            required
            placeholder="CEP*"
          />
        </div>
        <div className="form-row">
          <input
            name="data"
            value={form.data}
            onChange={handleChange}
            required
            placeholder="Data*"
            type="date"
          />
          <input
            name="horario"
            value={form.horario}
            onChange={handleChange}
            required
            placeholder="Horário*"
            type="time"
          />
        </div>
        <div className="form-row">
          <textarea
            name="info"
            value={form.info}
            onChange={handleChange}
            placeholder="Demais Informações"
          />
        </div>
        <div className="form-row">
          <label style={{ fontWeight: 500 }}>Folder do Evento*</label>
          <input
            name="folder"
            type="file"
            accept="image/*"
            onChange={handleChange}
            required
            style={{ background: "#fff" }}
          />
        </div>
        {form.folderUrl && (
          <div className="form-row">
            <img
              src={form.folderUrl}
              alt="Prévia do Folder"
              style={{ maxWidth: "200px", borderRadius: "8px" }}
            />
          </div>
        )}
        <button type="submit" className="cta-button">
          Publicar Evento
        </button>
        {msg && <p style={{ color: "green", marginTop: "1rem" }}>{msg}</p>}
      </form>
    </div>
  );
}

function Novidades() {
  return (
    <div className="main-content">
      <h2>Novidades e Coberturas</h2>
      <p>Conteúdo de novidades e coberturas aqui.</p>
    </div>
  );
}

function DivulgueEmpresa() {
  return (
    <div className="main-content">
      <h2>Divulgue sua Empresa</h2>
      <p>Espaço para divulgação de empresas aqui.</p>
    </div>
  );
}

function Contato() {
  return (
    <div className="main-content">
      <h2>Contato</h2>
      <p>Formulário de contato aqui.</p>
    </div>
  );
}

function Login() {
  return (
    <div className="main-content">
      <h2>Login</h2>
      <p>Área de login do sistema (em breve).</p>
    </div>
  );
}

function App() {
  const [eventos, setEventos] = useState([]);

  function handleNovoEvento(evento) {
    setEventos([...eventos, evento]);
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="logo">
          <h1>LowMeet</h1>
        </div>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/eventos">Calendário de Encontros</Link>
          <Link to="/criar-evento">Publique um Encontro</Link>
          <Link to="/novidades">Novidades e Coberturas</Link>
          <Link to="/divulgue">Divulgue sua Empresa</Link>
          <Link to="/contato">Contato</Link>
          <Link to="/login" className="login-button">
            Login
          </Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/eventos" element={<Eventos eventos={eventos} />} />
        <Route
          path="/criar-evento"
          element={<CriarEvento onNovoEvento={handleNovoEvento} />}
        />
        <Route path="/novidades" element={<Novidades />} />
        <Route path="/divulgue" element={<DivulgueEmpresa />} />
        <Route path="/contato" element={<Contato />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}

export default App;
