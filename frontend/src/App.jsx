// App.jsx
import React, { useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import Header from './component/Navigation';
import Footer from './component/footer';

// Pages
import HomePage from './pages/HomePage';
import AnalysisPage from './pages/AnalysisPage';
import ChatPage from './pages/ChatPage';
import Test from './pages/Test';
import StatisticsPage from './pages/StatisticsPage';
import SoilAnalysisPage from './pages/SoilAnalysisPage';
import ReportPage from './pages/ReportPage';

const ScrollManager = () => {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pathname, hash]);

  return null;
};

const MainLayout = ({ children }) => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    let animationFrameId;

    function raf(time) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="app-wrapper">
      <Header />
      <div className="main-content">
        {children}
      </div>
      {/* <Footer /> */}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route path="/" element={
          <MainLayout>
            <HomePage />
          </MainLayout>
        } />
        <Route path="/analysis" element={
          <MainLayout>
            <AnalysisPage />
          </MainLayout>
        } />
        <Route path="/chat" element={
          <MainLayout>
            <ChatPage />
          </MainLayout>
        } />

        <Route path="/test" element={
          <MainLayout>
            <Test />
          </MainLayout>
        } />
        <Route path="/statistics" element={
          <MainLayout>
            <StatisticsPage />
          </MainLayout>
        } />
        <Route path="/soil" element={
          <MainLayout>
            <SoilAnalysisPage />
          </MainLayout>
        } />
        <Route path="/report" element={
          <MainLayout>
            <ReportPage />
          </MainLayout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;