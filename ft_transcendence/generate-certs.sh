#!/bin/bash

set -euo pipefail

CERTS_DIR="$(dirname "$0")/certs"

if [ ! -d "$CERTS_DIR" ]; then
    mkdir -p "$CERTS_DIR"
    echo "Dossier certs cree"
fi

if ! command -v openssl >/dev/null 2>&1; then
    echo "Erreur: OpenSSL n'est pas installe sur ce systeme."
    echo "Installation recommandee:"
    echo "  Ubuntu/Debian: sudo apt-get install openssl"
    echo "  macOS: brew install openssl"
    echo "  RHEL/CentOS: sudo yum install openssl"
    exit 1
fi

echo "OpenSSL trouve, generation des certificats..."

cat > "$CERTS_DIR/openssl.conf" <<'EOF'
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

chmod 600 "$KEY_PATH"
chmod 644 "$CERT_PATH"

echo
echo "Certificats SSL generes avec succes"
echo "Cle privee: $KEY_PATH"
echo "Certificat: $CERT_PATH"
echo
echo "Ces certificats sont auto-signes et destines au developpement uniquement."
echo "Vous devrez accepter l'avertissement de securite dans votre navigateur."
echo
echo "Pour Next.js: cd front && yarn dev"
echo "Pour le backend: cd back && yarn start:dev"

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Pour faire confiance au certificat (macOS):"
    echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERT_PATH"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Pour faire confiance au certificat (Linux):"
    echo "  sudo cp $CERT_PATH /usr/local/share/ca-certificates/localhost.crt"
    echo "  sudo update-ca-certificates"
fi
