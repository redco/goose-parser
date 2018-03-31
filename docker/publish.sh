#!/bin/sh

if [ -z "$1" ]
  then
    echo "First arg should be environment name, for example goose-phantom-environment"
    exit
fi

allowedEnvironments=("phantom" "chrome" "jsdom")
environment=`echo "$1" | sed -n 's/goose-\(.*\)-environment/\1/p'`

echo "$environment";

if [[ !" ${allowedEnvironments[*]} " == ` echo "$environment" ` ]]
then
  echo "First arg should be valid environment name, one of (goose-phantom-environment, goose-chrome-environment, goose-jsdom-environment)"
  exit
fi

#echo "Building image for $1";
#TAG_NAME="goose-parser";
#IMAGE_NAME="$TAG_NAME";
#docker build --build-arg ENVIRONMENT=$1 -t "$IMAGE_NAME" -f ./Dockerfile .
#DOCKER_NAME="registry.gitlab.com/findexchange/front-page:$TAG_NAME"
#docker tag "$IMAGE_NAME" "$DOCKER_NAME"
#docker push "$DOCKER_NAME"
#docker run --rm -e "TAG_NAME=$TAG_NAME" appropriate/curl -X POST -H 'Content-type:application/json' --data "{\"text\":\"A new version of *front-page* project is available for install\" ,\"link_names\":1,\"username\":\"release-bot\",\"icon_emoji\":\":monkey_face:\",\"attachments\":[{\"text\":\"$TAG_NAME\",\"callback_id\":\"release\",\"color\":\"#B3FF0E\",\"attachment_type\":\"default\"}]}" https://hooks.slack.com/services/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
#docker rmi "$IMAGE_NAME"
