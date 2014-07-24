/* Created by frank on 14-7-24. */
/* jshint -W040:true */
'use strict';

var fs = require('fs')
var path = require('path')
var through = require('through2')
var gutil = require('gulp-util')
var PluginError = gutil.PluginError;

var pkg = require('./package.json')

function makeStream(prefixText) {
    var stream = through();
    stream.write(prefixText);
    return stream;
}

function plugin(options) {
    options = options || {}

    var prefix = new Buffer('hi ')

    var stream = through.obj(function (file, enc, cb) {

        if (file.isNull()) {
            console.log('file is null')
        }

        if (file.isBuffer()) {
            console.log('file is buffer')
            file.contents = Buffer.concat([prefix, file.contents]);

        }

        if (file.isStream()) {
            console.log('file is stream')
            var streamer = makeStream(prefix);
            streamer.on('error', this.emit.bind(this, 'error'));
            file.contents = file.contents.pipe(streamer);
        }

        this.push(file)
        return cb()
    })

    return stream
}

function include(file) {

    file.contents = new Buffer()
    return file
}

module.exports = plugin
