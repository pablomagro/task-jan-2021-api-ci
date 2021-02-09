#!/bin/bash

if ! which sam ; then
  echo "sam not found. Try . virtualenv/bin/activate"
  exit 1
fi

s3_bucket='aws-sam-cli-managed-default-samclisourcebucket-u7y9djooatel'
stack_name='CronFunction'
region='ap-southeast-2'
profile='pablo-developer'
lambda_name='quarter-qsdep-cron'

set -x

sam build \
  --region ${region} --profile ${profile} \
  --template-file lambda-template-cf.yaml || exit $?

sam deploy \
  --region ${region} --profile ${profile} \
  --config-file sam-lambda-config.toml --stack-name ${stack_name}

aws --region ${region} --profile ${profile} \
  lambda invoke --function-name ${lambda_name} out
