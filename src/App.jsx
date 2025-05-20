import { useState } from "react";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="logo">
          <h1>LowMeet</h1>
        </div>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/eventos">Eventos</a>
          <a href="/criar-evento">Criar Evento</a>
          <a href="/login" className="login-button">
            Login
          </a>
        </div>
      </nav>

      <main className="main-content">
        <div className="hero-section">
          <h2>Bem-vindo ao LowMeet</h2>
          <p>Organize e participe de eventos de forma simples e eficiente</p>
          <button className="cta-button">Criar Evento</button>
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
      </main>
    </div>
  );
}

export default App;
