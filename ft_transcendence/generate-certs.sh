#!/bin/bash


set -e

CERTS_DIR="$(dirname "$0")/certs"



if [ ! -d "$CERTS_DIR" ]; then
    mkdir -p "$CERTS_DIR"
    echo -e "Dossier certs créé${NC}"
fi

if ! command -v openssl &> /dev/null; then
    echo -e "Erreur: OpenSSL n'est pas installé sur ce système.${NC}"
    echo -e "Installation recommandée:${NC}"
    echo -e "  Ubuntu/Debian: sudo apt-get install openssl${NC}"
    echo -e "  macOS: brew install openssl${NC}"
    echo -e "  RHEL/CentOS: sudo yum install openssl${NC}"
    exit 1
fi

echo -e "OpenSSL trouvé, génération des certificats...${NC}"

cat > "$CERTS_DIR/openssl.conf" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_ca

[dn]
C=FR
ST=France
L=Paris
O=Transcendance Dev
OU=Development
CN=localhost

[v3_ca]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

KEY_PATH="$CERTS_DIR/localhost.key"
CERT_PATH="$CERTS_DIR/localhost.crt"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY_PATH" \
    -out "$CERT_PATH" \
    -config "$CERTS_DIR/openssl.conf"

echo -e "\n$Certificats SSL générés avec succès!${NC}"
echo -e "Clé privée: $KEY_PATH${NC}"
echo -e "Certificat: $CERT_PATH${NC}"
echo -e "\n Ces certificats sont auto-signés et destinés au développement uniquement.${NC}"
echo -e "Vous devrez accepter l'avertissement de sécurité dans votre navigateur.${NC}"

echo -e "\n=== Configuration HTTPS ===${NC}"
echo -e "Les fichiers .env ont été mis à jour pour utiliser HTTPS.${NC}"
echo -e "Utilisez les certificats générés dans le dossier 'certs' pour votre serveur.${NC}"

echo -e "Pour Next.js, démarrez avec:${NC}"
echo -e "  cd front${NC}"
echo -e "  npm run dev:https${NC}"

echo -e "Pour le backend, démarrez normalement:${NC}"
echo -e "  cd back${NC}"
echo -e "  }npm run start:dev${NC}"

echo -e "Pour ajouter le certificat aux autorités de confiance:${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERT_PATH${NC}"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "  sudo cp $CERT_PATH /usr/local/share/ca-certificates/localhost.crt${NC}"
    echo -e "  sudo update-ca-certificates${NC}"
fi

chmod 600 "$KEY_PATH"
chmod 644 "$CERT_PATH"

echo -e " Configuration terminée!${NC}"
