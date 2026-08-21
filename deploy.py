import os
import subprocess
import sys
import time
import re
import requests

def update_vercel(public_url):
    print(f"\n[Vercel Sync] Updating Vercel deployment with new backend URL...")
    try:
        # Disable TLS rejection warning output for neatness
        env = os.environ.copy()
        env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"
        
        # 1. Remove old env variable (ignore error if it doesn't exist)
        subprocess.run(
            ["node", "node_modules/vercel/dist/index.js", "env", "rm", "VITE_API_BASE", "production", "--yes"],
            cwd="frontend",
            env=env,
            stdin=subprocess.DEVNULL
        )
        
        # 2. Add new env variable (passed via stdin)
        subprocess.run(
            ["node", "node_modules/vercel/dist/index.js", "env", "add", "VITE_API_BASE", "production"],
            input=public_url,
            text=True,
            cwd="frontend",
            env=env
        )
        
        # 3. Redeploy frontend (rebuilds assets with new URL)
        print("[Vercel Sync] Re-deploying frontend to Vercel production...")
        subprocess.run(
            ["node", "node_modules/vercel/dist/index.js", "--yes", "--prod"],
            cwd="frontend",
            env=env,
            stdin=subprocess.DEVNULL
        )
        print("[Vercel Sync] Vercel frontend is fully updated and online!")
    except Exception as e:
        print(f"Warning: Failed to update Vercel deployment: {e}")

def start_tunnel():
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
    start_time = time.time()
    while True:
        line = tunnel_proc.stdout.readline()
        if not line:
            break
        print(f"Tunnel: {line.strip()}")
        match = re.search(r'https://[a-zA-Z0-9.-]+serveo[a-zA-Z0-9.-]+', line)
        if match:
            public_url = match.group(0)
            break
        if time.time() - start_time > 35:
            print("Error: Timeout waiting for tunnel URL.")
            break
            
    return tunnel_proc, public_url

def main():
    print("==================================================================")
    print("     DERMASYNTH MULTI-MODAL SYSTEM AUTOMATED DEPLOYMENT AGENT     ")
    print("==================================================================")
    
    # 1. Compile local React static assets (backup/unified fallback)
    print("\n[1/4] Compiling React static assets locally...")
    build_proc = subprocess.run(
        ["npm", "run", "build"],
        cwd="frontend",
        shell=True,
        stdin=subprocess.DEVNULL
    )
    
    if build_proc.returncode != 0:
        print("Warning: Local React static asset compilation failed. Proceeding anyway.")
        
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
    for i in range(90):
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
        print("Error: FastAPI backend failed to start listening within 90 seconds.")
        backend_proc.terminate()
        sys.exit(1)
        
    # 4. Expose unified port 8000 via serveo.net SSH tunnel with auto-reconnect
    print("\n[4/4] Exposing unified application to the public internet...")
    
    tunnel_proc = None
    try:
        while True:
            # If backend died, exit completely
            if backend_proc.poll() is not None:
                print("Backend process died!")
                break
                
            # If tunnel is not running, start it
            if tunnel_proc is None or tunnel_proc.poll() is not None:
                if tunnel_proc is not None:
                    print("\n[Warning] Tunnel connection dropped. Reconnecting...")
                    
                tunnel_proc, public_url = start_tunnel()
                
                if public_url:
                    print(f"\n[URL] Captured Public HTTPS URL: {public_url}")
                    
                    # Write URLs to local file
                    with open("deployment_urls.txt", "w") as f:
                        f.write(f"Frontend/Backend: {public_url}\n")
                        f.write(f"Backend API Swagger: {public_url}/docs\n")
                        
                    # Sync backend URL to Vercel and redeploy frontend
                    update_vercel(public_url)
                    
                    print("\n==================================================================")
                    print("     MULTI-MODAL SYSTEM FULLY DEPLOYED AND ONLINE ONLINE!    ")
                    print("==================================================================")
                    print(f"Public Backend Tunnel URL  : {public_url}")
                    print(f"Vercel Frontend URL        : https://frontend-nine-ecru-ivt7r5yxm8.vercel.app")
                    print("==================================================================")
                    print("\nKeep this console running to maintain the live backend tunnel.")
                    print("Press Ctrl+C to terminate.")
                else:
                    print("[Error] Failed to capture public tunnel URL. Retrying in 10s...")
                    time.sleep(10)
                    continue
                    
            time.sleep(3)
            
    except KeyboardInterrupt:
        print("\nTerminating all services...")
    finally:
        if backend_proc:
            backend_proc.terminate()
        if tunnel_proc:
            tunnel_proc.terminate()
        print("All services stopped.")

if __name__ == "__main__":
    main()
