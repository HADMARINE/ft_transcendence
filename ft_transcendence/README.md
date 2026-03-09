export QUICKCERT_PASSWORD="password"

chmod +x generate-certs.sh
./generate-certs.sh

yarn dev:https

make build 
make start  
make shell   