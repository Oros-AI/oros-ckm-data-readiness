import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { NewRun } from './pages/NewRun';
import { RunDetail } from './pages/RunDetail';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-run" element={<NewRun />} />
          <Route path="/runs/:id" element={<RunDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
