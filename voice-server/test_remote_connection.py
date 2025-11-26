#!/usr/bin/env python3
"""
Script para probar la conexion remota al Voice API Server.
Uso: python test_remote_connection.py <URL>
Ejemplo: python test_remote_connection.py https://abc123.ngrok-free.app
"""

import sys
import requests
import json
from typing import Dict, Any

def test_endpoint(base_url: str, endpoint: str, method: str = "GET", data: Dict[str, Any] = None) -> bool:
    """Prueba un endpoint de la API."""
    url = f"{base_url.rstrip('/')}{endpoint}"

    print(f"\n{'='*60}")
    print(f"Probando: {method} {url}")
    print('='*60)

    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        else:
            print(f"❌ Metodo HTTP no soportado: {method}")
            return False

        # Mostrar respuesta
        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 200:
            print("✅ Respuesta exitosa")

            # Intentar parsear JSON
            try:
                json_response = response.json()
                print(f"\nRespuesta JSON:")
                print(json.dumps(json_response, indent=2, ensure_ascii=False))
            except:
                print(f"\nRespuesta (texto):")
                print(response.text[:500])

            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Respuesta: {response.text[:500]}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Error de conexion: No se pudo conectar al servidor")
        print("   - Verifica que el servidor este corriendo")
        print("   - Verifica que la URL sea correcta")
        print("   - Si usas ngrok, verifica que el tunel este activo")
        return False
    except requests.exceptions.Timeout:
        print("❌ Error: Timeout - El servidor no respondio a tiempo")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")
        return False


def main():
    """Funcion principal."""

    # Obtener URL del servidor
    if len(sys.argv) < 2:
        print("Uso: python test_remote_connection.py <URL>")
        print("Ejemplo: python test_remote_connection.py https://abc123.ngrok-free.app")
        print("\nO si el servidor esta local:")
        print("python test_remote_connection.py http://localhost:8765")
        sys.exit(1)

    base_url = sys.argv[1]

    print("\n" + "="*60)
    print("  REM-E VOICE API - TEST DE CONEXION REMOTA")
    print("="*60)
    print(f"URL del servidor: {base_url}")

    # Lista de pruebas
    tests = [
        {
            "name": "Health Check",
            "endpoint": "/health",
            "method": "GET"
        },
        {
            "name": "Status del Servidor",
            "endpoint": "/status",
            "method": "GET"
        },
        {
            "name": "Informacion de la API",
            "endpoint": "/",
            "method": "GET"
        },
        {
            "name": "Comando de Voz Simple",
            "endpoint": "/api/command",
            "method": "POST",
            "data": {
                "text": "¿Qué puedo cocinar?",
                "skip_wake_word": True
            }
        }
    ]

    # Ejecutar pruebas
    results = []
    for test in tests:
        success = test_endpoint(
            base_url,
            test["endpoint"],
            test.get("method", "GET"),
            test.get("data")
        )
        results.append({"name": test["name"], "success": success})

    # Resumen
    print("\n" + "="*60)
    print("  RESUMEN DE PRUEBAS")
    print("="*60)

    for result in results:
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        print(f"{status} - {result['name']}")

    # Resultado final
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r["success"])

    print(f"\nResultado: {passed_tests}/{total_tests} pruebas exitosas")

    if passed_tests == total_tests:
        print("\n🎉 ¡Todos los tests pasaron! El servidor esta funcionando correctamente.")
        print("\nPuedes usar esta URL en tu aplicacion:")
        print(f"NEXT_PUBLIC_VOICE_API_URL={base_url}")
    else:
        print("\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.")
        print("\nPosibles causas:")
        print("  - El servidor no esta corriendo")
        print("  - LM Studio no esta activo")
        print("  - Problemas de red/firewall")
        print("  - URL incorrecta")

    print("\n" + "="*60)

    sys.exit(0 if passed_tests == total_tests else 1)


if __name__ == "__main__":
    main()
