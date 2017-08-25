#!/usr/bin/env python
import os
import sys
COMMAND = 'wsk action invoke /_/openwhisk-cloudant/write --param overwrite true --param doc \'{\"url\":\"%s\"}\' --param dbname referrers -r' 
print(COMMAND)
with open(sys.argv[1]) as f:
    urls = f.read().splitlines()
    
print(urls)
for url in urls:    
    if url:
      os.system(COMMAND % url)
