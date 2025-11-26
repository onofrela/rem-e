"""
Script de prueba para la API de Rem-E Voice Server.
Permite probar los endpoints desde la línea de comandos.
"""

import requests
import json
import sys


# Configuración
API_URL = "http://localhost:8765"


def test_health():
    """Prueba el endpoint de health check."""
    print("\n🔍 Probando /health...")
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_status():
    """Prueba el endpoint de status."""
    print("\n🔍 Probando /status...")
    try:
        response = requests.get(f"{API_URL}/status", timeout=5)
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Servidor corriendo: {data.get('running')}")
        print(f"   Modelo: {data.get('model')}")
        print(f"   Clientes conectados: {data.get('connected_clients')}")
        print(f"   LM Studio: {'✓' if data.get('lm_studio_connected') else '✗'}")
        return response.status_code == 200
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_command(text: str):
    """Prueba el endpoint de comando."""
    print(f"\n🔍 Probando comando: '{text}'...")
    try:
        response = requests.post(
            f"{API_URL}/api/command",
            json={"text": text, "skip_wake_word": True},
            timeout=30
        )
        print(f"   Status: {response.status_code}")
        data = response.json()

        print(f"   Intent: {data.get('intent')}")
        print(f"   Success: {data.get('success')}")

        if data.get('response_text'):
            print(f"   Respuesta: {data.get('response_text')}")

        if data.get('error'):
            print(f"   ❌ Error: {data.get('error')}")

        return response.status_code == 200
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_context():
    """Prueba el endpoint de actualización de contexto."""
    print("\n🔍 Probando actualización de contexto...")
    context = {
        "inRecipeGuide": True,
        "recipeName": "Pasta Carbonara",
        "currentStep": 2,
        "currentStepInstruction": "Cocina la pasta al dente"
    }

    try:
        response = requests.post(
            f"{API_URL}/api/context",
            json={"context": context},
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def interactive_mode():
    """Modo interactivo para hacer preguntas."""
    print("\n" + "="*60)
    print("   MODO INTERACTIVO - Rem-E Voice API")
    print("="*60)
    print("\nEscribe tus preguntas o comandos (escribe 'salir' para terminar)\n")

    while True:
        try:
            question = input("Tú: ").strip()

            if not question:
                continue

            if question.lower() in ['salir', 'exit', 'quit']:
                print("\n¡Hasta luego!\n")
                break

            response = requests.post(
                f"{API_URL}/api/command",
                json={"text": question, "skip_wake_word": True},
                timeout=30
            )

            data = response.json()

            if data.get('success'):
                print(f"\nRem-E: {data.get('response_text')}\n")

                # Mostrar información adicional según el intent
                if data.get('intent') == 'navigation':
                    print(f"   [Navegación a: {data.get('data', {}).get('route')}]\n")
                elif data.get('intent') == 'cooking_command':
                    print(f"   [Comando: {data.get('data', {}).get('command')}]\n")
            else:
                print(f"\n❌ Error: {data.get('error')}\n")

        except KeyboardInterrupt:
            print("\n\n¡Hasta luego!\n")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}\n")


def run_all_tests():
    """Ejecuta todas las pruebas."""
    print("\n" + "="*60)
    print("   PROBANDO REM-E VOICE API")
    print("="*60)

    results = []

    # Test 1: Health
    results.append(("Health Check", test_health()))

    # Test 2: Status
    results.append(("Status", test_status()))

    # Test 3: Comandos de prueba
    results.append(("Comando: Navegación", test_command("ve a recetas")))
    results.append(("Comando: Pregunta", test_command("¿qué tengo en el inventario?")))
    results.append(("Comando: Cocina", test_command("siguiente paso")))

    # Test 4: Contexto
    results.append(("Actualizar Contexto", test_context()))

    # Resumen
    print("\n" + "="*60)
    print("   RESUMEN DE PRUEBAS")
    print("="*60)

    for test_name, result in results:
        status = "✓" if result else "✗"
        print(f"   {status} {test_name}")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    print(f"\n   Total: {passed}/{total} pruebas pasadas")
    print("="*60 + "\n")


def main():
    """Punto de entrada principal."""
    if len(sys.argv) > 1:
        if sys.argv[1] == "interactive":
            interactive_mode()
        elif sys.argv[1] == "test":
            run_all_tests()
        elif sys.argv[1] == "ask":
            if len(sys.argv) > 2:
                question = " ".join(sys.argv[2:])
                test_command(question)
            else:
                print("Uso: python test_api.py ask <pregunta>")
        else:
            print("Uso: python test_api.py [interactive|test|ask <pregunta>]")
    else:
        # Por defecto, modo interactivo
        interactive_mode()


if __name__ == "__main__":
    main()
