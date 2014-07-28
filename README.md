# [gulp](http://gulpjs.com)-html-extend

> Extend your HTML

master.html

```html
<body>
    <!-- @@placeholder=content -->
    <!-- @@placeholder=footer -->
</body>
```

content.html

```html
<!-- @@master=master.html-->

<!-- @@block=content-->
<main>
    my content
</main>
<!-- @@close-->

<!-- @@block=footer-->
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
        .pipe(extender())
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


## License

MIT &copy; [Frank Fang](http://frankfang.com)
