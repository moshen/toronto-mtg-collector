# Toronto MTG card finder

A screen-scraping application to enable bulk buying MTG singles from select
Toronto (and Canadian) retailers.

## Features

- Bulk automated card search based on a text list
- Card availability and price comparison between stores
- Bulk automated adding selected cards to carts

## Setup

[Bootstrap with `mise`](https://mise.jdx.dev):

```shell
mise install
```

## Run

```shell
mise run it
```

## Developing

Make sure to run the formatter:

```shell
mise run fmt
```

## TODO

- Look at number of available cards
  - This will require a little bit of a rework as I initially was only thinking
    about commander when making this
- Add store selector
- Add toggle for foil/non-foil/cheapest preference
