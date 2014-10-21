function OnStartTests() {
    if ((typeof File != "undefined") && !File.prototype.slice) {
        if (File.prototype.webkitSlice) {
            File.prototype.slice = File.prototype.webkitSlice;
        }
        if (File.prototype.mozSlice) {
            File.prototype.slice = File.prototype.mozSlice;
        }
    }
    if (!(window.File && window.FileReader && window.FileList && window.Blob && File.prototype.slice)){
        var warningMessage = "This function only works on the recent version of Firefox, Chrome and Opera. ";
        document.getElementById("warning").innerHTML = warningMessage;
    }
    if (typeof(Worker) == "undefined"){
        var warningMessage_2 = "web workers aren't supported";
        document.getElementById("warning").innerHTML = warningMessage_2;
    }
}

OnStartTests();
var w;

function SelectAll(str) {
    document.getElementById(str).focus();
    document.getElementById(str).select();
}

function HashFile(){    
    if(w){
        w = undefined;
    }
    
    var files = document.getElementById('filesToHash').files;
    var file = files[0];
    
    if(typeof(w) == "undefined"){
        w = new Worker("./resources/js/rusha.js");
        
        // send the data to rusha.js's worker
        w.postMessage({'id' : 'file', 'data' : file}); // Send data to our worker.
        
        // on reception of the result of the rusha.js's worker we put get the hash 
        w.onmessage = function(event) {
            document.getElementById('byte_sha1').textContent = event.data.hash;
            document.getElementById('byte_range').textContent = [' number of bytes : ', file.size].join('');
        }
        w.addEventListener("message", function(e){console.log('Worker said: ', e.data);}, false);
    }
}

function readBlob() {                            
    var files = document.getElementById('filesToHash').files;
    if (!files.length) {
        alert('Please select a file!');
        return;
    }
    var file = files[0];
    var start = 0;
    var stop = file.size - 1;
                                
    var reader = new FileReader();
                                
    // If we use onloadend, we need to check the readyState.
    reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) { // DONE == 2
            // document.getElementById('byte_content').textContent = evt.target.result;
            var str1 = "blob 0\0";
            var str2 = evt.target.result;
            document.getElementById('byte_range').textContent = ['Read bytes: ', start + 1, ' - ', stop + 1,' of ', file.size, ' byte file'].join('');
            document.getElementById('byte_sha1').textContent = sha1(str1.concat(str2));
        }
    };
    var blob = file.slice(start, stop + 1);
    reader.readAsText(file);
}
