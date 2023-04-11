const { ApolloServer, gql } = require("apollo-server");

const typeDefs = gql`
  type Movie {
    title: String!
    director: String
    cast: [String!]!
    rating: Float
  }

  type Query {
    movie(title: String!): Movie
  }
`;

const movies = [
  {
    title: "The Shawshank Redemption",
    director: "Frank Darabont",
    cast: ["Tim Robbins", "Morgan Freeman", "Bob Gunton"],
    rating: 9.3,
  },
  {
    title: "The Godfather",
    director: "Francis Ford Coppola",
    cast: ["Marlon Brando", "Al Pacino", "James Caan"],
    rating: 9.2,
  },
  {
    title: "The Dark Knight",
    director: "Christopher Nolan",
    cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
    rating: 9.0,
  },
];

const resolvers = {
  Query: {
    movie: (_, { title }) => {
      return movies.find((movie) => movie.title === title);
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
