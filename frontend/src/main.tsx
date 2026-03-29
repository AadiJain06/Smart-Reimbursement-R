import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!rounded-lg !border !border-zinc-200 !bg-white !text-zinc-900 !shadow-lg !text-sm',
          duration: 4000,
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
