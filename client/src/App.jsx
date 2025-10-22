import { Link } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <>
      <div className="bg-black text-white text-center p-4 font-bold">
        <nav className="bg-gray-800 p-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-8">
              <Link to="/">Home</Link>
              <Link to="/About">About</Link>
              <Link to="/Books">Books</Link>
            </div>

            <div className="flex gap-8">
              <Link to="/Login">Login</Link>
            </div>
          </div>
        </nav>
      </div>
    </>
  )
}

export default App
