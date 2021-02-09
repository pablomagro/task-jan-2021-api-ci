'use strict'

const app = require('../../app.js')
const chai = require('chai')
const expect = chai.expect
const httpStatus = require('http-status');
let event, context

describe('Tests index', () => {
  it('verifies successful response', async () => {
    const result = await app.lambdaHandler(event, context)

    expect(result).to.be.an('object')
    expect(result.statusCode).to.equal(httpStatus.OK)
    expect(result.body).to.be.an('string')

    let response = JSON.parse(result.body)

    expect(response).to.be.an('object')
    expect(response.s3Url).to.be.have.string('dqsdep-report-15')
    expect(response.day).to.be.an('number').to.be.equal(15)
    expect(response.month).to.be.an('string')
    expect(response.year).to.be.an('number')
  })
})
