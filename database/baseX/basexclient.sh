#!/bin/sh

CP=BaseX.jar
LIB=lib

PORT="-p 1984"
HOST="-n localhost"

java -cp "$CP" org.basex.BaseXClient  $PORT $HOST $@
