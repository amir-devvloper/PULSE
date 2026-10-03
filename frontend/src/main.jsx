import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import App from './App.jsx';
import './styles.css';
createRoot(document.getElementById('root')).render(
  <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
    <BrowserRouter><App /></BrowserRouter>
  </MotionConfig>);
