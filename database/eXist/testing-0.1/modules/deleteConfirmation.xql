xquery version "3.0";

declare option exist:serialize "method=xhtml media-type=text/html indent=yes";



let $file := request:get-parameter("file", "")

let $data-collection := '/db/test/'
let $extension := '.xml'
let $filePath := concat($data-collection, $file)

return

<div xmlns="http://www.w3.org/1999/xhtml" data-template="templates:surround" data-template-with="templates/page.html" data-template-at="content">
    <head>
        <title>Delete Confirmation</title>
        <style>
        <![CDATA[
        .warn {background-color: silver; color: black; font-size: 16pt; line-height: 24pt; padding: 5pt; border: solid 2px black;}
        ]]>
        </style>
    </head>
    <body>
        <h1>Are you sure you want to delete this term?</h1>
        <strong>Name: </strong>{$file (:doc($filePath )/term/term-name/text():)}<br/>
        <strong>Path: </strong> {$filePath }<br/>
        <br/>
        <a class="warn" href="delete.xql?id={$file}">Yes</a>
        <br/>
        <br/>
        <a  class="warn" href="../index.html">Cancel</a>
    </body>
</div>