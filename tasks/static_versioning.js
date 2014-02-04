/*
 * grunt-static-versioning
 * https://github.com/cmartin/Grunt-static-versioning
 *
 * Copyright (c) 2013 Carlos Martin
 * Licensed under the MIT license.
 */

'use strict';
var fs = require('fs'),
    util = require('util'),
    path = require('path'),
    replace = require('replace'),
    FtpDeploy = require('./lib/ftp-deploy'),
    sftp = require('sftp-upload'),
    ftpDeploy = new FtpDeploy();

module.exports = function(grunt) {
    
    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks
    
    grunt.registerMultiTask('static_versioning', 'Set version numbers to static content in a web application', function() {
        var options = this.data,
            done = this.async(),
            version = grunt.option('version-number') || promptUser(),
            rmfolder = options.removeAfterUpload || false;
        
        var config= {
            username: options.cdn.username,
            password: options.cdn.pass,
            host: options.cdn.host,
            port: options.cdn.port,
            transfer: options.cdn.type,
            localRoot: options.src + '-' + version,
            remoteRoot: options.cdn.target + path.basename('/' + options.src + '-' + version),
            parallelUploads: 15
        };
        
        //Replacing variable
        var compile = function(str){
            str = str.replace('$VPATH', options.replace.path);
            str = str.replace('$FOLDERNAME', path.basename(config.localRoot));
            return str;
        };
        
        //Renaming directory with the new version numnber
        fs.rename(options.src, options.src + '-' + version, function(err){
            if(err){
                error('Failed to change folder name', grunt, done);
            }else{
                grunt.log.writeln('Folder name changed to ' + options.src + '-' + version);
                if(options.cdn.upload){
                    grunt.event.emit('nameChanged');
                }else{
                    grunt.event.emit('uploadCompleted');
                }
            }
        });
        
        //Transfering data to cdn
        grunt.event.on('nameChanged', function(){
            transfer(config.transfer);
        });
        
        //Replacing content in local server
        grunt.event.on('uploadCompleted', function(){
            grunt.log.writeln('Folder uploaded');
            grunt.task.run('version_replace');
            done(true);
            
        });
        
        //Internal grunt task to replace strings in the local filesystem
        grunt.registerTask('version_replace', function(){
            if(options.replace){
                var replmnts = options.replace.replacements,
                    len = replmnts.length;
                for(var i = 0; i < len; i++){
                    replace({
                        regex: compile(replmnts[i].from),
                        replacement: compile(replmnts[i].to),
                        paths:options.replace.src,
                        recursive:options.replace.recursive || true,
                        exclude: options.replace.exclude || '',
                        silent:false
                    });
                }
            }
        });
        
        //Supporting two type of data transfer FTP & SFTP
        var transfer = function(type){
            switch(type){
                case 'ftp':
                    ftpDeploy.deploy(config, function(err){
                        console.log(err);
                        if(err){
                            grunt.log.writeln('Failed to upload new folder to the server');
                            done(false);
                        }else{
                            if(rmfolder){
                                deleteFolderRecursive(config.localRoot);
                            }
                            grunt.event.emit('uploadCompleted');
                        }
                    });
                    //Event handler for FTP transfer
                    ftpDeploy.on('uploading', function(relativeFilePath) {
                        console.log('uploading ' + relativeFilePath);
                    });
                    
                    ftpDeploy.on('uploaded', function(relativeFilePath) {
                        var percentTransferred = Math.round((ftpDeploy.transferred/ftpDeploy.total) * 100);
                        console.log(percentTransferred + '% uploaded   ' + path.basename(relativeFilePath));
                    });
                    break;
                case 'sftp':
                    sftp.config({
                        host: config.host,
                        username: config.username,
                        path: config.localRoot,
                        remoteDir: config.remoteRoot,
                        privateKey: fs.readFileSync(config.privateKey)
                    })
                    .on('error', function(err){
                        console.log(err);
                         grunt.log.writeln('Failed to upload new folder to the server');
                         done(false);
                    })
                    .on('uploading', function(progress){
                        console.log(progress.percent+' % uploaded');
                    })
                    .on('completed', function(){
                        if(rmfolder){
                            deleteFolderRecursive(config.localRoot);
                        }
                        grunt.event.emit('uploadCompleted');
                    })
                    .upload();
                    break;
            }
        };
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