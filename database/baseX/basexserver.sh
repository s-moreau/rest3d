#!/bin/sh
echo 'WARNING - SHOULD BE USING basexHTTPserver instead'
CP=BaseX.jar
LIB=lib
CP=$CP:$LIB/igo-0.4.3.jar:$LIB/lucene-stemmers-3.4.0.jar:$LIB/xml-resolver-1.2.jar:$LIB/tagsoup-1.2.jar:$LIB/jline-1.0.jar

VM=-Xmx512m

java -cp "$CP" $VM org.basex.BaseXServer $@
