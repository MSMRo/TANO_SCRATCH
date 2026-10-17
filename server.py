#!/usr/bin/env python3
"""
=============================================================================
TanoScratch - Local Development Server
=============================================================================
Zero-dependency HTTP server to run TanoScratch locally.
Allows Web Serial API and Camera access (supported on localhost).

Usage:
  python server.py [port]
"""

import http.server
import socketserver
import sys
import webbrowser

# Ensure UTF-8 stdout on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable Cross-Origin Isolation if needed for high performance timers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

def run_server(port: int = 3000):
    print("=" * 60)
    print(f"  🚀 Servidor local de TanoScratch iniciado")
    print(f"  👉 URL Local: http://localhost:{port}")
    print("  📡 Soporte nativo para Web Serial y Teachable Machine")
    print("  Presiona Ctrl+C para detener el servidor")
    print("=" * 60)

    try:
        with socketserver.TCPServer(("", port), Handler) as httpd:
            try:
                webbrowser.open(f"http://localhost:{port}")
            except Exception:
                pass
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido correctamente.")

if __name__ == '__main__':
    port = 3000
    if len(sys.argv) > 1:
        if sys.argv[1] in ('-h', '--help'):
            print("Uso: python server.py [puerto]")
            sys.exit(0)
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Puerto inválido: '{sys.argv[1]}', usando puerto 3000 por defecto.")
            port = 3000
    run_server(port)
