rem @echo off
setlocal


REM Core and library classes
set CP=BaseX.jar
set LIB=lib
rem set CP=%CP%;%LIB%/igo-0.4.3.jar;%LIB%/lucene-stemmers-3.4.0.jar;%LIB%/xml-resolver-1.2.jar;%LIB%/tagsoup-1.2.jar;%LIB%/jline-1.0.jar



REM PORT
set PORT=-p 43047
set HOST=-n rest3d-yopyop.azva.dotcloud.net

REM Run code
java -cp "%CP%" %VM% org.basex.BaseXClient  %PORT% %HOST% %*
