const gulp = require('gulp')
const _gulp = require('load-plugins')('gulp-*')
var ts = require('gulp-typescript')
var tsProject = ts.createProject('tsconfig.json');

const paths = {}
paths.src = './lib/**/*.js'
paths.dist = './dist'

gulp.task('lint', () => {
    return gulp.src(paths.src)
        .pipe(_gulp.xo())
})

gulp.task('build', ['build:ts', 'build:babel'])

gulp.task('build:ts', () => {
    return tsProject.src().pipe(tsProject()).js
        .pipe(gulp.dest(paths.dist))
})

gulp.task('build:babel', () => {
    return gulp.src(paths.dist)
        .pipe(_gulp.babel())
        .pipe(gulp.dest(paths.dist))
})

gulp.task('watch', ['build'], () => {
    gulp.watch(paths.src, ['build'])
})

gulp.task('default', ['watch'])
