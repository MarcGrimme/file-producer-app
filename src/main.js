var BIG_FILE = 30 * 1024 * 1024;
var FILES = 10;
var FOLDER_NAME = "folder";

function log(message) {
   // document.getElementById('log').textContent += message + '\n';
   console.log(message);
}

function show_archive_folder() {
   get_folderid(function(folder_id) {
      document.getElementById('archive-folder').textContent = folder_id;
   });
}

function get_folderid(callback) {
   chrome.storage.local.get(['folder'], function(result) {
      log('folder_id: ' +result.folder);
      callback(result.folder);
   });
}

function save_file_entry_to_folder(entry) {
   var folder_id;
   folder_id = get_folderid(function(folder_id) {
      chrome.fileSystem.restoreEntry(folder_id, function(folder) {
         entry.moveTo(folder);
         log("saving file " + entry.fullPath + ' => ' + folder.fullPath);
      });
   });
}

function create_files(fs) {
   for (let fileid = 0; fileid < FILES; fileid++) {
      let filename = 'test'+fileid+'.txt';
      log('Creating file ' + filename);
      fs.root.getFile(
         filename,
         {create: true, exclusive: true},
         function(fileEntry) {
            log('fileEntry: ' + fileEntry);
            fileEntry.createWriter(function(fileWriter) {
               log('fileWriter: ' + fileWriter);
               fileWriter.onwriteend = function(e) {
                  log('Write completed.');
               };

               fileWriter.onerror = function(e) {
                  log('Write failed: ' + e.toString());
               };

               var data = [];
               for (var i = 0; i < BIG_FILE/50; i++) {
                  data.push('01234567890123456789012345678901234567890123456789');
               }
               fileWriter.write(new Blob(data, {type: 'text/plain'}));
            }, function(e) {
               log('Error: ' + e);
            });
         },
         function(e) {
            log('Error creating file ' + filename + ' ' + e);
         }
      );
   }
}

function create_archive(fs) {
  let entries = [];
  let dirReader = fs.createReader();

  let getEntries = function() {
    dirReader.readEntries(function(results) {
      if (results.length) {
         for (let id = 0; id < results.length; id++) {
            log("getEntries: " + results[id].fullPath);
            save_file_entry_to_folder(results[id]);
         }
      }
    }, function(error) {
       log("Error reading dir " + error);
    });
  };

  getEntries();
}

window.onload = function() {
   show_archive_folder();

   document.getElementById('produce-files').onclick = function() {
      navigator.webkitPersistentStorage.requestQuota(
         BIG_FILE * FILES,
         function(grantedBytes) { log('Granted quota ' + grantedBytes) },
         function(e) { log('Granted quota error : ' + e); });
      window.webkitRequestFileSystem(
         PERSISTENT,
         BIG_FILE,
         function(fs) {
            log('Filesystem: ' + fs);
            create_files(fs);
         },
         function(e) { log('Filesystem error' + e);}
      );
   };

   document.getElementById('choose-folder').onclick = function() {
      log('choose folder..');
      chrome.fileSystem.chooseEntry({ type: "openDirectory" }, function(entry) {
         chrome.storage.local.set({ folder: chrome.fileSystem.retainEntry(entry) }, function() {
           log('Folder '+entry.name+' is saved.');
           show_archive_folder();
         });
      });
   };

   document.getElementById('create-archive',).onclick = function() {
      window.webkitRequestFileSystem(
         PERSISTENT,
         BIG_FILE,
         function(fs) {
            log('Filesystem: ' + fs);
            create_archive(fs.root);
         },
         function(e) { log('Filesystem error' + e);}
      );
   };

   // to allow a kiosk app to close
   if (document.querySelector('#reset')) {
     document.querySelector('#reset').onclick = function() {
        window.close();
      };
}
}


