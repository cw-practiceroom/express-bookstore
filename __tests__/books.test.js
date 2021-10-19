process.env.NODE_ENV = 'test';

const request = require('supertest');

const app = require('../app');
const db = require('../db');

let book_isbn;

beforeEach(async () => {
  let result = await db.query(`
    INSERT INTO books (isbn, amazon_url, author, language, pages, publisher, title, year)
    VALUES(
        '1234',
        'https://amazon.com/greatbook',
        'Joey',
        'English',
        100,
        'Book Publishers',
        'My first book',
        2000)
    RETURNING isbn`);

  book_isbn = result.rows[0].isbn;
});

describe('GET /books', async () => {
  test('gets list of one book', async () => {
    const response = await request(app).get(`/books`);
    const books = response.body.books;
    expect(books).toHaveLength(1);
    expect(books[0]).toHaveProperty('isbn');
  });
});

describe('GET /books/:isbn', async () => {
  test('Gets a single book', async () => {
    const response = await request(app).get(`books/${book_isbn}`);
    expect(response.body.book).toHaveProperty('isbn');
    expect(response.body.book.isbn).toBe(book_isbn);
  });

  test('Response with 404 for invalid book', async () => {
    const response = await request(app).get(`/books/999`);
    expect(response.statusCode).toBe(404);
  });
});

describe('POST /books', async () => {
  const response = await (
    await request(app).post(`/books`)
  ).send({
    isbn: '4321',
    amazon_url: 'https://amazon.com',
    author: 'testing',
    language: 'english',
    pages: 1000,
    publisher: 'the publisher guys',
    title: 'when i was a kid',
    year: 2000,
  });
  expect(response.statusCode).toBe(201);
  expect(response.body.book).toHaveProperty('isbn');
});

describe('PUT /books/:id', async () => {
  test('Updates a single book', async () => {
    const response = await request(app).put(`/books/${book_isbn}`).send({
      amazon_url: 'https://amazon.com/greatestbook',
      author: 'Joey',
      language: 'English',
      pages: 1000,
      publisher: 'Book Publishers',
      title: 'UPDATED',
      year: 2000,
    });
    expect(response.body.book).toHaveProperty('isbn');
    expect(response.body.book.title).toBe('UPDATED');
  });

  test('Prevents bad book update', async () => {
    const response = await request(app).put(`/books/${book_isbn}`).send({
      amazon_url: 'https://amazon.com/greatestbook',
      author: 'Joey',
      language: 'English',
      pages: 1000,
      publisher: 'Book Publishers',
      title: 'UPDATED',
      year: 2000,
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('DELETE /books/:id', async () => {
  test('Deletes a single book', async () => {
    const response = await request(app).delete(`/books/${book_isbn}`);
    expect(response.body).toEqual({ message: 'Book deleted' });
  });
});

afterEach(async () => {
  await db.query('DELETE FROM books');
});

afterAll(async () => {
  await db.end();
});
