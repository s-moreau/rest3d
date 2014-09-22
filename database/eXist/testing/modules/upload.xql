xquery version "3.0";

(: some code from   https://github.com/hortsche/rest3d/blob/master/Final/upload.xql :)

declare option exist:serialize "method=html5 media-type=text/html";
(:declare option exist:serialize "method=javascript media-type=text/javascript";:)


let $collection := '/db/test/'
let $filename := request:get-uploaded-file-name('file')

let $redirect-uri := "../index.html"
let $hash-alg := 'sha1'

(: make sure you use the right user permissions that has write access to this collection :) 
let $login := xmldb:login($collection, 'admin', 'simon')
let $result :=
    if (not($login)) then
        ( (: Error - Could not log into database :) 
        <error>
            <message>Internal Error</message>
            <details>Failed to log into database</details>
            <br></br>
            <a href="../index.html">Return to main page</a>
        </error>)
    else
        ( (: Logged in, check that file exists :) 
        if (not($filename)) then
        ( (: No Filename means no file or all illegal characters :) 
            <error>
                <message>Bad Request</message>
                <details>Bad filename or no file uploaded</details>
            </error>)
        else
            (
            if (doc-available(concat($collection,$filename))) then
            (
                <error>
                    <message>File Exists</message>
                    <details>A file with the same hash was already found in the database</details>
                </error>)
            else
                ( 
                let $store := xmldb:store($collection, $filename, request:get-uploaded-file-data('file'))
                return
                if (not(concat($collection,$filename))) then
                (
                    <error>
                     <message>Could Not Store</message>
                     <details>Not sure what went wrong</details>
                    </error>
                )
                else
                (
                    <message>File { $filename } has been stored at collection={ $collection }<br/></message>
                )
                )
            )
        )
return
<message> { $result }<a href="../index.html">Return to main page</a> </message>


