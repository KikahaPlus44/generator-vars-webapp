/* jshint -W069, -W079 */

/**
 *  <%= appname %><% if (appauthor !== '' || appauthoremail !== '') { %>
 *  (c)<% if (appauthor !== '') { %> <%= appauthor %><% } %><% if (appauthoremail !== '') { %> <<%= appauthoremail %>><% } %><% } %>
 *
 *  This software is released under the MIT License:
 *  http://www.opensource.org/licenses/mit-license.php
 */

'use strict';
// generated on <%= (new Date).toISOString().split('T')[0] %> using <%= pkg.name %> <%= pkg.version %>

// Patterns.
var IMAGES_PATTERN = '{jpg,jpeg,gif,png,svg,ico}';
var SCRIPTS_PATTERN = 'js';
var STYLES_PATTERN = <% if (includeStylus) { %>'{css,styl}'<% } else if (includeSass) { %>'{css,scss}'<% } else { %>'css'<% } %>;
var TEMPLATES_PATTERN = '{html,shtml,htm,html.erb,asp,php}';
var EXTRAS_PATTERN = '{txt,htaccess}';
var FONTS_PATTERN = '{eot,svg,ttf,woff,woff2}';
var FILE_EXCLUDE_PATTERN = '{psd,ai}';

// Load modules.
var $ = require('gulp-load-plugins')();
var gulp = require('gulp');
var sequence = require('run-sequence');

/**
 * Compresses and deploys images to the build directory. Compression is skipped if --debug is specified.
 */
gulp.task('images', function()
{
    var debug = $.util.env['debug'] || $.util.env['d'];
    var skipImageMin = $.util.env['skip-imagemin'] || debug;

    return gulp.src(['<%= paths.src %>/**/*'+IMAGES_PATTERN])
        .pipe($.if(!skipImageMin, $.cache($.imagemin({
            progressive: true,
            interlaced: true,
            svgoPlugins: [{cleanupIDs: false}]
        }))))
        .pipe(gulp.dest('<%= paths.tmp %>'));
});

/**
 * Deploys all fonts from Bower components if applicable.
 */
gulp.task('fonts', function()
{
    return gulp.src(require('main-bower-files')({ filter: '**/*.'+FONTS_PATTERN }).concat('<%= paths.src %>/fonts/**/*'))
        .pipe(gulp.dest('<%= paths.tmp %>/fonts'));
});

/**
 * Processes all CSS files if preprocessed CSS languages are used (i.e. Stylus, Sass). Copies the processed
 * files to a temporary directory to be iterated on in subsequent tasks. Minification is done in the main 'build' task.
 */
gulp.task('styles', function()
{
    return gulp.src(['<%= paths.src %>/**/*'+STYLES_PATTERN])
        .pipe($.sourcemaps.init())<% if (includeStylus) { %>
        .pipe($.stylus({
            'include css': true
        }).on('error', $.util.log))<% } else if (includeSass) { %>
        .pipe($.sass({
            outputStyle: 'nested',
            precision: 10,
            includePaths: ['.'],
            onError: console.error.bind(console, 'Sass error:')
        }))<% } %>
        .pipe($.postcss([require('autoprefixer-core')({ browsers: ['last 2 version', 'ie 9'] })]))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest('<%= paths.tmp %>'));
});

/**
 * Processes and lints all JavaScript files. If Browserify is included this task will bundle up all associated files. Processed
 * JavaScript files are copied to a temporary directory to be iterated on in subsequent tasks. Uglification is done in the main
 * 'build' task.
 */
gulp.task('scripts', function()
{<% if (includeBrowserify) { %>
    var browserify = require('browserify');
    var reactify = require('reactify');
    var through = require('through2');
    <% } %>
    return gulp.src(['./<%= paths.src %>/**/*.'+SCRIPTS_PATTERN])
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'))<% if (includeBrowserify) { %>
        .pipe(through.obj(function(file, enc, next)
        {
            browserify({ entries: [file.path], debug: true, transform: [reactify] })
                .bundle(function(err, res)
                {
                    if (err) console.log(err.toString());
                    file.contents = res;
                    next(null, file);
                });
        }))<% } %>
        .pipe($.sourcemaps.init({ loadMaps: true }))
        .pipe($.sourcemaps.write('./'))
        .pipe(gulp.dest('<%= paths.tmp %>'));
});

/**
 * Deploys other miscellaneous files if applicable to the temporary directory.
 */
gulp.task('extras', function()
{
    return gulp.src(['<%= paths.src %>/**/*.'+EXTRAS_PATTERN], { dot: true })
        .pipe(gulp.dest('<%= paths.tmp %>'));
});

/**
 * Processes all static files (i.e. images, fonts, stylesheets, scripts, etc) and deploys images, fonts and extra
 * files to the build directory. Styles and scripts remain in the temporary directory until the 'build' command is
 * invoked.
 */
gulp.task('static', ['images', 'fonts', 'styles', 'scripts', 'extras'], function()
{
    return gulp.src(['<%= paths.tmp %>/**/*.'+IMAGES_PATTERN, '<%= paths.tmp %>/**/*.'+FONTS_PATTERN, '<%= paths.tmp %>/**/*.'+EXTRAS_PATTERN])
        .pipe(gulp.dest('<%= paths.build %>'));
});

/**
 * Processes all template files (i.e. HTML, etc) and deploys them to the temporary directory.
 */
gulp.task('templates', function()
{
    return gulp.src(['<%= paths.src %>/**/*.'+TEMPLATES_PATTERN])
        .pipe($.fileInclude({
            prefix: '@@',
            basepath: '<%= paths.src %>/'
        }))
        .pipe(gulp.dest('<%= paths.tmp %>'));
});

/**
 * Injects Bower components into template files.
 */
gulp.task('wiredep', function()
{
    var wiredep = require('wiredep').stream;

    gulp.src('<%= paths.src %>/**/*.'+TEMPLATES_PATTERN)
        .pipe(wiredep({
            exclude: [<% if (includeBootstrap) { %><% if (includeStylus) { %>'bootstrap.css',<% } %><% if (includeSass) {%>'bootstrap-sass-official'<% } else { %>'bootstrap.js'<% } %><% if (includeModernizr) { %>, <% } %><% } %><% if (includeModernizr) { %>'modernizr'<% } %>],
            directory: 'bower_components',
            ignorePath: /^(\.\.\/)*\.\./
        }))
        .pipe(gulp.dest('<%= paths.src %>'));
});

/**
 * Cleans the build and temporary directories.
 */
gulp.task('clean', require('del').bind(null, ['<%= paths.tmp %>', '<%= paths.build %>']));

/**
 * Builds HTML templates. By default revision hash will be appended to the filename of stylesheets and scripts
 * and all HTML files will also be minified unless --debug is specified.
 */
gulp.task('build', ['static', 'templates'], function()
{
    var debug = $.util.env['debug'] || $.util.env['d'];
    var skipCSSO = $.util.env['skip-csso'] || debug;
    var skipUglify = $.util.env['skip-uglify'] || debug;
    var skipRev = $.util.env['skip-rev'] || debug;
    var skipMinifyHTML = $.util.env['skip-minify-html'] || debug;

    var assets = $.useref.assets({searchPath: ['<%= paths.tmp %>', '.']});

    return gulp.src(['<%= paths.tmp %>/**/*.'+TEMPLATES_PATTERN])
        .pipe(assets)
        .pipe($.if(!skipCSSO, $.if('*.css', $.csso())))
        .pipe($.if(!skipUglify, $.if('*.js', $.uglify()))).on('error', $.util.log)
        .pipe($.if(!skipRev, $.rev()))
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe($.if(!skipRev, $.revReplace()))
        .pipe($.if(!skipMinifyHTML, $.if('*.html', $.minifyHtml({empty: true, conditionals: true, loose: true }))))
        .pipe(gulp.dest('<%= paths.build %>'))
        .pipe($.size({ title: 'build', gzip: true }));
});

/**
 * Serves project to localhost. If --debug is specified, files will be served from
 * the temporary directory (with loose files) instead of the build directory.
 */
gulp.task('serve', function()
{
    var debug = $.util.env['debug'] || $.util.env['d'];
    var port = $.util.env['port'] || $.util.env['p'];
    var baseDir = (debug) ? '<%= paths.tmp %>' : '<%= paths.build %>';
    var browserSync = require('browser-sync');

    browserSync(
    {
        notify: false,
        port: (typeof port === 'number') ? port : 9000,
        server:
        {
            baseDir: [baseDir],
            routes:
            {
                '/bower_components': 'bower_components'
            }
        }
    });

    // Watch for changes.
    if (debug)
    {
        gulp.watch([
            baseDir+'/**/*.'+IMAGES_PATTERN,
            baseDir+'/**/*.'+STYLES_PATTERN,
            baseDir+'/**/*.'+SCRIPTS_PATTERN,
            baseDir+'/**/*.'+FONTS_PATTERN,
            baseDir+'/**/*.'+TEMPLATES_PATTERN
        ]).on('change', browserSync.reload);

        gulp.watch('<%= paths.src %>/**/*.'+IMAGES_PATTERN, ['images']);
        gulp.watch('<%= paths.src %>/**/*.'+STYLES_PATTERN, ['styles']);
        gulp.watch('<%= paths.src %>/**/*.'+SCRIPTS_PATTERN, ['scripts']);
        gulp.watch('<%= paths.src %>/**/*.'+FONTS_PATTERN, ['fonts']);
        gulp.watch('<%= paths.src %>/**/*.'+TEMPLATES_PATTERN, ['templates']);
        gulp.watch('bower.json', ['wiredep', 'fonts']);
    }
    else
    {
        gulp.watch('<%= paths.src %>/**/*.'+IMAGES_PATTERN, ['build', browserSync.reload]);
        gulp.watch('<%= paths.src %>/**/*.'+STYLES_PATTERN, ['build', browserSync.reload]);
        gulp.watch('<%= paths.src %>/**/*.'+SCRIPTS_PATTERN, ['build', browserSync.reload]);
        gulp.watch('<%= paths.src %>/**/*.'+FONTS_PATTERN, ['build', browserSync.reload]);
        gulp.watch('<%= paths.src %>/**/*.'+TEMPLATES_PATTERN, ['build', browserSync.reload]);
        gulp.watch('bower.json', ['build', browserSync.reload]);
    }
});

/**
 * Default task.
 */
gulp.task('default', function(callback)
{
    var debug = $.util.env['debug'] || $.util.env['d'];
    var serve = $.util.env['serve'] || $.util.env['s'];

    var seq = (debug) ? ['build'] : ['clean', 'build'];
    if (serve) seq.push('serve');
    seq.push(callback);

    sequence.apply(null, seq);
});
