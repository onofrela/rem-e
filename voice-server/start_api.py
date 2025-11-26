"""
Script de inicio para el servidor API de Rem-E.
Uso: python start_api.py [puerto]
"""

import sys
import os

# Asegurarse de que el directorio actual esté en el path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from voice_api_server import start_server
from api_config import API_HOST, API_PORT


def main():
    """Punto de entrada principal."""
    # Obtener puerto de argumentos o config
    port = API_PORT
    host = API_HOST

    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"❌ Puerto inválido: {sys.argv[1]}")
            print(f"   Uso: python start_api.py [puerto]")
            print(f"   Ejemplo: python start_api.py 8765")
            return

    if len(sys.argv) > 2:
        host = sys.argv[2]

    # Verificar que exista al menos un modelo Vosk
    from config import VOSK_MODELS

    models_available = any(
        os.path.exists(info["path"])
        for info in VOSK_MODELS.values()
    )

    if not models_available:
        print("\n" + "="*60)
        print("⚠️  ADVERTENCIA: No se encontraron modelos Vosk")
        print("="*60)
        print("\nEl servidor arrancará pero el reconocimiento de voz")
        print("no funcionará hasta que descargues un modelo.")
        print("\nDescarga desde: https://alphacephei.com/vosk/models")
        print("Recomendado: vosk-model-small-es-0.42 (39MB)")
        print("\nExtrae el modelo en:")
        print("  voice-server/models/vosk-model-small-es-0.42/")
        print("\n" + "="*60 + "\n")

        response = input("¿Continuar de todos modos? (s/n): ").lower()
        if response != 's':
            print("Cancelado.")
            return

    # Iniciar servidor
    start_server(host=host, port=port)


if __name__ == "__main__":
    main()
