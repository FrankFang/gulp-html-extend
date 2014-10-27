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
var async = require('async')

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

            extendFile(file, function (noMaster) {
                return cb(null, file)
            })
        }


    })

}

function makeFile(absolutePath, cb) {
    if (cb) {
        fs.readFile(absolutePath, function (error, data) {
            if (error) { 
		throw error 
	    }
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

function extendFile(file, afterExtend) {

    log('[extend]', file.path)

    interpolateIncludedContent(file,  function (retStr) {
    	
	    var master = findMaster(file.contents.toString('utf-8'))

	    if (!master) {
	        afterExtend()
	        return
	    }

	    var masterRelativePath = master.path

	    if (!masterRelativePath) {
	        afterExtend()
	        return
	    }

	    var masterAbsolute = path.join(path.dirname(file.path), masterRelativePath)

	    makeFile(masterAbsolute, function (masterFile) {

	        extendFile(masterFile, function () {

	            var masterContent = masterFile.contents.toString()
	            var lines = masterContent.split(/\n|\r|\r\n/)

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
    })
}
function interpolateIncludedContent(file, done) {

	var fileContent = file.contents.toString()
	var fileLines = splitByLine(fileContent)
	
	async.map(fileLines, function (line, callback) {
		var include = findInclude(line)
		var includeRelativePath
		if (include) {
			includeRelativePath = include.path
		}
		if (includeRelativePath) {
			var includeAbsolutePath = path.join(path.dirname(file.path), includeRelativePath)
			log('[include]', includeAbsolutePath)
			var includedFile = makeFile(includeAbsolutePath)
			
			var afterExtend = function () {
				
				if (include.context) {
					includedFile.contents = new Buffer(interpolateVariables(includedFile.contents.toString(),
						include.context))
				}
				interpolateIncludedContent(includedFile, function (theFile) {
					if (_options.annotations) {
						callback(null, [
							'<!-- start ' + path.basename(includeAbsolutePath) + '-->',
							includedFile.contents.toString(),
							'<!-- end ' + path.basename(includeAbsolutePath) + '-->'
						].join('\n'))
					} else {
						callback(null, includedFile.contents.toString())
					}
				})
			}
			var master = findMaster(includedFile.contents.toString('utf-8'))

			if (master && master.path) {
				var masterAbsolute = path.join(path.dirname(includedFile.path), master.path)

				makeFile(masterAbsolute, function(masterFile) {

					extendFile(masterFile, function() {

						var masterContent = masterFile.contents.toString()
						var lines = masterContent.split(/\n|\r|\r\n/)

						var newLines = lines.map(function(line, index, array) {
							line = interpolateVariables(line, master.context)
							var blockName = findPlaceholder(line)
							if (blockName) {
								var blockContent = getBlockContent(includedFile.contents.toString(), blockName)
								return blockContent || line
							} else {
								return line
							}
						})

						var newContent = newLines.join('\n')

						includedFile.contents = new Buffer(newContent)
						afterExtend()
					})
				})
			}
			else {
				afterExtend()
			}
		} else {
			callback(null, line)
		}
	}, function (err, results) {
		file.contents = new Buffer(results.join('\n'))
		if (done) {
			done(file)
		}
	})
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
    return string.split(/\n|\r|\r\n/)
}

