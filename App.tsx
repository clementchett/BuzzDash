import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import HostView from './pages/HostView';
import PlayerView from './pages/PlayerView';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen w-full flex flex-col font-sans">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/host/:roomId" element={<HostView />} />
          <Route path="/play/:roomId" element={<PlayerView />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;