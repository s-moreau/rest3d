xquery version "3.0";

declare namespace ls="ls";

declare option exist:serialize "method=html media-type=text/html omit-xml-declaration=yes indent=yes";

declare function ls:ls($collection as xs:string, $subPath as xs:string) as element()* {
  if (xmldb:collection-available($collection)) then
    (         
      for $child in xmldb:get-child-collections($collection)
      let $path := concat($collection, '/', $child) 
      let $sPath := concat($subPath, '/', $child)
      order by $child 
      return
        <li><a href="#">{util:unescape-uri($child, "UTF-8")}</a>
          <ul>
          {ls:ls($path,$sPath)}
          </ul>
        </li>,

        for $child in xmldb:get-child-resources($collection)
        let $sPath := concat($subPath, '/', $child)
        order by $child 
        return
            <li style="list-style-type:none"> <a href="javascript:loadPage('{$sPath}');">{util:unescape-uri($child, "UTF-8")}</a></li> 
    )
  else ()    
};  

let $collection := request:get-parameter('coll', '/db/test/')
return
  <ul><br/>{ls:ls($collection,"")}</ul> 