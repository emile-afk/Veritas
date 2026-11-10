import os
from flask import Flask, request, jsonify, send_from_directory
import requests

app = Flask(__name__, static_folder=".")

@app.get("/")
def home():
    return send_from_directory(".", "index.html")

@app.get("/<path:path>")
def static_files(path):
    if path.startswith("api/"):
        return jsonify({"error": "Route introuvable"}), 404
    return send_from_directory(".", path)

@app.post("/api/check")
def check_claim():
    body = request.get_json(silent=True) or {}
    claim = (body.get("claim") or "").strip()
    if len(claim) < 8 or len(claim) > 1000:
        return jsonify({"error": "L'affirmation doit contenir entre 8 et 1000 caractères."}), 400

    api_key = os.getenv("GOOGLE_FACTCHECK_API_KEY")
    if not api_key:
        return jsonify({"error": "La clé Google Fact Check API n'est pas configurée. Suis les instructions du fichier README."}), 503

    try:
        response = requests.get(
            "https://factchecktools.googleapis.com/v1alpha1/claims:search",
            params={"query": claim, "key": api_key, "languageCode": "fr", "pageSize": 10},
            timeout=20
        )
        response.raise_for_status()
        data = response.json()
        return jsonify({"claims": data.get("claims", [])})
    except requests.RequestException:
        return jsonify({"error": "Impossible de joindre le service de vérification pour le moment."}), 502

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
