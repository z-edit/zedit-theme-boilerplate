let fs = require('fs'),
    split = require('split'),
    gulp = require('gulp'),
    sass = require('gulp-sass'),
    clean = require('gulp-clean'),
    rename = require('gulp-rename'),
    zip = require('gulp-zip'),
    watch = require('gulp-watch'),
    insert = require('gulp-insert');

let getThemeInfo = () => JSON.parse(fs.readFileSync('theme.json'));

let beepOnError = function(done) {
    return err => {
        if (err) process.stdout.write('\u0007');
        done(err);
    }
};

let deployPathValid = function(path) {
    if (!path) return false;
    return fs.existsSync(`${path}\\zEdit.exe`);
};

let setDeployPath = function(resolve, reject) {
    process.stdout.write('Enter the path to the zEdit installation you would like to deploy to:');
    process.stdin.pipe(split()).on('data', line => {
        deployPathValid(line) ?
            resolve(process.env['ZEDIT_DEPLOY_PATH'] = line) :
            reject(`"${line}" is not a valid zEdit Deploy Path.`);
    });
};

let initializeDeployPath = function() {
    return new Promise((resolve, reject) => {
        deployPathValid(process.env.ZEDIT_DEPLOY_PATH) ?
            resolve() : setDeployPath(resolve, reject);
    });
};

const watchPatterns = ['index.css', 'src/**/*.scss'];

gulp.task('clean', function() {
    return gulp.src('dist', {read: false})
        .pipe(clean());
});

gulp.task('build', ['clean'], function() {
    let themeInfo = getThemeInfo(),
        themeId = themeInfo.id;

    delete themeInfo.id;
    let themeText = JSON.stringify(themeInfo, null, 2);

    return gulp.src('index.scss')
        .on('error', console.error)
        .pipe(sass())
        .pipe(insert.prepend(`/*${themeText}*/\n\n`))
        .pipe(rename(path => path.basename = themeId))
        .pipe(gulp.dest(`dist`));
});

gulp.task('release', ['build'], function() {
    let themeInfo = getThemeInfo(),
        themeId = themeInfo.id,
        themeVersion = themeInfo.version,
        zipFileName = `${themeId}-v${themeVersion}.zip`;

    console.log(`Packaging ${zipFileName}`);

    return gulp.src(`dist/${themeId}.css`)
        .pipe(zip(zipFileName))
        .pipe(gulp.dest('.'));
});

gulp.task('watch', function() {
    watch(watchPatterns, batch(function(events, done) {
        gulp.start('build', beepOnError(done));
    }));
});

gulp.task('deploy', ['build'], function() {
    initializeDeployPath().then(() => {
        let themeInfo = getThemeInfo(),
            themeId = themeInfo.id,
            deployPath = process.env.ZEDIT_DEPLOY_PATH;

        gulp.src(`dist/${themeId}.css`)
            .pipe(gulp.dest(`${deployPath}\\themes\\.`));
    }, console.error);
});

gulp.task('integrate', function() {
    initializeDeployPath().then(() => {
        watch(watchPatterns, batch(function(events, done) {
            gulp.start('deploy', beepOnError(done));
        }));
    }, console.error);
});

gulp.task('default', ['build']);