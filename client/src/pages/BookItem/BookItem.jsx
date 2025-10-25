import { useParams } from 'react-router-dom'
import './BookItem.css'

function BookItem() {
  const { id } = useParams()

  // In a real app, you'd fetch the book data using the ID (from an API or context)
  // For now, we’ll just mock it
  const book = {
    id,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    description:
      'A novel about the disillusionment and decay of the American Dream in the 1920s.',
    genre: 'Classic',
    year: 1925,
    coverImage: 'https://covers.openlibrary.org/b/id/7222246-L.jpg'
  }

  return (
    <div className="book-item">
      <img src={book.coverImage} alt={book.title} className="book-item-cover" />
      <div className="book-item-info">
        <h2>{book.title}</h2>
        <p><strong>Author:</strong> {book.author}</p>
        <p><strong>Genre:</strong> {book.genre}</p>
        <p><strong>Year:</strong> {book.year}</p>
        <p className="book-item-description">{book.description}</p>
      </div>
    </div>
  )
}

export default BookItem
