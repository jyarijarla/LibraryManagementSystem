const db = require('./db');

// Script to fix books with no rentable entries
console.log('🔧 Fixing books with 0 copies...\n');

// Find all books with no rentable entries
const findBooksQuery = `
  SELECT b.Asset_ID, b.Title 
  FROM book b 
  LEFT JOIN rentable r ON b.Asset_ID = r.Asset_ID 
  GROUP BY b.Asset_ID 
  HAVING COUNT(r.Rentable_ID) = 0
`;

db.query(findBooksQuery, (err, books) => {
  if (err) {
    console.error('❌ Error finding books:', err);
    process.exit(1);
  }

  console.log(`📚 Found ${books.length} books with 0 copies\n`);

  if (books.length === 0) {
    console.log('✅ All books have rentable entries!');
    process.exit(0);
  }

  console.table(books);
  console.log('\n');

  // Ask user how many copies to add for each book
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let currentIndex = 0;
  const booksToFix = [];

  const askForCopies = () => {
    if (currentIndex >= books.length) {
      rl.close();
      processFixes();
      return;
    }

    const book = books[currentIndex];
    rl.question(`How many copies for "${book.Title}" (Asset_ID: ${book.Asset_ID})? [default: 1]: `, (answer) => {
      const copies = parseInt(answer) || 1;
      booksToFix.push({ Asset_ID: book.Asset_ID, Title: book.Title, Copies: copies });
      currentIndex++;
      askForCopies();
    });
  };

  const processFixes = () => {
    console.log('\n🔨 Processing fixes...\n');
    
    let processedCount = 0;
    const totalBooks = booksToFix.length;

    booksToFix.forEach(book => {
      const rentableQuery = 'INSERT INTO rentable (Asset_ID, Availability, Fee) VALUES (?, 1, 0.00)';
      
      let insertedCopies = 0;
      for (let i = 0; i < book.Copies; i++) {
        db.query(rentableQuery, [book.Asset_ID], (err) => {
          if (err) {
            console.error(`❌ Error adding rentable for ${book.Title}:`, err.message);
          }
          insertedCopies++;

          if (insertedCopies === book.Copies) {
            processedCount++;
            console.log(`✅ Added ${book.Copies} copies for "${book.Title}" (Asset_ID: ${book.Asset_ID})`);

            if (processedCount === totalBooks) {
              console.log(`\n🎉 Done! Fixed ${totalBooks} books.`);
              process.exit(0);
            }
          }
        });
      }
    });
  };

  // Offer bulk option
  rl.question('\nWould you like to add 1 copy to all books? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      booksToFix.push(...books.map(book => ({ Asset_ID: book.Asset_ID, Title: book.Title, Copies: 1 })));
      rl.close();
      processFixes();
    } else {
      console.log('\nOkay, let\'s go through each book:\n');
      askForCopies();
    }
  });
});
