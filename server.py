from flask import Flask, request, jsonify
from flask_cors import CORS
from chat import AIChat
import os

app = Flask(__name__)
CORS(app)

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.json or {}
    user_message = data.get('message', '')
    api_config = data.get('api_keys', '')

    # Save UI API keys directly to local 'api' file for chat.py
    if api_config:
        with open("api", "w", encoding="utf-8") as f:
            f.write(api_config)

    try:
        ai = AIChat()
        response_text = ai.generate(user_message)
        return jsonify({"reply": response_text})
    except Exception as e:
        return jsonify({"reply": f"Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
  
