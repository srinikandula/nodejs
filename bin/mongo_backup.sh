#!/bin/bash
#
# This script will perform a mongo dump of the local database into the
# a "mongo_dumps" directory off of the current directory.  The dump will be placed in a subdirectory
# named after the current date and time.
#


database=$1
base_dir=mongo_dumps
default_db_name=${ISHIKI_DB_NAME}

set -e

if [[ -z ${database} ]]; then
    database=${default_db_name}
fi
if [[ -z ${database} ]]; then
    printf "No database name was specified.\n"
    printf "Please pass the db name as the 1st parameter to this script,\n"
    printf "or set the environment variable 'ISHIKI_DB_NAME'\n\n"
    exit 1
fi

mkdir -p ${base_dir}
pushd ${base_dir}

output_dir=`date +%Y%m%d-%H%M`
mongodump --host localhost --db ${database} --port 27017 --out ./$output_dir
printf "\nDatabase '${database}' was backed up to $PWD/${base_dir}/${output_dir}\n"

popd

exit 0

