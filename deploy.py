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
    
    # 1. Compile React frontend for production
    print("\n[1/4] Compiling React static assets with Vite...")
    build_proc = subprocess.run(
        ["npm", "run", "build"],
        cwd="frontend",
        shell=True,
        stdin=subprocess.DEVNULL
    )
    
    if build_proc.returncode != 0:
        print("Error: React production compilation failed.")
        sys.exit(1)
        
    print("Vite compilation succeeded. Assets written to frontend/dist/.")
    
    # 2. Start FastAPI backend server on port 8000
    print("\n[2/4] Starting FastAPI Unified Application Server on port 8000...")
    backend_log = open("backend.log", "w", encoding="utf-8")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"],
        stdout=backend_log,
        stderr=subprocess.STDOUT
    )
    
    # 3. Wait for FastAPI backend to load models and start listening
    print("Waiting for FastAPI backend to load models and start listening on port 8000...")
    backend_ready = False
    for i in range(45):
        try:
            resp = requests.get("http://127.0.0.1:8000/api/health", timeout=5)
            if resp.status_code == 200:
                backend_ready = True
                print("FastAPI backend is ready and listening!")
                break
        except Exception:
            pass
        time.sleep(1)
        
    if not backend_ready:
        print("Error: FastAPI backend failed to start listening within 45 seconds.")
        backend_proc.terminate()
        sys.exit(1)
        
    # 4. Expose unified port 8000 via serveo.net SSH tunnel
    print("\n[4/4] Exposing unified application to the public internet...")
    tunnel_cmd = [
        "ssh", "-R", "80:127.0.0.1:8000", 
        "-T", 
        "-o", "StrictHostKeyChecking=no", 
        "-o", "UserKnownHostsFile=/dev/null", 
        "serveo.net"
    ]
    
    tunnel_proc = subprocess.Popen(
        tunnel_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    public_url = None
    print("Waiting for serveo.net to allocate public HTTPS URL...")
    
    start_time = time.time()
    while True:
        line = tunnel_proc.stdout.readline()
        if not line:
            break
        print(f"Tunnel: {line.strip()}")
        match = re.search(r'https://[a-zA-Z0-9.-]+serveo[a-zA-Z0-9.-]+', line)
        if match:
            public_url = match.group(0)
            print(f"\n[URL] Captured Public HTTPS URL: {public_url}")
            break
        if time.time() - start_time > 30:
            print("Error: Timeout waiting for tunnel URL.")
            break
            
    if not public_url:
        print("Failed to resolve public URL.")
        backend_proc.terminate()
        tunnel_proc.terminate()
        sys.exit(1)
        
    # Write URLs to a file for reference
    with open("deployment_urls.txt", "w") as f:
        f.write(f"Frontend/Backend: {public_url}\n")
        f.write(f"Backend API Swagger: {public_url}/docs\n")
        
    print("\n==================================================================")
    print("     MULTI-MODAL SYSTEM FULLY DEPLOYED AND ONLINE ONLINE!    ")
    print("==================================================================")
    print(f"Public Web Application URL: {public_url}")
    print(f"Public Backend API Swagger: {public_url}/docs")
    print("==================================================================")
    print("\nPress Ctrl+C to terminate the deployment.")
    
    # Keep the processes running
    try:
        while True:
            if backend_proc.poll() is not None:
                print("Backend process died!")
                break
            if tunnel_proc.poll() is not None:
                print("Tunnel process died!")
                break
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nTerminating all services...")
    finally:
        backend_proc.terminate()
        tunnel_proc.terminate()
        print("All services stopped.")

if __name__ == "__main__":
    main()
