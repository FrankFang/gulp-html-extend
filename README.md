# gulp-html-extend [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][depstat-image]][depstat-url]

## Make it easy to extend, include and replace your html files

master.html

```html
<body>
    <!-- @@placeholder= content -->
    <!-- @@placeholder =footer -->
</body>
```

content.html

```html
<!-- @@master  = master.html-->

<!-- @@block  =  content-->
<main>
    my content
</main>
<!-- @@close-->

<!-- @@block  =  footer-->
<footer>
    my footer
</footer>
<!-- @@close-->

```

output

```html
<body>

<!-- start content -->
<main>
    my content
</main>
<!-- end content -->

<!-- start footer -->
<footer>
    my footer
</footer>
<!-- end footer -->

</body>
```

## Features

* Nested extending
* Nested including

## Install

```sh
$ npm install --save-dev gulp-html-extend
```


## Usage

```js
var gulp = require('gulp')
var extender = require('gulp-html-extend')
var rm = require('gulp-rimraf')

gulp.task('extend', function () {
    gulp.src('./*.html')
        .pipe(extender({annotations:true,verbose:false})) // default options
        .pipe(gulp.dest('./output'))

})
gulp.task('watch', function () {
    gulp.watch(['./*.html'], ['extend'])
})

gulp.task('clean', function (cb) {
    gulp.src('./output/*.html', {read: false})
        .pipe(rm())
    cb()
})

gulp.task('default', ['clean', 'extend'])
```

## Options

**annotations** [bool]

Make it `false` if you dont want too see `<!-- start foo.html -->` in output files.

**verbose** [bool]

Show extra info in the console.

**root** [string (dir path)]

To make absolute path which starts with `/` works.

## Changelog
* 1.1.0 Support absolute path `{root: "path/relative/to/__dirname"}`
* 1.0.0 No much changes
* 0.5.0
    * `@@var` support for `@@include`
    * `=` is optional
* 0.4.1 `@@var` bugs fixed
* 0.4.0 `@@var` support for `@@master`
* 0.3.2 Fix bugs of testing
* 0.3.1 Add the verbose option `{verbose: true}`
* 0.3.0 You can include another file in an included file (nested including).
* 0.2.0 Annotations can be disabled via an option `{annotations:false}`
* 0.1.3 Add including annotations.
* 0.1.2 Include path bug fixed.
* 0.1.0 Add `@@include = foo.html` support

## License

MIT &copy; [Frank Fang](http://frankfang.com)


[npm-url]: https://npmjs.org/package/gulp-html-extend
[npm-image]: https://badge.fury.io/js/gulp-html-extend.svg
[travis-url]: https://travis-ci.org/FrankFang/gulp-html-extend
[travis-image]: https://travis-ci.org/FrankFang/gulp-html-extend.svg?branch=master
[coveralls-url]: https://coveralls.io/r/FrankFang/gulp-html-extend
[coveralls-image]: https://coveralls.io/repos/FrankFang/gulp-html-extend/badge.png
[depstat-url]: https://david-dm.org/FrankFang/gulp-html-extend
[depstat-image]: https://david-dm.org/FrankFang/gulp-html-extend.svg
