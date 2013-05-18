#!/bin/sh
rm -rf /home/dotcloud/.basex
rm -rf /home/dotcloud/*/.basex

echo "THIS IS run.sh"
echo -ne 'Launching org.basex.BaseXHTTP -p';echo -ne $PORT_SERVERPORT;echo -ne '-h';echo $PORT_RESTPORT
CP=basex.jar
LIB=lib
DBPATH=/home/dotcloud
# desactivate webdav and resXQ
OPT='-W -X'
USR='-Dorg.basex.user=guest -Dorg.basex.password=guest'

#lets start a http (Rest) server as well as a TCP port
#TODO: add an database event port
CP=$CP:$LIB/commons-codec-1.4.jar:$LIB/commons-fileupload-1.2.2.jar:$LIB/commons-io-1.4.jar:$LIB/jdom-1.1.jar
CP=$CP:$LIB/jetty-6.1.26.jar:$LIB/jetty-util-6.1.26.jar
CP=$CP:LIB/milton-api-1.7.2.jar:$LIB/mime-util-2.1.3.jar:$LIB/servlet-api-2.5-20081211.jar:$LIB/slf4j-api-1.5.8.jar:$LIB/slf4j-nop-1.5.8.jar:$LIB/xmldb-api-1.0.jar:$LIB/xqj-api-1.0.jar:$LIB/xqj2-0.1.0.jar:$LIB/jline-1.0.jar
CP=$CP:$LIB/basex-api.jar
CP=$CP:$LIB/igo-0.4.3.jar:$LIB/lucene-stemmers-3.4.0.jar:$LIB/tagsoup-1.2.jar:$LIB/xml-resolver-1.2.jar

VM=-Xmx512m

java -cp "$CP" $USR $VM -Dorg.basex.path=$DBPATH -Dorg.basex.httppath=$DBPATH org.basex.BaseXHTTP $OPT -p$PORT_SERVERPORT -h$PORT_RESTPORT
