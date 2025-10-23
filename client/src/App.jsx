import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login/Login'
import Student from './pages/Student/Student'
import Admin from './pages/Admin/Admin'
import BookItem from './pages/BookItem/BookItem'
import './App.css'
import NavBar from './components/Navbar'

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/student" element={<Student />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/book-item" element={<BookItem />} />
      </Routes>
    </BrowserRouter>
      )
}

export default App
