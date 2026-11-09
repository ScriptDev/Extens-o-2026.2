import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any


@dataclass(frozen=True)
class BiblicalPoint:
    """
    [Regra de Negócio] Entidade de Domínio representando um ponto teológico,
    versículo bíblico e aplicação prática.
    """
    titulo: str
    explicacao: str
    referencia_biblica: str
    aplicacao_pratica: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "titulo": self.titulo,
            "explicacao": self.explicacao,
            "referencia_biblica": self.referencia_biblica,
            "aplicacao_pratica": self.aplicacao_pratica or "",
        }


@dataclass(frozen=True)
class StructuredContent:
    """
    [Regra de Negócio] Entidade de Domínio representando a análise e insights teológicos completos.
    """
    tema: str
    introducao: str
    pontos_principais: List[BiblicalPoint]
    conclusao: str
    frases_de_impacto: List[str] = field(default_factory=list)
    perguntas_discipulado: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tema": self.tema,
            "introducao": self.introducao,
            "pontos_principais": [p.to_dict() for p in self.pontos_principais],
            "conclusao": self.conclusao,
            "frases_de_impacto": self.frases_de_impacto,
            "perguntas_discipulado": self.perguntas_discipulado,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StructuredContent":
        pontos = [
            BiblicalPoint(
                titulo=p.get("titulo", ""),
                explicacao=p.get("explicacao", ""),
                referencia_biblica=p.get("referencia_biblica", ""),
                aplicacao_pratica=p.get("aplicacao_pratica", "")
            )
            for p in data.get("pontos_principais", [])
        ]
        return cls(
            tema=data.get("tema", "Sem Tema"),
            introducao=data.get("introducao", ""),
            pontos_principais=pontos,
            conclusao=data.get("conclusao", ""),
            frases_de_impacto=data.get("frases_de_impacto", []),
            perguntas_discipulado=data.get("perguntas_discipulado", [])
        )


@dataclass
class SermonOutline:
    """
    [Regra de Negócio] Agregado Raiz (Root Aggregate) que representa o esboço persistido.
    Totalmente desacoplado de bibliotecas de terceiros e frameworks.
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_id: Optional[str] = None
    title: str = ""
    preacher: Optional[str] = None
    audio_filename: str = ""
    media_type: str = "audio"  # 'audio' ou 'video'
    structured_content: StructuredContent = field(default_factory=lambda: StructuredContent(
        tema="", introducao="", pontos_principais=[], conclusao="", frases_de_impacto=[], perguntas_discipulado=[]
    ))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "title": self.title,
            "preacher": self.preacher,
            "audio_filename": self.audio_filename,
            "media_type": self.media_type,
            "structured_content": self.structured_content.to_dict(),
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
        }


@dataclass
class Ministry:
    """
    [Regra de Negócio] Entidade de Domínio representando um Ministério Oficial da Igreja.
    Identificado por brasão com ideograma japonês (Kanji), significado teológico e paleta de cores.
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: Optional[str] = None
    kanji_symbol: str = "光"
    kanji_meaning: str = "Luz"
    badge_svg: str = ""
    primary_color: str = "#8B5CF6"
    created_by: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "kanji_symbol": self.kanji_symbol,
            "kanji_meaning": self.kanji_meaning,
            "badge_svg": self.badge_svg,
            "primary_color": self.primary_color,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
        }


@dataclass
class Event:
    """
    [Regra de Negócio] Entidade de Domínio representando um Culto ou Evento na Agenda da Igreja.
    Possui relacionamento 1:1 opcional com o Esboço gerado pela IA.
    Suporta aprovação pastoral prévia para publicação e fluxo de homologação bilateral.
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    date: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    location: str = "Templo Principal"
    theme: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    address_details: Optional[Dict[str, Any]] = None
    planning: Optional[Dict[str, Any]] = None
    status: str = "published"  # 'published', 'pending_pastor_approval', 'changes_proposed_by_pastor', 'changes_accepted_by_leader', 'draft', 'cancelled'
    ministry_id: Optional[str] = None
    ministry_name: Optional[str] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None
    approved_by: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    is_global: bool = False
    proposed_date: Optional[datetime] = None
    proposed_location: Optional[str] = None
    pastor_notes: Optional[str] = None
    proposed_by: Optional[str] = None
    sermon: Optional[SermonOutline] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def is_past(self) -> bool:
        """Verifica se o evento já ocorreu no tempo."""
        return self.date < datetime.now(timezone.utc)

    @property
    def has_sermon(self) -> bool:
        """Indica se a IA já documentou e gerou o esboço deste culto."""
        return self.sermon is not None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "date": self.date.isoformat() if isinstance(self.date, datetime) else self.date,
            "location": self.location,
            "theme": self.theme,
            "description": self.description,
            "cover_image": self.cover_image,
            "address_details": self.address_details,
            "planning": self.planning,
            "status": self.status,
            "ministry_id": self.ministry_id,
            "ministry_name": self.ministry_name,
            "responsible_id": self.responsible_id,
            "responsible_name": self.responsible_name,
            "approved_by": self.approved_by,
            "tags": self.tags,
            "is_global": self.is_global,
            "proposed_date": self.proposed_date.isoformat() if isinstance(self.proposed_date, datetime) else self.proposed_date,
            "proposed_location": self.proposed_location,
            "pastor_notes": self.pastor_notes,
            "proposed_by": self.proposed_by,
            "has_sermon": self.has_sermon,
            "sermon": self.sermon.to_dict() if self.sermon else None,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
        }
