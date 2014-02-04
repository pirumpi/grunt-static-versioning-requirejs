/*
 * grunt-static-versioning
 * https://github.com/cmartin/Grunt-static-versioning
 *
 * Copyright (c) 2013 Carlos Martin
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Configuration to be run (and then tested).
    static_versioning: {
      jsversioning: {
       src:'static/js-build',
       removeAfterUpload:false,
       cdn:{
           target:'/',
           type:'ftp',
           host: 'localhost',
           username:'username',
           pass: 'Password1',
           port: 21
       },
       replace:{
           path:'http://dev-rev-src.dev.activenetwork.com:90',
           src: [
                'Views/',
                'Content/js/site.js'
            ],
           replacements:[{
               from: '/js',
               to: '/$FOLDERNAME'
           }]
       }
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js'],
    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['static_versioning']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['test']);

};
