import { useState } from 'react'
import logo from './assets/logo.png'
import './App.css'

function App() {
  return (
    <div className="container">
      <nav className="navbar">
        <div className="logo-section">
          <img src={logo} className="logo" alt="Popcorn logo" />
          <span className="brand-name">Popcorn</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <button className="download-btn">Download</button>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1>Unlimited Movies, TV Shows, and More.</h1>
            <p className="subtitle">Watch anywhere. Cancel anytime. Just kidding, it's free.</p>
            <div className="cta-group">
              <button className="primary-cta">Download for Windows</button>
              <button className="secondary-cta">View on GitHub</button>
            </div>
          </div>
          <div className="hero-image">
            {/* CSS Mockup of the App */}
            <div className="app-window">
              <div className="window-header">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="window-content">
                <div className="fake-hero"></div>
                <div className="fake-row">
                  <div className="poster"></div>
                  <div className="poster"></div>
                  <div className="poster"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="features">
          <div className="feature-card">
            <h3>No Ads</h3>
            <p>Enjoy a completely interruption-free experience.</p>
          </div>
          <div className="feature-card">
            <h3>Track Progress</h3>
            <p>Resume exactly where you left off, on any movie or show.</p>
          </div>
          <div className="feature-card">
            <h3>High Quality</h3>
            <p>Stream in 1080p and 4K directly from the source.</p>
          </div>
        </section>
      </main>

      <footer>
        <p>&copy; 2026 Popcorn. Open Source Project.</p>
      </footer>
    </div>
  )
}

export default App
