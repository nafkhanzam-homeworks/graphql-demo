const { createServer } = require("http");
const express = require("express");
const { execute, subscribe } = require("graphql");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { gql, ApolloServer } = require("apollo-server-express");
const { PubSub } = require("graphql-subscriptions");
const cors = require("cors");

const pubsub = new PubSub();

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
    createBook(input: CreateBookInput!): Book!
    updateBook(id: ID!, input: CreateBookInput!): Book!
    deleteBook(id: ID!): Book!
    createAuthor(input: CreateAuthorInput!): Author!
    updateAuthor(id: ID!, input: CreateAuthorInput!): Author!
  }

  type Subscription {
    bookCreated: Book!
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
      pubsub.publish("BOOK_CREATED", {
        bookCreated: book,
      });
      return book;
    },
    updateBook: (_, { id: _id, input }) => {
      const id = Number(_id);
      const filtered = db.books.filter((v) => v.id === id);
      const book = filtered[0];
      if (!book) {
        throw new Error(`Not Found!`);
      }
      db.books = db.books.filter((v) => v.id !== id);
      const newBook = {
        id,
        ...input,
      };
      db.books.push(newBook);
      if (input.authorIds) {
        db.books_authors = db.books_authors.filter((v) => v.bookId !== id);
        db.books_authors.push(
          ...input.authorIds.map((authorId) => ({
            bookId: book.id,
            authorId,
          })),
        );
      }
      return newBook;
    },
    deleteBook: (_, { id: _id }) => {
      const id = Number(_id);
      const filtered = db.books.filter((v) => v.id === id);
      const book = filtered[0];
      if (!book) {
        throw new Error(`Not Found!`);
      }
      db.books = db.books.filter((v) => v.id !== id);
      db.books_authors = db.books_authors.filter((v) => v.bookId !== id);
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
  Subscription: {
    bookCreated: {
      subscribe: () => pubsub.asyncIterator(["BOOK_CREATED"]),
    },
  },
};

(async function () {
  const app = express();

  app.use(cors());

  const httpServer = createServer(app);

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const subscriptionServer = SubscriptionServer.create(
    { schema, execute, subscribe },
    { server: httpServer, path: "/graphql" },
  );

  const server = new ApolloServer({
    schema,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],
  });
  await server.start();
  server.applyMiddleware({ app });

  const PORT = 4000;
  httpServer.listen(PORT, () =>
    console.log(`Server is now running on http://localhost:${PORT}/graphql`),
  );
})();
