/* Created by frank on 14-7-25. */
/* global describe, it */
'use strict';

var assert = require('assert')
var es = require('event-stream')
var File = require('vinyl')
var plugin = require('./index')
var gutil = require('gulp-util')

describe('gulp-html-helper', function () {

    it('should prepend text', function (done) {

        // create the fake file
        var fakeFile = new File({
            contents: new Buffer('abufferwiththiscontent')
        })

        // Create a prefixer plugin stream
        var myPrefixer = plugin()

        // write the fake file to it
        myPrefixer.write(fakeFile)

        // wait for the file to come back out
        myPrefixer.once('data', function (file) {
            // make sure it came out the same way it went in
            assert(file.isBuffer())

            // check the contents
            assert.equal(file.contents.toString('utf8'), 'hi abufferwiththiscontent')
            done()
        })

    })


    it('should prepend text', function (done) {

        // create the fake file
        var fakeFile = new File({
            contents: es.readArray(['stream', 'with', 'those', 'contents'])
        })

        // Create a prefixer plugin stream
        var myPrefixer = plugin()

        // write the fake file to it
        myPrefixer.write(fakeFile)

        // wait for the file to come back out
        myPrefixer.once('data', function (file) {
            // make sure it came out the same way it went in
            assert(file.isStream())

            // buffer the contents to make sure it got prepended to
            file.contents.pipe(es.wait(function (err, data) {
                // check the contents
                assert.equal(data.toString('utf-8'), 'hi streamwiththosecontents')
                done()
            }))
        })

    })

    it('should let null files pass through', function (done) {
        var stream = plugin(),
            n = 0;
        stream.pipe(es.through(function (file) {
            assert.equal(file.path, 'null.md');
            assert.equal(file.contents, null);
            n += 1;
        }, function () {
            assert.equal(n, 1);
            done();
        }));
        stream.write(new gutil.File({
            path: 'null.md',
            contents: null
        }));
        stream.end();
    });
})
