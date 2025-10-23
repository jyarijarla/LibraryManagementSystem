import { NavLink } from 'react-router-dom'
import './App.css'

function NavBar() {
  return (
    <>
      <div className="bg-black text-white text-center p-4 font-bold">
        <nav className="bg-gray-800 p-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-8">
              <NavLink to="/">Home</NavLink>
              <NavLink to="/About">About</NavLink>
              <NavLink to="/Books">Books</NavLink>
            </div>

            <div className="flex gap-8">
              <NavLink to="/Login">Login</NavLink>
            </div>
          </div>
        </nav>
      </div>
    </>
  )
}

export default NavBar
