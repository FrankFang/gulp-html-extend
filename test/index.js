/* Created by frank on 14-7-25. */
/* global describe, it */
'use strict';

var es = require('event-stream')
var File = require('vinyl')
var plugin = require('../index.js')
var gutil = require('gulp-util')
var path = require('path')
var pj = path.join
var fs = require('fs')
var should = require('should')

function createVinyl(relativePath, contents) {
    var base = pj(__dirname, 'fixtures')
    var filePath = pj(base, relativePath)

    return new gutil.File({
        cwd: __dirname,
        base: base,
        path: filePath,
        contents: contents || fs.readFileSync(filePath)
    })
}

describe('gulp-html-extend', function () {

    it('should pass file when it isNull()', function (done) {
        var instance = plugin()
        var emptyFile = {
            isNull: function () { return true }
        }
        instance.on('data', function (data) {
            data.should.equal(emptyFile)
            done()
        })
        instance.write(emptyFile)
    })

    it('should emit an error when it isStream()', function (done) {

        var instance = plugin()
        var stream = {
            isNull: function () { return false },
            isStream: function () { return true }
        }
        instance.on('error', function (error) {
            error.message.should.equal('Streaming is not supported')
            done()
        })
        instance.write(stream)
    })

    it('should extend single html file', function (done) {
        var htmlFile = createVinyl('c.html')

        var instance = plugin()

        instance.on('data', function (extendedFile) {
            should.exist(extendedFile)
            should.exist(extendedFile.contents)
            extendedFile.contents.toString().should.equal(
                fs.readFileSync(pj(__dirname, 'expected/c.html'), 'utf8'))
            done()
        })

        instance.write(htmlFile)
    })

    it('should extend multiple html files', function (done) {
        var files = [
            createVinyl('c.html'),
            createVinyl('d.html')
        ]

        var instance = plugin()
        var count = files.length
        instance.on('data', function (htmlFile) {
            should.exist(htmlFile)
            should.exist(htmlFile.contents)

            count -= 1
            if (count === 0) { done() }
        })

        files.forEach(function (file) {
            instance.write(file)
        })
    })

})
