import { installNativeLifecycle } from './platform/lifecycle.js';
installNativeLifecycle();
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import './index.css';

let initialView = <App />;
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('artReview') === 'gettysburg-motion') {
  const InfantryMotionReview = React.lazy(() => import('./components/InfantryMotionReview.jsx'));
  initialView = (
    <React.Suspense fallback={<p style={{ padding: 24 }}>Loading motion studies…</p>}>
      <InfantryMotionReview />
    </React.Suspense>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      {initialView}
    </AppErrorBoundary>
  </React.StrictMode>
);
