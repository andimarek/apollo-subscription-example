import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import gql from "graphql-tag";
import {ApolloLink, Observable, ApolloClient, InMemoryCache} from '@apollo/client';
import {print} from 'graphql';
import PubNub from "pubnub";

// init a pubnub client
const pubnub = new PubNub({
    publishKey: "<>",
    subscribeKey: "<>",
    secretKey: "<>",
    uuid: "russell-test1-myUniqueUUID",
});

// publishing to pub nub channel
async function publishSampleMessage() {
    console.log(
        "Since we're publishing on subscribe connectEvent, we're sure we'll receive the following publish."
    );
    const result = await pubnub.publish({
        channel: "hello_world",
        message: {
            title: "greeting",
            description: "hello world!",
        },
    });
    console.log("published  at " + result.timetoken);

    const result2 = await pubnub.publish({
        channel: "hello_world",
        message: {
            title: "greeting2",
            description: "hello world2!",
        },
    });
    console.log("published  at " + result2.timetoken);
}


class PubnubLink extends ApolloLink {

    constructor(options) {
        super();
    }

    request(operation) {
        return new Observable((observer) => {
            // argument observer is the 'graphqlSubscriptionObserver'
            console.log('apollo link intercepted graphql subscribe request: ',{ ...operation, query: print(operation.query)});


            console.log('wire pubnub to apollo link');
            pubnub.addListener({
                // function triggered when pub nub status change
                // publish hard coded message on channel 'hello_world'
                // should publish result of 'operation.query'
                status: function (statusEvent) {
                    if (statusEvent.category === "PNConnectedCategory") {
                        publishSampleMessage();
                    }
                },
                // function triggered when new event arrive.
                message: function (messageEvent) {
                    observer.next(messageEvent);
                },
                // function triggered when error happen
                error: function (exception) {
                    observer.error(exception)
                },
                presence: function (presenceEvent) {
                    // handle presence
                }
            });

            console.log("init pubnub subscription ");
            pubnub.subscribe({
                channels: ["hello_world"]// 'hello_world' channel info should be programmatically created
            });

        });
    }
}



// Only standard apollo link used since here
const client = new ApolloClient({
    link: new PubnubLink({}),
    cache: new InMemoryCache()
});


let graphqlSubscriptionObserver = {
    start: function (subscription) {
        console.log("in observer start");
        console.log(subscription);
    },
    next: function (result) {
        console.log("in observer next");
        console.log(result);
    },
    error: function (errorValue) {
        console.log("in observer error");
        console.log(errorValue);
    },
    complete: function () {
        console.log("in subscriber complete");
    }
};

console.log("fire graphql subscription");
client.subscribe({
    query: gql`
        subscription {
            newPeopleAdded {id name}
        }
    `
})
.subscribe(graphqlSubscriptionObserver);


ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
