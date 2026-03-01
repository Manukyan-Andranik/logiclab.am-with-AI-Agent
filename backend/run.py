import asyncio

from app.main import app

def create_wsgi_app(asgi_app):
    def application(environ, start_response):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            content_length = int(environ.get("CONTENT_LENGTH", 0) or 0)
            body = environ["wsgi.input"].read(content_length) if content_length > 0 else b""
            
            scope = {
                "type": "http", 
                "asgi": {"version": "3.0"}, 
                "http_version": "1.1",
                "method": environ["REQUEST_METHOD"], 
                "scheme": environ.get("wsgi.url_scheme", "http"),
                "path": environ.get("PATH_INFO", "/"), 
                "query_string": environ.get("QUERY_STRING", "").encode(),
                "headers": _build_headers(environ),
                "server": (environ.get("SERVER_NAME", "localhost"), int(environ.get("SERVER_PORT", 80))),
            }
            
            response = {"status": 200, "headers": [], "body": []}
            
            async def receive(): 
                return {"type": "http.request", "body": body, "more_body": False}
            
            async def send(message):
                if message["type"] == "http.response.start":
                    response["status"] = message["status"]
                    response["headers"] = message.get("headers", [])
                elif message["type"] == "http.response.body":
                    response["body"].append(message.get("body", b""))
            
            loop.run_until_complete(asgi_app(scope, receive, send))
            
            # Convert headers and ensure CORS headers are present
            headers = []
            cors_headers_added = False
            
            for k, v in response["headers"]:
                key = k.decode() if isinstance(k, bytes) else k
                value = v.decode() if isinstance(v, bytes) else v
                headers.append((key, value))
                if key.lower() == 'access-control-allow-origin':
                    cors_headers_added = True
            
            # If CORS headers weren't added by middleware, add them manually
            # This ensures CORS works even if middleware fails
            if not cors_headers_added:
                origin = environ.get('HTTP_ORIGIN', '')
                if origin:
                    headers.append(('Access-Control-Allow-Origin', origin))
                    headers.append(('Access-Control-Allow-Credentials', 'true'))
                    headers.append(('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'))
                    headers.append(('Access-Control-Allow-Headers', '*'))
            
            start_response(f"{response['status']} {_get_status_phrase(response['status'])}", headers)
            return [b"".join(response["body"])]
            
        except Exception as e:
            # IMPORTANT: Add CORS headers even for error responses
            error_headers = [
                ("Content-Type", "text/plain"),
                ("Access-Control-Allow-Origin", environ.get('HTTP_ORIGIN', '*')),
                ("Access-Control-Allow-Credentials", "true"),
            ]
            start_response("500 Internal Server Error", error_headers)
            return [f"Internal Server Error: {str(e)}".encode()]
        finally: 
            loop.close()
    return application
    
def _build_headers(environ):
    headers = []
    for key, value in environ.items():
        if key.startswith("HTTP_"): headers.append((key[5:].replace("_", "-").lower().encode(), value.encode()))
        elif key in ("CONTENT_TYPE", "CONTENT_LENGTH"): headers.append((key.replace("_", "-").lower().encode(), value.encode()))
    return headers

def _get_status_phrase(code):
    return {200: "OK", 201: "Created", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 500: "Internal Server Error"}.get(code, "Unknown")


application = create_wsgi_app(app)