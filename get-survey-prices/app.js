'use strict'

const AWS = require('aws-sdk')
//*/ get reference to S3 client
const s3 = new AWS.S3({
  region: 'ap-southeast-2'
});

const httpStatus = require('http-status')
const { getQSDEPDateSurvey, getShortMonth, getHeaders } = require('lib/file-survey-helper')
const S3_BUCKET_URL = process.env.S3_BUCKET_URL

let response

exports.lambdaHandler = async (event, context) => {
  try {
    const { date: { day, month, year } } = getQSDEPDateSurvey()
    const fileName = encodeURIComponent((`qsdep-report-${day}-${getShortMonth(month)}-${year}.xlsx`).replace(/ /g,''))
    const s3Url = `${S3_BUCKET_URL}${fileName}`

    // Commented due getting FORBIDEN issues by the anti scrapping proxy.
    // const responseData = await s3.getObject({
    //   Bucket: S3_BUCKET_NAME,
    //   Key: s3Key
    // }).promise()

    // response = {
    //   'statusCode': httpStatus.OK,
    //   'headers': {
    //     name: fileName,
    //     'Content-Type': 'application/json',
    //   },
    //   'body': JSON.stringify(responseData),
    //   'isBase64Encoded': false
    // }

    const responseBody = {
      s3Url,
      day, month, year
    };

    response = {
      statusCode: httpStatus.OK,
      headers: getHeaders(),
      body: JSON.stringify(responseBody),
      isBase64Encoded: false
    }
  } catch (error) {
    console.log(error)
    throw new Error(`Error getting S3 link.`)
  }

  return response
};