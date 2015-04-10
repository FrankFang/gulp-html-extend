/* Created by frank on 14-7-24. */
/* jshint -W040:true */
'use strict';

var fs = require('fs')
var path = require('path')
var through2 = require('through2')
var gUtil = require('gulp-util')
var PluginError = gUtil.PluginError
var es = require('event-stream')
var extend = require('node.extend')

var pkg = require('./package.json')


var defaultOptions = {
    annotations: true,
    verbose: false
}

var noop = function () { }

var _options
var log = noop

module.exports = function (options) {

    _options = extend({}, defaultOptions, options || {})

    if (_options.verbose) {
        log = gUtil.log
    }

    return through2.obj(function (file, enc, cb) {

        if (file.isNull()) {
            return cb(null, file)
        }

        if (file.isStream()) {
            return cb(new PluginError(pkg.name, 'Streaming is not supported'))
        }

        if (file.isBuffer()) {

            extendFile(file,_options, function (noMaster) {
                return cb(null, file)
            })
        }


    })

}

function makeFile(absolutePath, cb) {
    if (cb) {
        fs.readFile(absolutePath, function (error, data) {
            if (error) { throw error }
            var file = new gUtil.File({
                base: path.dirname(absolutePath),
                path: absolutePath,
                contents: new Buffer(data),
            })
            cb(file)
        })
    } else {
        return new gUtil.File({
            base: path.dirname(absolutePath),
            path: absolutePath,
            contents: new Buffer(fs.readFileSync(absolutePath)),
        })
    }
}

function extendFile(file, options ,afterExtend) {

    log('[going to extend]', file.path)

    interpolateIncludedContent(file, options)

    var master = findMaster(file.contents.toString('utf-8'))

    if (!master) { // I have not checked for include
        log('[no master]', file.path)
        afterExtend()
        return
    }

    var masterRelativePath = master.path

    log('[find master path]' + masterRelativePath)

    if (!masterRelativePath) {
        afterExtend()
        return
    }

    var masterAbsolute 
    if(options.root && isRelativeToRoot(masterRelativePath)){
        masterAbsolute = path.join(process.cwd(), options.root, masterRelativePath)
    }else{
        masterAbsolute = path.join(path.dirname(file.path), masterRelativePath)
    }

    makeFile(masterAbsolute, function (masterFile) {

        extendFile(masterFile, _options, function () {

            var masterContent = masterFile.contents.toString()
            var lines = splitByLine(masterContent)

            var newLines = lines.map(function (line, index, array) {
                line = interpolateVariables(line, master.context)
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

function interpolateIncludedContent(file, options) {
    var fileContent = file.contents.toString()
    var fileLines = splitByLine(fileContent)
    var includedLines = fileLines.map(function (line) {
        var include = findInclude(line)
        if (include && include.path) {
            var includeAbsolutePath
            if(options.root && isRelativeToRoot(include.path)){
                includeAbsolutePath = path.join(process.cwd(), options.root, include.path)
            }else{
                includeAbsolutePath = path.join(path.dirname(file.path), include.path)
            }
            log('[include]', includeAbsolutePath)
            var includedFile = makeFile(includeAbsolutePath)
            if (include.context) {
                includedFile.contents = new Buffer(interpolateVariables(includedFile.contents.toString(),
                    include.context))
            }
            interpolateIncludedContent(includedFile, options)
            if (_options.annotations) {
                return [
                        '<!-- start ' + path.basename(includeAbsolutePath) + '-->',
                    includedFile.contents.toString(),
                        '<!-- end ' + path.basename(includeAbsolutePath) + '-->'
                ].join('\n')
            } else {
                return includedFile.contents.toString()
            }
        } else {
            return line
        }
    })

    file.contents = new Buffer(includedLines.join('\n'))

}

function findMaster(string) {
    var regex = /<!--\s*@@master\s*[= ]\s*(\S+)\s*(?:([^-]+)\s*)?-->/
    var match = string.match(regex)
    return match ? {
        path: match[1],
        context: match[2] ? JSON.parse(match[2]) : null
    } : null
}

function findInclude(string) {
    var regex = /<!--\s*@@include\s*[= ]\s*(\S+)\s*(?:([^-]+)\s*)?-->/
    var match = string.match(regex)
    return match ? {
        path: match[1],
        context: match[2] ? JSON.parse(match[2]) : null
    } : null

}

function findPlaceholder(string) {
    var regex = /<!--\s*@@placeholder\s*[= ]\s*(\S+)\s*-->/
    var match = string.match(regex)
    return match ? match[1] : null
}

function interpolateVariables(template, context) {
    if (!context) { return template }
    if (template.indexOf('@@var') < 0) { return template }
    var regex = /<!--\s*@@var\s*[= ]\s*([^- ]+)\s*-->/
    var match = regex.exec(template)
    while (match) {
        template = template.replace(match[0], context[match[1]] || '')
        match = regex.exec(template)
    }
    return template
}

function getBlockContent(string, blockName) {
    var result = ''
    var lines = splitByLine(string)
    var inBlock = false
    var regex = new RegExp('<!--\\s*@@block\\s*[= ]\\s*' + blockName + '\\s*-->')

    return [ _options.annotations ? '<!-- start ' + blockName + ' -->' : '',
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
        _options.annotations ? '\n<!-- end ' + blockName + ' -->' : ''
    ].join('\n')
}

function splitByLine(string) {
    return string.split(/\r\n|\n|\r/)
}


function inAbsolutePath(p){
    return path.resolve(p) === path.normalize(p)
}
function isRelativeToRoot(p){
    return p.indexOf(path.normalize(path.sep)) === 0
}
