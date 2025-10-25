import BookCard from '../../components/BookCard/BookCard'
import './Books.css'

function Books() {
  const books = [
    {
      id: 1,
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      genre: 'Classic',
      year: 1925,
      coverImage: 'https://covers.openlibrary.org/b/id/7222246-L.jpg'
    },
    {
      id: 2,
      title: '1984',
      author: 'George Orwell',
      genre: 'Dystopian',
      year: 1949,
      coverImage: 'https://covers.openlibrary.org/b/id/7222246-L.jpg'
    },
    {
      id: 3,
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      genre: 'Historical Fiction',
      year: 1960,
      coverImage: 'https://covers.openlibrary.org/b/id/8306661-L.jpg'
    }
  ]

  return (
    <div className="books-page">
      <h2>Available Books</h2>
      <p className="books-subtitle">
        Browse through our collection and find your next great read!
      </p>

      <div className="books-grid">
        {books.map(book => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  )
}

export default Books
