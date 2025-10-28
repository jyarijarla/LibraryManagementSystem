import { useParams } from 'react-router-dom'
import './MovieItem.css'

function MovieItem() {
  const { id } = useParams()

  // In a real app, you'd fetch the book data using the ID (from an API or context)
  // For now, we’ll just mock it
  const movie = {
    id,
    title: 'Finding Nemo',
    age_rating: 'G',
    description:
      'After his son is captured in the Great Barrier Reef and taken to Sydney, a timid clownfish sets out on a journey to bring him home.',
    genre: 'Animation / Adventure',
    year: 2003,
    coverImage: 'https://covers.openlibrary.org/b/id/7222246-L.jpg'
  }

  return (
    <div className="movie-item">
      <img src={movie.coverImage} alt={movie.title} className="movie-item-cover" />
      <div className="movie-item-info">
        <h2>{movie.title}</h2>
        <p><strong>Age_Rating:</strong> {movie.age_rating}</p>
        <p><strong>Genre:</strong> {movie.genre}</p>
        <p><strong>Year:</strong> {movie.year}</p>
        <p className="movie-item-description">{movie.description}</p>
      </div>
    </div>
  )
}

export default MovieItem
