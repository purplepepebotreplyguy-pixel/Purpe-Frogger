import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { WalletContextProvider } from './components/WalletContextProvider';
import { LandingPage } from './pages/LandingPage';
import { GamePage } from './pages/GamePage';

function App() {

  return (
    <WalletContextProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/game" element={<GamePage />} />
          </Routes>
        </div>
      </Router>
    </WalletContextProvider>
  );
}

export default App;