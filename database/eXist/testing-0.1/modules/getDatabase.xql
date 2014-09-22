xquery version "3.0";
declare option exist:serialize "method=html5 media-type=text/html";


<html>
    <head>
        <script type="text/javascript" src="CollapsibleLists.js"></script>
    </head>
    <body>
        <u1 class="collapsibleList">
        {
        for $doc in collection("/db/apps/testing/")
        return
            <li>
            {fn:document-uri($doc)}                
            </li>
        }
        </u1>
        <script>collapsibleList.apply();</script>
    </body>
</html>

