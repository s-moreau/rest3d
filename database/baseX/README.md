++ run the database

   (windows) basexhttp.bat --> keep this window open
   (mac) ./basexhttp.sh

++ initialize the database (or update)

   {database must be running first}
   basexclient.bat -c create_database_assets.macro
   user/password: admin/admin
   
++ access content from rest API

   127.0.0.1:8080/rest3d/info -> test if database backend is working
   http://127.0.0.1:8080/rest3d/assets -> list assets content throug nodejs rest3d API
   http://127.0.0.1:8984/rest/assets/duck/duck.json -> retrieve content from database directly

++ editor application (source)
   http://127.0.0.1:8080/rest3d/editor or http://127.0.0.1:8080/

++ COLLADA2json viewer 
   http://127.0.0.1:8080/webgl/apps/viewer/index.html
   
   

   

   
 


