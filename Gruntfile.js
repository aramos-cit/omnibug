/*global module, require*/
module.exports = function( grunt ) {
    "use strict";
    grunt.file.mkdir( "build" );
    var gruntConfig = {
        pkg: grunt.file.readJSON( "package.json" )
    };
    grunt.initConfig( gruntConfig );


    /*
     * Shell commands
     * NOTE: this is non-portable and will likely only work on Linux/OS X!
     */
    grunt.loadNpmTasks( "grunt-shell" );
    gruntConfig.shell = {
        // Populate the updateHash value and sign the XPI
        signXPI: {
            command: [
                "set -e",
                "echo \"Signing file '$(ls build/<%= pkg.name %>-<%= pkg.version %>.xpi)'\"",
                "HASH=$( openssl sha1 build/<%= pkg.name %>-<%= pkg.version %>.xpi | awk '{ print $2 }' )",
                "cat firefox/update.rdf.tpl | sed \"s/TOK_HASH/${HASH}/g\" > firefox/update.rdf",
                "echo \"Wrote hash '${HASH}' to firefox/update.rdf\"",
                "echo",
                "echo \"Please sign and verify `pwd`/firefox/update.rdf with McCoy now\"",
                "/Applications/McCoy.app/Contents/MacOS/mccoy 2>/dev/null || exit 1",
                "cp firefox/update.rdf build/"
            ].join( " && " ),
            options: {
                stdout: true,
                stderr: true,
                failOnError: true
            }
        },

        // Tag the repo
        gitTag: {
            command: [
                "set -e",
                "git tag '<%= pkg.name %>-<%= pkg.version %>'",
                "git push --tags"
            ].join( " && " ),
            options: {
                stdout: true,
                stderr: true,
                failOnError: true
            }
        },

        // Commit after doing a deploy
        gitCommitDeploy: {
            command: [
                "set -e",
                "git commit chrome/manifest.json firefox/install.rdf.amo firefox/install.rdf.site firefox/omnibug_rel_notes.xhtml firefox/update.rdf.tpl package.json -m'Commit for deploy <%= pkg.version %>'",
                "git push"
            ].join( " && " ),
            options: {
                stdout: true,
                stderr: true,
                failOnError: true
            }
        },

        // Commit after bumping the version number
        gitCommitVersionIncrement: {
            command: [
                "set -e",
                "git commit package.json -m'Bump version number after release'",
                "git push"
            ].join( " && " ),
            options: {
                stdout: true,
                stderr: true,
                failOnError: true
            }
        },

        // Discard parsed files
        cleanParsedFiles: {
            command: [
                "set -e",
                "git checkout firefox/chrome/content/omnibug/common.js firefox/chrome/content/omnibug/io.js firefox/chrome/content/omnibug/md5.js firefox/chrome/content/omnibug/model.js firefox/chrome/content/omnibug/omnibugContext.js firefox/chrome/content/omnibug/panel.js"
            ].join( " && " ),
            options: {
                stdout: true,
                stderr: true,
                failOnError: true
            }
        },

        deploy: {
            command: [
                "set -e",
                "cp firefox/omnibug_rel_notes.xhtml build/",
                "git co gh-pages",
                "cp build/omnibug-0*.xpi build/omnibug_rel_notes.xhtml build/update.rdf dist/",
                "git add dist/*",
                "git commit dist/ -m'Deploying <%= pkg.version %>'",
                "git push",
                "git co master"
            ].join( " && " ),
            options: {
                stdout: true,
                stderr: true,
                failOnError: true
            }
        }
    };


    /*
     * JS Lint
     */
    grunt.loadNpmTasks( "grunt-contrib-jshint" );
    gruntConfig.jshint = {
        options: { bitwise: true, camelcase: false, curly: true, eqeqeq: true, forin: true, immed: true,
                   indent: 4, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, plusplus: false,
                   quotmark: true, regexp: true, undef: true, unused: true, strict: false, trailing: true,
                   white: false, laxcomma: true, nonstandard: true, browser: true, maxparams: 3, maxdepth: 4,
                   maxstatements: 50 },
        all: [
            "Gruntfile.js",
            "chrome/devtools.js"
            //"chrome/devtools_panel.js"
            //"common/providers.js"
            //"chrome/eventPage.js"
            //"chrome/options.js"
        ]
    };


    /*
     * Jasmine tests
     */
    grunt.loadNpmTasks( "grunt-contrib-jasmine" );
    gruntConfig.jasmine = {
        src: {
            src: [
                "common/*.js",
                "firefox/chrome/content/omnibug/common.js"
            ],
            options: {
                specs: [
                    "test/common/*.js",
                    "test/firefox/*.js"
                ],
                junit: {
                    path: "build/test-results",
                    consolidate: true
                },
                outfile: "test/SpecRunner.html",
                keepRunner: true
            }
        }
    };
    grunt.registerTask( "test", "jasmine:src" );


    /*
     * JS code coverage
     */
    gruntConfig.jasmine.istanbul= {
        src: gruntConfig.jasmine.src.src,
        options: {
            specs: gruntConfig.jasmine.src.options.specs,
            template: require( "grunt-template-jasmine-istanbul" ),
            templateOptions: {
                coverage: "build/coverage/coverage.json",
                report: [
                    { type: "html", options: { dir: "build/coverage" } },
                    { type: "cobertura", options: { dir: "build/coverage/cobertura" } },
                    { type: "text-summary" }
                ]
            }
        }
    };
    grunt.registerTask( "coverage", "jasmine:istanbul" );


    /*
     * Concat the contents of common/ into libomnibug.js
     */
    grunt.loadNpmTasks( "grunt-contrib-concat" );
    gruntConfig.concat = {
        options: {
            //stripBanners: true,
            banner: "/*! libomnibug.js <%= pkg.version %> - <%= grunt.template.today( 'yyyy-mm-dd' ) %> DERIVED FILE - DO NOT MODIFY */\n\n",
        },
        chrome: {
            src: [ "common/*.js" ],
            dest: "chrome/libomnibug.js",
            nonull: true
        },
        firefox: {
            src: [ "common/*.js", "firefox/chrome/content/omnibug/common.js" ],
            dest: "firefox/chrome/content/omnibug/libomnibug.js",
            nonull: true
        }
    };


    /*
     * Clean the project dir
     */
    grunt.loadNpmTasks( "grunt-contrib-clean" );
    gruntConfig.clean = {
        clean: [ "build",
                 "chrome/libomnibug.js",
                 "firefox/chrome/content/omnibug/libomnibug.js",
                 "firefox/install.rdf", "firefox/update.rdf" ]
    };


    /*
     * Set correct version numbers in various files
     */
    grunt.loadNpmTasks( "grunt-version" );
    gruntConfig.version = {
        chrome: {
            src: [ "chrome/manifest.json" ],
            options: {
                release: "patch"
            }
        },
        firefox: {
            options: {
                prefix: "em:updateLink=\"http:\/\/.*\/omnibug-|[^\\-]em:version['\"]?\\s*[:=]\\s*['\"]|<h1>Omnibug v",
                // NOTE: only supporting dot-separated digits (to keep from breaking em:updateLink)
                replace: "[0-9]+\\.[0-9]+\\.[0-9]+",
                release: "patch"
            },
            src: [ "firefox/install.rdf.site", "firefox/install.rdf.amo", "firefox/update.rdf.tpl", "firefox/omnibug_rel_notes.xhtml" ]
        },
        omnibug: {
            src: [ "package.json" ],
            options: {
                release: "patch"
            }
        }
    };
    grunt.registerTask( "updateVersion", [ "version:omnibug", "version:chrome", "version:firefox" ] );


    /*
     * Remove logging from public extensions
     */
    grunt.loadNpmTasks("grunt-line-remover");
    gruntConfig.lineremover = {
        cleanup: {
            files: [
                {
                    src: "firefox/chrome/content/omnibug/common.js",
                    dest: "firefox/chrome/content/omnibug/common.js"
                },
                {
                    src: "firefox/chrome/content/omnibug/io.js",
                    dest: "firefox/chrome/content/omnibug/io.js"
                },
                {
                    src: "firefox/chrome/content/omnibug/md5.js",
                    dest: "firefox/chrome/content/omnibug/md5.js"
                },
                {
                    src: "firefox/chrome/content/omnibug/model.js",
                    dest: "firefox/chrome/content/omnibug/model.js"
                },
                {
                    src: "firefox/chrome/content/omnibug/omnibugContext.js",
                    dest: "firefox/chrome/content/omnibug/omnibugContext.js"
                },
                {
                    src: "firefox/chrome/content/omnibug/panel.js",
                    dest: "firefox/chrome/content/omnibug/panel.js"
                }
            ],
            options: {
                exclusionPattern: /_dump/g
            }
        },
    };


    /*
     * Build Chrome extension
     */
    grunt.loadNpmTasks( "grunt-crx" );
    gruntConfig.crx = {
        omnibugPackage: {
            "src": "chrome/",
            "dest": "build/",
            "privateKey": "omnibug.pem",
            "exclude": [ "scripts" ]
        }
    };
    grunt.registerTask( "makeChrome", [ "concat:chrome", "crx" ] );


    /*
     * Build Firefox extension
     */
    grunt.loadNpmTasks( "grunt-contrib-compress" );
    gruntConfig.compress = {
        site: {
            options: {
                archive: "build/<%= pkg.name %>-<%= pkg.version %>.xpi",
                mode: "zip"
            },
            files: [
                { expand: true, cwd: "firefox/", src: [ "chrome/content/omnibug/*.js" ] },
                { expand: true, cwd: "firefox/", src: [ "chrome/content/omnibug/*.xul" ] },
                { expand: true, cwd: "firefox/", src: [ "chrome/content/omnibug/LICENSE" ] },
                { expand: true, cwd: "firefox/", src: [ "chrome/skin/**" ] },
                { expand: true, cwd: "firefox/", src: [ "defaults/**" ] },
                { expand: true, cwd: "firefox/", src: [ "chrome.manifest" ] },
                { expand: true, cwd: "firefox/", src: [ "install.rdf.site" ], rename: function( d, s ) {
                    return s.replace( /\.site|\.amo/, "" );
                } }
            ]
        },
        amo: {
            options: {
                archive: "build/<%= pkg.name %>-amo-<%= pkg.version %>.xpi",
                mode: "zip"
            },
            files: [
                { expand: true, cwd: "firefox/", src: [ "chrome/content/omnibug/*.js" ] },
                { expand: true, cwd: "firefox/", src: [ "chrome/content/omnibug/*.xul" ] },
                { expand: true, cwd: "firefox/", src: [ "chrome/content/omnibug/LICENSE" ] },
                { expand: true, cwd: "firefox/", src: [ "chrome/skin/**" ] },
                { expand: true, cwd: "firefox/", src: [ "defaults/**" ] },
                { expand: true, cwd: "firefox/", src: [ "chrome.manifest" ] },
                { expand: true, cwd: "firefox/", src: [ "install.rdf.amo" ], rename: function( d, s ) {
                    return s.replace( /\.site|\.amo/, "" );
                } }
            ]
        }
    };
    grunt.registerTask( "makeFirefox", [ "lineremover:cleanup", "concat:firefox", "compress:site", "compress:amo", "shell:cleanParsedFiles" ] );
    grunt.registerTask( "makeFirefoxDev", [ "concat:firefox", "compress:site", "compress:amo" ] );
    // ffdev also needs to: `cp install.rdf.site install.rdf`


    /*
     *  tasks
     */
    grunt.registerTask( "deployFirefox", [ "makeFirefox", "shell:signXPI", "shell:gitCommitDeploy", "shell:deploy" ] );

    /*
     * Pipeline tasks
     */
    grunt.registerTask( "release", [ "deployFirefox", "shell:gitTag", "updateVersion", "clean" ] );

    /*
     * CI tasks
     */
    grunt.registerTask( "travis", [ "jshint", "test", "coverage" ]);

};
