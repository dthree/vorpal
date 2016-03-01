const gulp = require('gulp');
const _gulp = require('load-plugins')('gulp-*');

const paths = {};
paths.src = './lib/**/*.js';
paths.dist = './dist';

gulp.task('lint', () => {
  return gulp.src(paths.src)
    .pipe(_gulp.xo());
});

gulp.task('build', () => {
  return gulp.src(paths.src)
    .pipe(_gulp.babel())
    .pipe(gulp.dest(paths.dist));
});

gulp.task('watch', ['build'], () => {
  gulp.watch(paths.src, ['build']);
});

gulp.task('default', ['watch']);
