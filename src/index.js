import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import gql from "graphql-tag";
import { createClient } from "graphql-ws";
import { ApolloLink, Observable, ApolloClient, InMemoryCache } from '@apollo/client';
import { print } from 'graphql';

class WebSocketLink extends ApolloLink {

  constructor(options) {
    super();
    this.client = createClient(options);
  }

  request(operation) {
    return new Observable((sink) => {
      console.log('subscribe: ',{ ...operation, query: print(operation.query)});
      return this.client.subscribe(
        { ...operation, query: print(operation.query) },
        {
          next: sink.next.bind(sink),
          complete: sink.complete.bind(sink),
          error: (err) => {
            console.log('error: ', err);
            if (err instanceof Error) {
              sink.error(err);
            } else if (err instanceof CloseEvent) {
              sink.error(
                new Error(
                  `Socket closed with event ${err.code}` + err.reason
                    ? `: ${err.reason}` // reason will be available on clean closes
                    : '',
                ),
              );
            } else {
              sink.error(
                new Error(
                  err
                    .map(({ message }) => message)
                    .join(', '),
                ),
              );
            }
          },
        },
      );
    });
  }
}

const wsLink = new WebSocketLink({
  url: 'ws://localhost:8080/graphql/websocket'
});


const client = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache()
});



client
  .subscribe({
    query: gql`
      subscription {
        newPeopleAdded {id name}
      }
    `
  })
  .subscribe(result => console.log(result));

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
