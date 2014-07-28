/* Created by frank on 14-7-24. */
/* jshint -W040:true */
'use strict';

var fs = require('fs')
var path = require('path')
var through = require('through2')
var gutil = require('gulp-util')
var PluginError = gutil.PluginError
var es = require('event-stream')

var pkg = require('./package.json')

function makeStream() {
    var stream = through(function () {
        console.log("Object.keys(this):")
        console.log(Object.keys(this))
        this.queue('1')
    });
    return stream;
}

function plugin(options) {
    options = options || {}

    var prefix = new Buffer('hi ')

    var stream = through.obj(function (file, enc, cb) {

        if (file.isNull()) {
//            console.log('file is null')
        }

        if (file.isBuffer()) {
            console.log('file is buffer')

            extendFile(file, function () {
                this.push(file)
                cb()
            }.bind(this))


        }

        if (file.isStream()) {
            console.log('file is stream')
            var streamer = makeStream();
            streamer.on('error', this.emit.bind(this, 'error'));

            var masterFile

            file.contents = file.contents
                .pipe(es.split())
                .pipe(through.obj(function (chunk, enc, next) {
                    var line = chunk.toString()
                    if (!masterFile) {
                        var masterRelativePath = findMaster(line)
                        masterFile = makeFileSync(path.join(file.base, masterRelativePath))
                    } else {
                        this.push('hi \n')
                        next()
                        return

//                        var masterAbsolute = path.join(file.base, masterRelativePath)
//                        makeFile(masterAbsolute, function (masterFile) {
//
//                            extendFile(masterFile, function () {
//
//                                var masterContent = masterFile.contents.toString()
//                                var lines = masterContent.split(/\n|\r|\r\n/)
//
//                                var newLines = lines.map(function (line, index, array) {
//                                    var blockName = findPlaceholder(line)
//                                    if (blockName) {
//                                        var blockContent = getBlock(file.contents.toString(), blockName)
//                                        return blockContent || line
//                                    } else {
//                                        return line
//                                    }
//                                })
//
//                                var newContent = newLines.join('\n')
//
//                                this.push(newContent)
//                                next()
//                                return
//
//
//                            }.bind(this))
//
//                        }.bind(this))
                    }

                    this.push(chunk + '\n')
                    next()
                }))
                .on('end', function () {
                    cb()
                })
            this.push(file)

//            var masterAbsolute = path.join(file.base, masterRelativePath)
//            var masterReader = fs.createReadStream(masterAbsolute)
//            var content = new Buffer('')
//            masterReader.pipe(es.split())
//                .pipe(es.map(function (data, cb) {
//                    var placeholder = findPlaceholder(data.toString())
//                    cb(null, placeholder ? placeholder : data)
//                }))
//                .on('data', function (data) {
//                    console.log(data)
//
//                })
//
//            file.contents = Buffer.concat([prefix, file.contents]);
        }

    })

    return stream
}

function makeFile(absolutePath, cb) {
    fs.readFile(absolutePath, function (error, data) {
        if (error) { throw error }
        var file = new gutil.File({
            base: path.dirname(absolutePath),
            path: absolutePath,
            contents: new Buffer(data),
        })
        cb(file)
    })
}

function makeFileSync(absolutePath) {
    var contents = fs.readFileSync(absolutePath, {flag: 'r'})
    var file = new gutil.File({
        base: path.dirname(absolutePath),
        path: absolutePath,
        contents: new Buffer(contents),
    })
    return file
}

function extendFile(file, afterExtend) {
    var masterRelativePath = findMaster(file.contents.toString('utf-8'))
    if (!masterRelativePath) {
        afterExtend()
        return
    }

    var masterAbsolute = path.join(file.base, masterRelativePath)

    makeFile(masterAbsolute, function (masterFile) {

        extendFile(masterFile, function () {

            var masterContent = masterFile.contents.toString()
            var lines = masterContent.split(/\n|\r|\r\n/)

            var newLines = lines.map(function (line, index, array) {
                var blockName = findPlaceholder(line)
                if (blockName) {
                    var blockContent = getBlockContent(file.contents.toString(), blockName)
                    return blockContent || line
                } else {
                    return line
                }
            })

            var newContent = newLines.join('\n')

            file.contents = new Buffer(newContent)

            return afterExtend()

        })

    })

}

function include(file) {

    file.contents = new Buffer()
    return file
}

function findMaster(string) {
    var regex = /<!--\s*@@master=\s*(\S+)\s*-->/
    var match = string.match(regex)
    return match ? match[1] : null

}
function findPlaceholder(string) {
    var regex = /<!--\s*@@placeholder=\s*(\S+)\s*-->/
    var match = string.match(regex)
    return match ? match[1] : null
}
function getBlockContent(string, blockName) {
    var result = ''
    var lines = splitByLine(string)
    var inBlock = false
    var regex = new RegExp('<!--\\s*@@block=\\s*' + blockName + '\\s*-->')

    return [ '<!-- start ' + blockName + ' -->',
        lines.reduce(function (prev, current) {
            if (inBlock) {
                var matchEnd = /<!--\s*@@close\s*-->/.test(current)
                if (matchEnd) {
                    inBlock = false
                    return prev
                }
                return prev + (prev === '' ? '' : '\n') + current
            }
            var matchBegin = regex.test(current)
            if (matchBegin) {
                inBlock = true
                return prev
            } else {
                return prev
            }
        }, ''),
            '\n<!-- end ' + blockName + ' -->'
    ].join('\n')
}

function splitByLine(string) {
    return string.split(/\n|\r|\r\n/)
}

module.exports = plugin
