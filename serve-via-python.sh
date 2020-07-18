#!/bin/sh
cd www
google-chrome "http://localhost:20728"
python -m http.server 20728
