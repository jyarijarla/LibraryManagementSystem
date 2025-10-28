import MovieCard from '../../components/MovieCard/MovieCard'
import './Movies.css'
// import assets from 'LibraryManagementSystem/client/src/assets/findingnemo.jpeg'

function Movies() {
  const movies = [
    {
      id: 1,
      title: 'Finding Nemo',
      age_rating: 'G',
      genre: 'Animation / Adventure',
      year: 2003,
      coverImage: ''
    },
    {
      id: 2,
      title: 'Ghost Busters',
      age_rating: 'PG',
      genre: 'Action/Comedy',
      year: 1984,
      coverImage: ''
    },
    
  ]

  return (
    <div className="movies-page">
      <h2>Available Movies</h2>
      <p className="movies-subtitle">
        Browse through our collection and find your next great watch!
      </p>

      <div className="movies-grid">
        {movies.map(movie => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  )
}

export default Movies
