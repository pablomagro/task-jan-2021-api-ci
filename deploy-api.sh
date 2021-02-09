#!/bin/bash

if ! which sam ; then
  echo "sam not found. Try . virtualenv/bin/activate"
  exit 1
fi

s3_bucket='aws-sam-cli-managed-default-samclisourcebucket-u7y9djooatel'
stack_name='ElectricityPricesApi'
region='ap-southeast-2'
profile='pablo-developer'

set -x

sam build \
  --region ${region} --profile ${profile} \
  --template-file api-template-cf.yaml || exit $?

sam deploy \
  --region ${region} --profile ${profile} \
  --config-file sam-api-config.toml --stack-name ${stack_name}