'use strict'

const getSurveyObject = (month, year) => {
  return {
    date: {
      day: 15,
      month,
      year
    },
    searchString: `15 ${month} ${year}`
  }
}

const getQSDEPDateSurvey = (day, month, year) => {
  const dateObject = new Date()
  day = day | dateObject.getUTCDate()
  month = month | dateObject.getUTCMonth() + 1
  year = year | dateObject.getUTCFullYear()

  const current = new Date(year, dateObject.getUTCMonth(), day)

  let quarter = new Date(year, 1, 15)
  if (current < quarter) {
    return getSurveyObject('November', --year)
  }
  quarter = new Date(year, 4, 15)
  if (current < quarter) {
    return getSurveyObject('February', year)
  }
  quarter = new Date(year, 7, 15)
  if (current < quarter) {
    return getSurveyObject('May', year)
  }
  quarter = new Date(year, 10, 15)
  if (current < quarter) {
    return getSurveyObject('August', year)
  }
  return getSurveyObject('November', --year)
}

const getShortMonth = (month) => {
  switch (month) {
    case 'November':
      return 'nov'
    case 'May':
      return 'may'
    case 'February':
      return 'feb'
    case 'August':
      return 'aug'
    default:
      return ''
  }
}

const getHeaders = () => {
  return {
    "Access-Control-Allow-Headers" : "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
  }
}

module.exports = {
  getHeaders,
  getQSDEPDateSurvey,
  getShortMonth,
}
