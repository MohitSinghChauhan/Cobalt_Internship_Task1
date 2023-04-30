import Form from './components/Form.jsx';
import Success from './components/Success.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Form />} />
        <Route path="/signing-complete" element={<Success />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
