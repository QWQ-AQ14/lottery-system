// Update this page (the content is just a fallback if you fail to update the page)
// For single-page apps, remove Layout wrapper and render content directly

import Layout from '@/app/layout';
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { navItems } from './nav-items';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Toaster />
        <Routes>
          {navItems.map(({ to, page }) => (
            <Route key={to} path={to} element={page} />
          ))}
          <Route
            key="/"
            path="/"
            element={navItems.find((item) => item.isDefault)?.page}
          />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
