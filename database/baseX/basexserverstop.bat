@echo off
setlocal

REM Path to this script


REM Core and library classes
set CP=BaseX.jar
set LIB=lib
set CP=%CP%;%LIB%/igo-0.4.3.jar;%LIB%/lucene-stemmers-3.4.0.jar;%LIB%/xml-resolver-1.2.jar;%LIB%/tagsoup-1.2.jar;%LIB%/jline-1.0.jar

REM Options for virtual machine
set VM=

REM Run code
java -cp "%CP%" %VM% org.basex.BaseXServer %* stop
