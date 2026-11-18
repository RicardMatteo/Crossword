import uvicorn
import ssl
import os

# Ce script vous permet de lancer FastAPI avec HTTPS
# Ajoutez ce code dans un nouveau fichier run.py à côté de main.py

# Configuration du SSL context
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)

# Chemin vers vos certificats SSL (à adapter selon votre configuration)
ssl_cert = os.path.join(os.path.dirname(__file__), "ssl", "localhost.pem")
ssl_key = os.path.join(os.path.dirname(__file__), "ssl", "localhost-key.pem")

# Chargement des certificats
ssl_context.load_cert_chain(ssl_cert, ssl_key)

if __name__ == "__main__":
    # Lancez FastAPI avec HTTPS activé
    uvicorn.run(
        "main:app", 
        host="0.0.0.0",  # Pour écouter sur toutes les interfaces
        port=8000, 
        ssl_certfile=ssl_cert, 
        ssl_keyfile=ssl_key,
        reload=True       # Rechargement automatique lors des modifications (pratique pour le développement)
    )

    # equivalent à :
    # uvicorn.exe main:app --reload --host 0.0.0.0 --port 8000 --ssl-keyfile=.\ssl\localhost-key.pem --ssl-certfile=.\ssl\localhost.pem