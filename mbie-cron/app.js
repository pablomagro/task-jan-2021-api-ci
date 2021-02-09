'use strict'

const AWS = require('aws-sdk');
//*/ Get a reference to S3 client.
const s3 = new AWS.S3({
  region: 'ap-southeast-2'
});

const fs = require('fs')
const os = require('os');
const path = require('path')

// Monkey patch before you require http for the first time.
process.binding('http_parser').HTTPParser = require('http-parser-js').HTTPParser
const http = require('http')
    , https = require('https')

// Load third party libraries.
const cheerio = require('cheerio')
const ExcelJS = require('exceljs')
const chromium = require('chrome-aws-lambda')
const httpStatus = require('http-status')
const randomUA = require('modern-random-ua')

// Load app libraries.
const { getQSDEPDateSurvey,  } = require('lib/file-survey-helper')

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME
const MBIE_BASE_URL =  process.env.MBIE_URL
const SEARCH_URL = process.env.SEARCH_URL
const SEARCH_LINK_URL = `${MBIE_BASE_URL}/${SEARCH_URL}`


/**
 * Fink survey XLSX link based on current date.
 *
 * @param {*} content A URL content.
 * @return {string} Partial link file.
 */
const getLinkFromUrl = async (content) => {
  let linkSurvey = null
  if (!content) return linkSurvey

 const $ = cheerio.load(content)
 const links = $('a')
 const stringToSearch = `Quarterly Survey of Domestic Electricity Prices to ${getQSDEPDateSurvey().searchString} [XLSX`
 console.log(stringToSearch)

 await $(links).each((i, link) => {
   if ($(link).text().indexOf(stringToSearch) !== -1) {
     // console.log($(link).text() + ':\n  ' + $(link).attr('href'))
     linkSurvey = $(link).attr('href')
     return !true
   }
 })

 return linkSurvey
}

const getContent = async (URL) => {
 let browser
 const myArgs = [
   `--user-agent="${randomUA.generate()}"`
]

 try {
   const allArgs =  [ ...chromium.args, ...myArgs ]
   browser = await chromium.puppeteer.launch({
     args: allArgs,
     defaultViewport: chromium.defaultViewport,
     executablePath: await chromium.executablePath,
     headless: true, // chromium.headless,
     slowMo: 250,
     ignoreHTTPSErrors: true,
   })

   const page = await browser.newPage()
   await page.goto(URL)

   const html = await page.content()

   await page.close()

   return html
 }
 catch (error) {
   throw error
 }
 finally {
   if (browser !== null) {
     await browser.close()
   }
 }
}

/**
* Downloads file from remote HTTP[S] host and puts its contents to the
* specified location.
*/
async function download(url, filePath) {
 const proto = !url.charAt(4).localeCompare('s') ? https : http

 return new Promise((resolve, reject) => {
   const file = fs.createWriteStream(filePath)
   let fileInfo = null

   const request = proto.get(url, response => {
     if (response.statusCode !== httpStatus.OK) {
       reject(new Error(`Failed to get '${url}' (${response.statusCode})`))
       return
     }

     fileInfo = {
       mime: response.headers['content-type'],
       size: parseInt(response.headers['content-length'], 10),
     }

     response.pipe(file)
   })

   // The destination stream is ended by the time it's called
   file.on('finish', () => resolve(fileInfo))

   request.on('error', err => {
     fs.unlink(filePath, () => reject(err))
   })

   file.on('error', err => {
     fs.unlink(filePath, () => reject(err))
   })

   request.end()
 })
}

/**
 * Given a XLSX file, remove all worksheet(s) different of 'RawData'.
 *
 * @param {*} pathFileName XLSX file path.
 */
const getRawDataFromXlsx = async (pathFileName) => {
 const workbook = new ExcelJS.Workbook()
 await workbook.xlsx.readFile(pathFileName)
 let removedWorksheets = 0

 workbook.eachSheet((worksheet, sheetId) => {
   if (worksheet.name !== 'RawData') {
      workbook.removeWorksheet(sheetId)
      removedWorksheets++
   }
 })

 await workbook.xlsx.writeFile(pathFileName)
 return removedWorksheets
}

const uploadFileToS3 = async (fileName, keyName) => {
 // Read content from the file
 const fileContent = fs.readFileSync(fileName)

 // Setting up S3 upload parameters.
 const params = {
   Bucket: S3_BUCKET_NAME,
   Key: keyName,
   Body: fileContent
 }

 // Uploading files to the bucket.
 const stored = await s3.upload(params).promise()
 console.log(`File uploaded successfully. ${stored.Location}`)

 return stored.VersionId
}

exports.lambdaHandler = async (event, context) => {
  let response

  try {
    const content = await getContent(SEARCH_LINK_URL)
    if (!content)
      throw new Error(`Unable to find the content "${SEARCH_LINK_URL}".`)

    const surveyLink = await getLinkFromUrl(content)
    if (!surveyLink)
      throw new Error(`Unable to find the link "${SEARCH_LINK_URL}".`)

    const fileToDownload = `${MBIE_BASE_URL}${surveyLink}`
    const fileName = fileToDownload.substring(fileToDownload.lastIndexOf('/') + 1) // Get file name.
    let filePath = path.resolve('/tmp', '.', fileName)

    const fileInfo = await download(fileToDownload, filePath)
    if (!fileInfo.size)
      throw new Error(`File "${fileToDownload}" not found.`)

    // Remove not needed worksheets.
    await getRawDataFromXlsx(filePath)

    // Upload XLSX survey file to S3.
    response = await uploadFileToS3(filePath, fileName)

    const responseBody = {
      fileUploaded: fileName,
      ...response
    }

    response = {
      statusCode: httpStatus.OK,
      body: JSON.stringify(responseBody),
    }
  }
  catch (error) {
    console.log(error)
    throw new Error(`Error getting Quarterly Survey of Domestic Electricity Prices (QSDEP) data.`)
  }

  return response
}