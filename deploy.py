import os
import subprocess
import sys
import time
import re
import requests

def main():
    print("==================================================================")
    print("     DERMASYNTH MULTI-MODAL SYSTEM AUTOMATED DEPLOYMENT AGENT     ")
    print("==================================================================")
    
    # 1. Start FastAPI backend server on port 8000
    print("\n[1/5] Starting FastAPI Backend API Server on port 8000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
    )
    # Wait a moment for uvicorn to load models and bind
    print("Waiting for FastAPI backend to load models and start listening on port 8000...")
    backend_ready = False
    for i in range(45):
        try:
            # Disable verification for default check
            resp = requests.get("http://127.0.0.1:8000/", timeout=5)
            if resp.status_code == 200:
                backend_ready = True
                print("FastAPI backend is ready and listening!")
                break
        except Exception as e:
            # Silent during normal startup retries, print if verbose needed or just pass
            pass
        time.sleep(1)
        
    if not backend_ready:
        print("Error: FastAPI backend failed to start listening within 45 seconds.")
        backend_proc.terminate()
        sys.exit(1)
    
    # 2. Expose backend port 8000 via localhost.run SSH tunnel
    print("\n[2/5] Exposing backend API to the public internet...")
    backend_tunnel_cmd = [
        "ssh", "-R", "80:127.0.0.1:8000", 
        "-T", 
        "-o", "StrictHostKeyChecking=no", 
        "-o", "UserKnownHostsFile=/dev/null", 
        "nokey@localhost.run"
    ]
    
    backend_tunnel_proc = subprocess.Popen(
        backend_tunnel_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    backend_url = None
    print("Waiting for localhost.run to allocate backend HTTPS URL...")
    
    # Read output line by line to capture the public URL
    # Look for a line containing "lhr.life" or "lhr.rocks" or "localhost.run"
    start_time = time.time()
    while True:
        line = backend_tunnel_proc.stdout.readline()
        if not line:
            break
        print(f"Backend Tunnel: {line.strip()}")
        # Check if the line contains lhr.life URL pattern
        match = re.search(r'https://[a-zA-Z0-9.-]+\.lhr\.(?:life|rocks)', line)
        if match:
            backend_url = match.group(0)
            print(f"\n[URL] Captured Backend Public HTTPS URL: {backend_url}")
            break
        # Timeout safety (30 seconds)
        if time.time() - start_time > 30:
            print("Error: Timeout waiting for backend tunnel URL.")
            break
            
    if not backend_url:
        print("Failed to resolve public backend URL. Cannot proceed.")
        backend_proc.terminate()
        backend_tunnel_proc.terminate()
        sys.exit(1)
        
    # 3. Write public backend URL to frontend config.js
    print(f"\n[3/5] Syncing API endpoint in frontend configuration...")
    config_path = "frontend/src/config.js"
    with open(config_path, "w") as f:
        f.write(f"export const API_BASE = '{backend_url}';\n")
    print(f"Updated {config_path} successfully.")
    
    # 4. Compile React frontend for production
    print("\n[4/5] Compiling React static assets with Vite...")
    build_proc = subprocess.run(
        ["npm", "run", "build"],
        cwd="frontend",
        shell=True,
        stdin=subprocess.DEVNULL
    )
    
    if build_proc.returncode != 0:
        print("Error: React production compilation failed.")
        backend_proc.terminate()
        backend_tunnel_proc.terminate()
        sys.exit(1)
        
    print("Vite compilation succeeded. Assets written to frontend/dist/.")
    
    # 5. Serve compiled assets on port 5173
    print("\n[5/5] Launching production static asset server on port 5173...")
    frontend_server_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", "5173", "--bind", "127.0.0.1", "--directory", "frontend/dist"]
    )
    # Wait a moment for frontend server to start listening
    print("Waiting for frontend server to start listening on port 5173...")
    frontend_ready = False
    for i in range(15):
        try:
            resp = requests.get("http://127.0.0.1:5173/", timeout=5)
            if resp.status_code == 200:
                frontend_ready = True
                print("Frontend static server is ready and listening!")
                break
        except Exception as e:
            print(f"Frontend check retry {i}: {e}")
        time.sleep(1)
        
    if not frontend_ready:
        print("Error: Frontend static server failed to start listening.")
        backend_proc.terminate()
        backend_tunnel_proc.terminate()
        frontend_server_proc.terminate()
        sys.exit(1)
    
    # Expose frontend port 5173 via localhost.run SSH tunnel
    print("Exposing frontend static server to the public internet...")
    frontend_tunnel_cmd = [
        "ssh", "-R", "80:127.0.0.1:5173", 
        "-T", 
        "-o", "StrictHostKeyChecking=no", 
        "-o", "UserKnownHostsFile=/dev/null", 
        "nokey@localhost.run"
    ]
    
    frontend_tunnel_proc = subprocess.Popen(
        frontend_tunnel_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    frontend_url = None
    print("Waiting for localhost.run to allocate frontend HTTPS URL...")
    
    start_time = time.time()
    while True:
        line = frontend_tunnel_proc.stdout.readline()
        if not line:
            break
        print(f"Frontend Tunnel: {line.strip()}")
        match = re.search(r'https://[a-zA-Z0-9.-]+\.lhr\.(?:life|rocks)', line)
        if match:
            frontend_url = match.group(0)
            print(f"\n[URL] Captured Frontend Public HTTPS URL: {frontend_url}")
            break
        # Timeout safety (30 seconds)
        if time.time() - start_time > 30:
            print("Error: Timeout waiting for frontend tunnel URL.")
            break
            
    if not frontend_url:
        print("Failed to resolve public frontend URL.")
        backend_proc.terminate()
        backend_tunnel_proc.terminate()
        frontend_server_proc.terminate()
        sys.exit(1)
        
    # Write URLs to a file for reference
    with open("deployment_urls.txt", "w") as f:
        f.write(f"Frontend: {frontend_url}\n")
        f.write(f"Backend API: {backend_url}\n")
        
    print("\n==================================================================")
    print("     MULTI-MODAL SYSTEM FULLY DEPLOYED AND ONLINE ONLINE!    ")
    print("==================================================================")
    print(f"Public Web Application URL: {frontend_url}")
    print(f"Public Backend API Swagger: {backend_url}/docs")
    print("==================================================================")
    print("\nPress Ctrl+C to terminate the deployment.")
    
    # Keep the processes running
    try:
        while True:
            # Check if any process has stopped
            if backend_proc.poll() is not None:
                print("Backend process died!")
                break
            if backend_tunnel_proc.poll() is not None:
                print("Backend tunnel died!")
                break
            if frontend_server_proc.poll() is not None:
                print("Frontend server died!")
                break
            if frontend_tunnel_proc.poll() is not None:
                print("Frontend tunnel died!")
                break
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nTerminating all services...")
    finally:
        backend_proc.terminate()
        backend_tunnel_proc.terminate()
        frontend_server_proc.terminate()
        frontend_tunnel_proc.terminate()
        print("All services stopped.")

if __name__ == "__main__":
    main()
