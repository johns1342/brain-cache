#!/bin/bash

export INLINE_RUNTIME_CHUNK=false
export GENERATE_SOURCEMAP=false

build() {
    rm -rf dist/*

    react-scripts build

    mkdir -p dist
    cp -r build/* dist

    mv dist/index.html dist/popup.html
}

build
