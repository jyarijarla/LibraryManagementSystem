import { useNavigate } from 'react-router-dom'
import './MovieCard.css'

function MovieCard({ movie }) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/movies/${movie.id}`)
  }

  return (
    <div className="movie-card" onClick={handleClick}>
      <img src={movie.coverImage} alt={movie.title} className="movie-cover" />
      <div className="movie-info">
        <h3 className="movie-title">{movie.title}</h3>
        <p className="movie-age_rating">{movie.age_rating}</p>
        <p className="movie-genre">{movie.genre}</p>
        <p className="movie-year">{movie.year}</p>
      </div>
    </div>
  )
}

export default MovieCard
