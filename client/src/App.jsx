import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login/Login'
import Student from './pages/Student/Student'
import Admin from './pages/Admin/Admin'
import './App.css'
import NavBar from './components/Navbar'

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/Login" element={<Login />} />
        <Route path="/student" element={<Student />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
      )
}

export default App
