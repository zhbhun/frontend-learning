import { ApolloClient, InMemoryCache, gql } from "@apollo/client";

const client = new ApolloClient({
  uri: "/graphql",
  cache: new InMemoryCache(),
});

client
  .query({
    query: gql`
      query {
        movie(title: "The Dark Knight") {
          title
          director
          cast
          rating
        }
      }
    `,
  })
  .then((data) => console.log(data));

// ---

fetch("/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query:
      '{ movie(title: "The Godfather") { title, director, cast, rating } }',
  }),
})
  .then((response) => response.json())
  .then((data) => console.log(data));
