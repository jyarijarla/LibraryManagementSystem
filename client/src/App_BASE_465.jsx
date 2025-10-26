import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Login from './pages/Login/Login'
import Student from './pages/Student/Student'
import Admin from './pages/Admin/Admin'
import BookItem from './pages/BookItem/BookItem'
import Home from './pages/Home'
import './App.css'
import NavBar from './components/Navbar'

function AppContent() {
  const location = useLocation()
  const showNavbar = location.pathname !== '/Login'

  return (
    <>
      {showNavbar && <NavBar />}
      <Routes>
        <Route path="/" element={<Home />} />
        {/*<Route path="/home" element={<Home />} />*/}
        <Route path="/login" element={<Login />} />
        <Route path="/student" element={<Student />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/book-item" element={<BookItem />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
