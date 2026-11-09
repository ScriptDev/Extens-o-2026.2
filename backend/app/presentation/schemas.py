from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BiblicalPointDTO(BaseModel):
    titulo: str = Field(..., description="Título do ponto principal da mensagem")
    explicacao: str = Field(..., description="Explicação e desdobramento teológico do ponto")
    referencia_biblica: str = Field(..., description="Texto e citação bíblica exata mencionada na pregação")
    aplicacao_pratica: Optional[str] = Field("", description="Aplicação prática e pessoal do ponto para a vida diária")


class StructuredContentDTO(BaseModel):
    tema: str = Field(..., description="Tema central identificado na pregação")
    introducao: str = Field(..., description="Introdução ou contextualização da mensagem")
    pontos_principais: List[BiblicalPointDTO] = Field(..., description="Lista dos pontos principais estruturados")
    conclusao: str = Field(..., description="Conclusão e apelo final da pregação")
    frases_de_impacto: List[str] = Field(default_factory=list, description="Frases marcantes e citações para redes sociais")
    perguntas_discipulado: List[str] = Field(default_factory=list, description="Perguntas reflexivas para células e pequenos grupos")


class SermonOutlineResponseDTO(BaseModel):
    id: str = Field(..., description="UUID único do esboço gerado")
    event_id: Optional[str] = Field(None, description="UUID do evento vinculado (se houver)")
    title: str = Field(..., description="Título da mensagem")
    preacher: Optional[str] = Field(None, description="Nome do pregador (se informado)")
    audio_filename: str = Field(..., description="Nome do arquivo de mídia original")
    media_type: str = Field("audio", description="Tipo da mídia ('audio' ou 'video')")
    structured_content: StructuredContentDTO = Field(..., description="Esboço teológico estruturado pela IA")
    created_at: datetime = Field(..., description="Data e hora de criação")


class SermonListItemDTO(BaseModel):
    id: str
    event_id: Optional[str] = None
    title: str
    preacher: Optional[str] = None
    audio_filename: str
    media_type: str = "audio"
    tema: str
    created_at: datetime


# ==============================================================================
# DTOs de Ministérios e Brasões em Ideogramas Japoneses (Kanji)
# ==============================================================================

class MinistryResponseDTO(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    kanji_symbol: str = Field(..., description="Ideograma japonês do ministério (ex: 光, 絆, 勇, 聖)")
    kanji_meaning: str = Field(..., description="Significado teológico do ideograma (ex: Luz, Comunhão)")
    badge_svg: str = Field(..., description="Código SVG vetorial do brasão profissional")
    primary_color: str = Field("#8B5CF6", description="Cor primária do ministério")
    created_at: datetime


class MinistryCreateDTO(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    kanji_symbol: str = Field(..., min_length=1, max_length=5)
    kanji_meaning: str = Field(..., min_length=2, max_length=100)
    badge_svg: str = Field(..., min_length=10)
    primary_color: Optional[str] = "#8B5CF6"


class MinistryAISuggestionDTO(BaseModel):
    name: str
    description: str
    kanji_symbol: str
    kanji_meaning: str
    biblical_reference: str
    primary_color: str
    badge_svg: str


# ==============================================================================
# DTOs da Agenda de Cultos e Eventos
# ==============================================================================

class EventCreateDTO(BaseModel):
    title: str = Field(..., description="Título do evento (ex: 'Culto de Jovens - Sábado')", min_length=2)
    date: datetime = Field(..., description="Data e horário do culto (formato ISO 8601)")
    location: Optional[str] = Field("Templo Principal", description="Local de realização")
    theme: Optional[str] = Field(None, description="Tema previsto para o culto")
    description: Optional[str] = Field(None, description="Descrição concisa e liturgia/objetivo do culto")
    cover_image: Optional[str] = Field(None, description="URL da imagem de capa ou banner do evento")
    address_details: Optional[Dict[str, Any]] = Field(None, description="Endereço enriquecido com dados Maps")
    planning: Optional[Dict[str, Any]] = Field(None, description="Planejamento e ordem do culto gerado pela IA")
    ministry_id: Optional[str] = Field(None, description="UUID do ministério promotor do evento")
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags do evento (ex: ['#Teatro', '#CultoGeral'])")
    is_global: Optional[bool] = Field(False, description="Indica se é um culto geral para toda a igreja")


class EventResponseDTO(BaseModel):
    id: str = Field(..., description="UUID do evento")
    title: str
    date: datetime
    location: str
    theme: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    address_details: Optional[Dict[str, Any]] = None
    planning: Optional[Dict[str, Any]] = None
    status: str = Field("published", description="Status de publicação: 'published', 'pending_pastor_approval', 'changes_proposed_by_pastor', 'changes_accepted_by_leader', 'draft', 'cancelled'")
    ministry_id: Optional[str] = None
    ministry_name: Optional[str] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None
    approved_by: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    is_global: bool = False
    proposed_date: Optional[datetime] = None
    proposed_location: Optional[str] = None
    pastor_notes: Optional[str] = None
    proposed_by: Optional[str] = None
    has_sermon: bool = Field(False, description="Indica se a IA já documentou este evento com um sermão")
    is_past: bool = Field(False, description="Indica se o evento já ocorreu no tempo")
    sermon: Optional[SermonOutlineResponseDTO] = None
    created_at: datetime


class ProposeEventChangesDTO(BaseModel):
    proposed_date: Optional[datetime] = Field(None, description="Nova data e horário sugeridos pelo Pastor")
    proposed_location: Optional[str] = Field(None, description="Novo local sugerido pelo Pastor")
    pastor_notes: str = Field(..., description="Justificativa e orientações do colegiado pastoral para o líder", min_length=3)


class ChurchSettingsDTO(BaseModel):
    church_name: str
    group_singular: str
    group_plural: str
    available_tags: List[str]
    tag_suggestions: List[Dict[str, Any]] = Field(default_factory=list)
    updated_at: Optional[datetime] = None


class UpdateTerminologyDTO(BaseModel):
    church_name: Optional[str] = None
    group_singular: Optional[str] = None
    group_plural: Optional[str] = None
    available_tags: Optional[List[str]] = None


class SuggestTagDTO(BaseModel):
    tag: str = Field(..., description="Nome da tag (ex: #Dança, #Intercessão)", min_length=2)
    justification: Optional[str] = Field(None, description="Motivo pelo qual a liderança sugere esta tag")


class StrategicInsightItemDTO(BaseModel):
    target_id: Optional[str] = None
    target_name: str
    category: str  # 'ministry_inactivity', 'member_absence', 'leader_workload', 'encouragement'
    severity: str  # 'high_concern', 'warning', 'info', 'positive'
    days_inactive: Optional[int] = None
    inactivity_rate: Optional[float] = None
    title: str
    observation: str
    temporal_analysis: str
    probable_causes: List[str] = Field(default_factory=list)
    action_plan: str


class StrategicInsightsResponseDTO(BaseModel):
    role: str
    user_name: str
    summary: str
    insights: List[StrategicInsightItemDTO] = Field(default_factory=list)
    generated_at: datetime


class InconsistencyItemDTO(BaseModel):
    field: str = Field(..., description="Campo com inconsistência (title, date, location, theme, description)")
    issue: str = Field(..., description="Explicação da inconsistência detectada")
    suggestion: str = Field(..., description="Sugestão corretiva recomendada pela IA")
    severity: str = Field("warning", description="Nível de gravidade: warning ou error")


class LocationMemoryDTO(BaseModel):
    has_previous_location: bool = False
    previous_location_name: Optional[str] = None
    previous_formatted_address: Optional[str] = None
    previous_maps_url: Optional[str] = None
    confirmation_prompt: Optional[str] = None
    is_confirmed_from_history: bool = False


class CEPAddressResponseDTO(BaseModel):
    cep: str
    logradouro: str
    bairro: str
    localidade: str
    uf: str
    formatted_address: str
    maps_url: str


class EventAIAssistRequestDTO(BaseModel):
    input_text: Optional[str] = Field(None, description="Texto livre, roteiro ou transcrição do culto")
    current_title: Optional[str] = Field(None, description="Título atual digitado pelo usuário")
    current_date: Optional[str] = Field(None, description="Data atual informada")
    current_location: Optional[str] = Field(None, description="Local informado")
    current_theme: Optional[str] = Field(None, description="Tema informado")
    current_description: Optional[str] = Field(None, description="Descrição informada")


class EventAIAssistResponseDTO(BaseModel):
    suggested_title: str
    suggested_theme: str
    suggested_description: str
    suggested_date: Optional[str] = None
    location_data: Dict[str, Any] = Field(default_factory=dict)
    location_memory: Optional[LocationMemoryDTO] = None
    suggested_banner_url: str
    banner_alternatives: List[str] = Field(default_factory=list)
    planning: Dict[str, Any] = Field(default_factory=dict)
    inconsistencies: List[InconsistencyItemDTO] = Field(default_factory=list)
    questions: List[str] = Field(default_factory=list)


class EventInviteResponseDTO(BaseModel):
    event_id: str
    event_title: str
    invite_text: str = Field(..., description="Texto criativo gerado pela IA para disparo no WhatsApp")


class ErrorResponseDTO(BaseModel):
    error: str = Field(..., description="Tipo do erro")
    message: str = Field(..., description="Descrição compreensível do erro")
    status_code: int = Field(..., description="Código de status HTTP")
