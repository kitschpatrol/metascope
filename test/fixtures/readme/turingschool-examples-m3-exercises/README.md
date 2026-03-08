# API Consumption

The tests in this repo require you to make API calls to a number of different services, each linked below. Your goal is to make the tests pass.

In order to get started, run `bundle` and then `rspec`. You should get a series of errors that will give you some idea of what to do next.

This repo uses [dotenv](https://github.com/bkeepers/dotenv) to store API keys and protect them from being pushed to any version control system.

The documentation below has been broken into three groups, depending on the level of challenge you'd like to pursue. You may wish to run tests from a single file or a single test from a single file to further focus your work.

## Mild

* AdviceService uses [the Advice Slip JSON API](https://api.adviceslip.com/) - This one has been completed as an example
* ChuckService uses [chucknorris.io](https://api.chucknorris.io/)

## Medium

* MusixMatchService uses [musixmatch API](https://developer.musixmatch.com/)

## Spicy

* MarvelService uses [the Marvel Comics API](https://developer.marvel.com/)

###### Helpful Hint:

1. To use `JSON.parse` you will need to `require 'json'` at the top of the file.
2. To use `Faraday`, you might need to `require 'faraday'` at the top of the file.
