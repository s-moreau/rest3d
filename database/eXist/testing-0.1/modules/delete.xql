xquery version "3.0";

declare option exist:serialize "method=html5 media-type=text/html";
import module namespace file = "http://exist-db.org/xquery/file";
 
let $file-dir := '/db/test/'
 
(: get the id parameter from the URL :)
let $file := request:get-parameter('id', '')

(: log into the database to be able to delete :)
let $login := xmldb:login($file-dir, 'admin', 'simon')

(: construct the file path from the id :)
let $file-path := concat($file-dir,$file)

 
(:let $file-name := $file/@name/string():)
(:let $file-binary := file:read-binary($filepath || $file-name):)

        
(: delete the file :)
let $result :=
if (util:binary-doc-available($file-path)) 
then(
        let $deletion := xmldb:remove($file-dir, $file)
        return
        if (util:binary-doc-available($file-path))
        then(
            <error>
            Deletion failed
            <details>file deletion failure</details>
            </error>
            )
        else(
            <message>
            File deleted
            <details>file deleted with sucess</details>
            </message>
            ) 
    )
else(
if (doc-available($file-path)) 
then(
        let $deletion := file:delete('random')
        return
        if (doc-available($file-path))
        then(
            <error>
            Deletion failed
            <details>file deletion failure</details>
            </error>
            )
        else(
            <message>
            File deleted
            <details>file deleted with sucess</details>
            </message>
            ) 
    )
else(
    <error>
        <message>File doesn't exists</message>
        <details>No file with that name found</details>
    </error>
)
    )
return
<div xmlns="http://www.w3.org/1999/xhtml" data-template="templates:surround" data-template-with="templates/page.html" data-template-at="content">
<message>{$result }<a href="../index.html">Return to main page</a> </message>



</div>

