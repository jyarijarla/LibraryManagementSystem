import { useNavigate } from 'react-router-dom'
import './BookCard.css'

function BookCard({ book }) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/books/${book.id}`)
  }

  return (
    <div className="book-card" onClick={handleClick}>
      <img src={book.coverImage} alt={book.title} className="book-cover" />
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
        <p className="book-genre">{book.genre}</p>
        <p className="book-year">{book.year}</p>
      </div>
    </div>
  )
}

export default BookCard
