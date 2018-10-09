#!/bin/sh

if [ -z "$1" ]
  then
    echo "First arg should be environment name, for example goose-phantom-environment"
    exit
fi

environmentName=`echo "$1" | sed -n 's/goose-\(.*\)-environment/\1/p'`
environmentVersion=`npm show goose-${environmentName}-environment version`;
gooseVersion=`npm show goose-parser version`;

echo "Building image for goose-parser based on $1";
IMAGE_NAME="redcode/goose-parser";
TAG_NAME_VERSIONED="${IMAGE_NAME}:${environmentName}-${environmentVersion}-parser-${gooseVersion}";
TAG_NAME_LATEST="${IMAGE_NAME}:${environmentName}-latest-parser-${gooseVersion}";
docker build --build-arg ENVIRONMENT=$1 --build-arg ENVIRONMENT_VERSION=$environmentVersion -t "$TAG_NAME_VERSIONED" -t "$TAG_NAME_LATEST" -f ./Dockerfile .
docker tag "$TAG_NAME_VERSIONED" "$TAG_NAME_VERSIONED"
docker tag "$TAG_NAME_LATEST" "$TAG_NAME_LATEST"
docker push "$TAG_NAME_VERSIONED"
docker push "$TAG_NAME_LATEST"
