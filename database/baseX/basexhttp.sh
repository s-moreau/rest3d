#!/bin/sh

#Core and library classes
CP=BaseX.jar
LIB=lib
CP=$CP:$LIB/igo-0.4.3.jar:$LIB/lucene-stemmers-3.4.0.jar:$LIB/xml-resolver-1.2.jar:$LIB/tagsoup-1.2.jar:$LIB/jline-1.0.jar
# Options for virtual machine
VM=-Xmx512m

# desactivate bdav and resXQ
OPT='-W -X'
#set default user for database
USR='-Uguest -Pguest'

CP=$CP:$LIB/commons-codec-1.4.jar:$LIB/commons-fileupload-1.2.2.jar:$LIB/commons-io-1.4.jar:$LIB/jdom-1.1.jar:$LIB/jetty-6.1.26.jar:$LIB/jetty-util-6.1.26.jar:$LIB/milton-api-1.7.2.jar:$LIB/mime-util-2.1.3.jar:$LIB/servlet-api-2.5-20081211.jar:$LIB/slf4j-api-1.5.8.jar:$LIB/slf4j-nop-1.5.8.jar:$LIB/xmldb-api-1.0.jar:$LIB/xqj-api-1.0.jar:$LIB/xqj2-0.1.0.jar:$LIB/jline-1.0.jar
CP=$CP:$LIB/basex-api.jar
CP=$CP:$LIB:igo-0.4.3.jar:$LIB/lucene-stemmers-3.4.0.jar:$LIB/tagsoup-1.2.jar:$LIB/xml-resolver-1.2.jar

# Run server
java -cp "$CP" $VM org.basex.BaseXHTTP $OPT $USR $@

