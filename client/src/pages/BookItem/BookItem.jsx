import React from 'react'
import './BookItem.css'

const BookItem = () => {
  return (
    <div className="book-item">
      <h2 className="book-title">Book Title</h2>
      <p className="book-author">Author Name</p>
      <p className="book-description">This is a brief description of the book.</p>
    </div>
  )
}

export default BookItem
