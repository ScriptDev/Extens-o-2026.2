import asyncio
from app.config import get_settings
from app.domain.entities import Event
from app.domain.ports.event_repository import IEventRepository
from app.domain.exceptions import EntityNotFoundException, AIProcessingException


class GenerateEventInviteUseCase:
    """
    [Caso de Uso - Bônus IA] Gera um texto curto, dinâmico e engajador com emojis
    para os líderes e membros dispararem no WhatsApp convidando para o culto.
    """

    def __init__(self, repository: IEventRepository):
        self._repository = repository

    async def execute(self, event_id: str) -> str:
        event = await self._repository.get_by_id(event_id)
        if not event:
            raise EntityNotFoundException(entity_name="Culto/Evento", entity_id=event_id)

        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise AIProcessingException("GEMINI_API_KEY não configurada.")

        return await asyncio.to_thread(self._sync_generate_invite, event, settings)

    def _sync_generate_invite(self, event: Event, settings) -> str:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        date_formatted = event.date.strftime("%d/%m/%Y às %H:%M") if hasattr(event.date, "strftime") else str(event.date)

        prompt = f"""Você é o líder de comunicação de uma igreja cristã moderna e acolhedora.
Crie um texto curto, animado e atrativo para ser disparado no WhatsApp convidando as pessoas para o próximo culto/evento.

Detalhes do Culto:
- Título: {event.title}
- Tema da Mensagem: {event.theme or 'Encontro Especial com Deus'}
- Data e Hora: {date_formatted}
- Local: {event.location}

Diretrizes:
- Use emojis bíblicos e modernos de forma harmoniosa.
- Seja caloroso, vibrante e encorajador.
- Destaque o tema e chame para levar um amigo.
- Termine com uma frase de bênção.
- Não use introduções formais como 'Aqui está o convite:', devolva APENAS o texto pronto para colar no WhatsApp.
"""

        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            return (response.text or "").strip()
        except Exception as e:
            err_msg = str(e)
            if "CONSUMER_SUSPENDED" in err_msg or "Permission denied" in err_msg:
                raise AIProcessingException(
                    "Chave do Gemini rejeitada pelo Google Cloud (CONSUMER_SUSPENDED). "
                    "Para gerar convites com a IA, crie uma chave gratuita no Google AI Studio (aistudio.google.com) e atualize no backend/.env."
                )
            raise AIProcessingException(f"Falha ao gerar convite com a IA: {err_msg}")

