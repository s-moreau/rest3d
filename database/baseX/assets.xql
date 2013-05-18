
declare option output:method 'json';


let $a := doc('C:/Users/rarnaud.AMD/Desktop/git/rest3d/nodejs-server/database/assets.xml')


return db:replace('assets','assets.xml',document{$a})
(:
return $a
:)

