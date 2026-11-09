import os
import sys
from pathlib import Path

# Adiciona o diretório do backend ao sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))


def check_environment():
    print("=" * 70)
    print("🔍 Diagnóstico do Ambiente - Agente de IA para Pregações")
    print("=" * 70)

    # 1. Verifica arquivo .env
    env_file = backend_dir / ".env"
    if not env_file.exists():
        print("⚠️  Aviso: Arquivo 'backend/.env' não foi encontrado.")
        print("   -> Criando arquivo .env a partir de .env.example para inicialização rápida...")
        example_env = backend_dir / ".env.example"
        if example_env.exists():
            env_file.write_text(example_env.read_text(encoding="utf-8"), encoding="utf-8")
            print("   -> Arquivo 'backend/.env' criado com sucesso. Configure suas chaves!")
    else:
        print("✅ Arquivo 'backend/.env' detectado.")

    # Carrega variáveis
    from app.config import get_settings
    settings = get_settings()

    # 2. Verifica Chave Gemini
    if not settings.GEMINI_API_KEY or "SUA_CHAVE" in settings.GEMINI_API_KEY:
        print("❌ GEMINI_API_KEY: Não configurada ou contém valor de exemplo.")
        print("   -> Obtenha sua chave gratuita em: https://aistudio.google.com/app/apikey")
    else:
        masked_key = settings.GEMINI_API_KEY[:6] + "..." + settings.GEMINI_API_KEY[-4:]
        print(f"✅ GEMINI_API_KEY: Configurada ({masked_key})")
        print(f"   -> Modelo selecionado: {settings.GEMINI_MODEL}")

    # 3. Verifica DATABASE_URL
    if not settings.DATABASE_URL or "sua-senha" in settings.DATABASE_URL:
        print("⚠️  DATABASE_URL: Contém credenciais padrão de exemplo.")
        print("   -> Configure a connection string do seu projeto no Supabase em 'backend/.env'.")
    else:
        print("✅ DATABASE_URL: Configurada.")

    # 4. Verifica Áudio de Teste
    sample_wav = backend_dir / "tests" / "sample_sermon.wav"
    if sample_wav.exists():
        print(f"✅ Áudio de Teste Disponível: tests/sample_sermon.wav ({sample_wav.stat().st_size} bytes)")
    else:
        print("ℹ️  Áudio de teste não gerado. Execute: python scripts/generate_sample_audio.py")

    # 5. Verifica Frontend
    frontend_dir = backend_dir.parent / "frontend"
    env_local = frontend_dir / ".env.local"
    if not env_local.exists():
        example_local = frontend_dir / ".env.local.example"
        if example_local.exists():
            env_local.write_text(example_local.read_text(encoding="utf-8"), encoding="utf-8")
            print("✅ Arquivo 'frontend/.env.local' inicializado.")
    else:
        print("✅ Arquivo 'frontend/.env.local' detectado.")

    print("=" * 70)
    print("Pronto! Para iniciar o servidor:")
    print("  Backend:  uvicorn app.main:app --reload --port 8000")
    print("  Frontend: cd frontend; npm run dev")
    print("=" * 70)


if __name__ == "__main__":
    check_environment()

