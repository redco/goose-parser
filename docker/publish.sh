#!/bin/sh

if [ -z "$1" ]
  then
    echo "First arg should be environment name, for example goose-phantom-environment"
    exit
fi

environmentName=`echo "$1" | sed -n 's/goose-\(.*\)-environment/\1/p'`
environmentVersion=`npm show goose-${environmentName}-environment version`;

echo "Building image for $1";
IMAGE_NAME="redcode/goose-parser";
TAG_NAME_VERSIONED="${environmentName}-${environmentVersion}";
TAG_NAME_LATEST="${environmentName}-latest";
docker build --build-arg ENVIRONMENT=$1 -t "$TAG_NAME_VERSIONED" -t "$TAG_NAME_LATEST" -f ./Dockerfile .
DOCKER_NAME_VERSIONED="$IMAGE_NAME:$TAG_NAME_VERSIONED"
DOCKER_NAME_LATEST="$IMAGE_NAME:$TAG_NAME_LATEST"
docker tag "$TAG_NAME_VERSIONED" "$DOCKER_NAME_VERSIONED"
docker tag "$TAG_NAME_LATEST" "$DOCKER_NAME_LATEST"
docker push "$DOCKER_NAME_VERSIONED"
docker push "$DOCKER_NAME_LATEST"
docker rmi "$DOCKER_NAME_VERSIONED" "$DOCKER_NAME_LATEST"
