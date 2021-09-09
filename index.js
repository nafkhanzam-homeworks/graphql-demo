const { gql, ApolloServer } = require("apollo-server");

const db = {
  books: [
    {
      id: 1,
      title: "book's title",
    },
  ],
  authors: [
    {
      id: 1,
      name: "author's name",
    },
  ],
  books_authors: [
    {
      authorId: 1,
      bookId: 1,
    },
  ],
};

const typeDefs = gql`
  "Buku memiliki judul dan penulis."
  type Book {
    id: ID!
    title: String!
    authors: [Author!]!
    "Tanggal terbit buku ini."
    releaseDate: String
  }

  "Author merupakan penulis buku."
  type Author {
    id: ID!
    name: String!
    books: [Book!]!
  }

  type Query {
    hello: String!
    allBooks: [Book!]!
    allAuthors: [Author!]!
    bookById(id: Int): Book
  }

  input CreateBookInput {
    title: String!
    authorIds: [Int!]
    releaseDate: String
  }

  input CreateAuthorInput {
    name: String!
    bookIds: [Int!]
  }

  type Mutation {
    createBook(input: CreateBookInput!): Book
    createAuthor(input: CreateAuthorInput!): Author
  }
`;

const resolvers = {
  Book: {
    authors: (book) => {
      const authorIds = db.books_authors
        .filter((v) => v.bookId === book.id)
        .map((v) => v.authorId);
      return db.authors.filter((v) => authorIds.includes(v.id));
    },
  },
  Author: {
    books: (author) => {
      const bookIds = db.books_authors
        .filter((v) => v.authorId === author.id)
        .map((v) => v.bookId);
      return db.books.filter((v) => bookIds.includes(v.id));
    },
  },
  Query: {
    hello: () => {
      return "Hello world!";
    },
    allBooks: () => {
      return db.books;
    },
    allAuthors: () => {
      return db.authors;
    },
  },
  Mutation: {
    createBook: (_, { input }) => {
      const bookId = db.books.length + 1;
      const book = {
        id: bookId,
        ...input,
      };
      db.books.push(book);
      if (input.authorIds) {
        db.books_authors.push(
          ...input.authorIds.map((authorId) => ({
            bookId,
            authorId,
          })),
        );
      }
      return book;
    },
    createAuthor: (_, { input }) => {
      const authorId = db.authors.length + 1;
      const author = {
        id: authorId,
        ...input,
      };
      db.authors.push(author);
      if (input.bookIds) {
        db.books_authors.push(
          ...input.bookIds.map((bookId) => ({
            bookId,
            authorId,
          })),
        );
      }
      return author;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });
server.listen(4000).then(({ url }) => {
  console.log(`Server started at ${url}`);
});
