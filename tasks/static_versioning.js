/*
 * grunt-static-versioning
 * https://github.com/cmartin/Grunt-static-versioning
 *
 * Copyright (c) 2013 Carlos Martin
 * Licensed under the MIT license.
 */

'use strict';
var fs = require('fs'),
    FtpClient = require('ftp'),
    path = require('path'),
    replace = require('replace'),
    FtpDeploy = require('ftp-deploy'),
    ftpDeploy = new FtpDeploy();

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('static_versioning', 'Set version numbers to static content in a web application', function() {
      var options = this.data,
          done = this.async(),
          version = grunt.option('version-number') || promptUser(),
          rmfolder = options.removeAfterUpload || false,
          config= {
              username: options.cdn.username,
              password: options.cdn.pass,
              host: options.cdn.host,
              port: options.cdn.port,
              localRoot: options.src + '-' + version,
              remoteRoot: options.cdn.target + path.basename('/' + options.src + '-' + version),
              parallelUploads: 15
          },
          client = new FtpClient(),
          compile = function(str){
              str = str.replace('$VPATH', options.replace.path);
              str = str.replace('$FOLDERNAME', path.basename(config.localRoot));
              return str;
          };
      
      
      //Check if target folder exist
      client.on('ready', function(){
          client.list(config.remoteRoot, function(err, nlist){
              if(err){
                  error('Unknown ftp error', grunt, done);
              }else{
			  console.log('List',nlist);
                  if(nlist.length > 0){
                      grunt.event.emit('targetExists');
                      client.end();
                  }else{
                      grunt.event.emit('createFolder');
                  }
              }
          });
      });
      
      //Creating missing folder
      grunt.event.on('createFolder', function(){
	  console.log('FolderName', config.remoteRoot);
          client.mkdir(rootFolder, function(err){
              if(err){ 
                  error('Cannot create folder', grunt, done);
              }else{ 
                  grunt.event.emit('targetExists');
                  client.end();
              }
          });
      });
      
      client.on('error', function(){
          error('FTP Failed', grunt, done);
      });
      
      client.connect({host:config.host, user: config.username, password: config.password, port:config.port});
      
      grunt.event.on('targetExists', function(){      
          fs.rename(options.src, options.src + '-' + version, function(err){
              if(err){
                  error('Failed to change folder name', grunt, done);
              }else{
                  grunt.log.writeln('Folder name changed to ' + options.src + '-' + version);
                  grunt.event.emit('nameChanged');
              }
          });
      });
      
      grunt.event.on('nameChanged', function(){
          ftpDeploy.deploy(config, function(err){
		  console.log(err);
            if(err){
                grunt.log.writeln('Failed to upload new folder to the server');
                done(false);
            }else{
                if(rmfolder)
                    deleteFolderRecursive(config.localRoot);
                
                grunt.event.emit('uploadCompleted');
            }
          });
      });
      
      grunt.event.on('uploadCompleted', function(){
          grunt.log.writeln('Folder uploaded');
          grunt.task.run('version_replace');
          done(true);
          
      });
	  
	  grunt.registerTask('version_replace', function(){
          var replmnts = options.replace.replacements,
              len = replmnts.length;
          for(var i = 0; i < len; i++){
              replace({
                  regex: compile(replmnts[i].from),
                  replacement: compile(replmnts[i].to),
                  paths:options.replace.src,
                  recursive:true,
                  silent:false
              });
          }
      });
      
    ftpDeploy.on('uploading', function(relativeFilePath) {
        console.log('uploading ' + relativeFilePath);
    });
    
    ftpDeploy.on('uploaded', function(relativeFilePath) {
        var percentTransferred = Math.round((ftpDeploy.transferred/ftpDeploy.total) * 100);
        console.log(percentTransferred + '% uploaded   ' + path.basename(relativeFilePath));
    });
      
  });

};

//Utils

function promptUser(){
    return Math.round(Math.random() * 10000);
}

function error(str, grunt, done){
    grunt.log.writeln(str);
    done(false);
}


function deleteFolderRecursive (path){
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.statSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}