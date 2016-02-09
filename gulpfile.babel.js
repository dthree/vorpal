const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const eslint = require('gulp-eslint');

const paths = {};
paths.src = './lib/**/*.js';
paths.dist = './dist';

gulp.task('lint', () => {
  return gulp.src(paths.src)
    .pipe(_gulp.xo());
});

gulp.task('babel', function () {
  const bab = babel({presets: ['es2015']});
  gulp.src('lib/**/*.js')
    .pipe(changed('dist'))
    .pipe(bab)
    .pipe(gulp.dest('dist'));
  return;
});

gulp.task('watch', ['babel'], () => {
  gulp.watch(paths.src, ['babel']);
});

gulp.task('default', ['babel', 'watch']);
