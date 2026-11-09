import os
import pathlib
from google import genai
from google.genai import types

def run_test():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY não configurada no ambiente.")
        return
    client = genai.Client(api_key=api_key)
    wav_path = pathlib.Path(__file__).resolve().parent.parent / "tests" / "sample_sermon.wav"
    wav_bytes = wav_path.read_bytes()
    part = types.Part.from_bytes(data=wav_bytes, mime_type="audio/wav")

    prompt = (
        'Você é um assistente teológico. Analise este áudio e retorne APENAS um JSON válido com:\n'
        '{"tema": "string", "introducao": "string", "pontos_principais": [{"titulo": "string", "explicacao": "string", "referencia_biblica": "string", "aplicacao_pratica": "string"}], "conclusao": "string"}'
    )

    print("Enviando áudio para Gemini 3.5 Flash...")
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=[part, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2
        )
    )
    print("STATUS: SUCESSO!")
    print("JSON RETORNADO:")
    print(response.text[:300])

if __name__ == "__main__":
    run_test()

