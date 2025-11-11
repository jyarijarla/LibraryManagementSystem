import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Login from './pages/Login/Login'
import Student from './pages/Student/Dashboard'
import Admin from './pages/Admin/Admin'
import Librarian from './pages/Librarian/Librarian'
import BookItem from './pages/BookItem/BookItem'
import MovieItem from './pages/MovieItem/MovieItem'
import Home from './pages/Home/Home'
import About from './pages/About/About'      
import Books from './pages/Books/Books'     
import './App.css'
// import NavBar from './components/Navbar'
import Movies from './pages/Movie/Movies'

function AppContent() {
  const location = useLocation()
  const pathname = location.pathname.toLowerCase()
  const showNavbar = !pathname.startsWith('/login') && 
                     !pathname.startsWith('/admin') &&
                     !pathname.startsWith('/librarian') &&
                     !pathname.startsWith('/student')

  return (
    <>
      {/* {showNavbar && <NavBar />} */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/student/*" element={<Student />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/librarian" element={<Librarian />} />
        <Route path="/book-item" element={<BookItem />} />
        <Route path="/about" element={<About />} />     
        <Route path="/books" element={<Books />} />
        <Route path="/books/:id" element={<BookItem />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:id" element={<MovieItem />} />
        <Route path="/movie-item" element={<MovieItem />} />
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
