from .BaseController import BaseController
from .ProjectController import ProjectController
import os
from langchain_community.document_loaders import TextLoader
from langchain_community.document_loaders import PyMuPDFLoader
from models import ProcessingEnum
from typing import List
from dataclasses import dataclass
from copy import deepcopy

@dataclass
class Document:
    page_content: str
    metadata: dict

class ProcessController(BaseController):

    def __init__(self, project_id: str):
        super().__init__()

        self.project_id = project_id
        self.project_path = ProjectController().get_project_path(project_id=project_id)

    def get_file_extension(self, file_id: str):
        return os.path.splitext(file_id)[-1]

    def get_file_loader(self, file_id: str):

        file_ext = self.get_file_extension(file_id=file_id)
        file_path = os.path.join(
            self.project_path,
            file_id
        )

        if not os.path.exists(file_path):
            return None

        if file_ext == ProcessingEnum.TXT.value:
            return TextLoader(file_path, encoding="utf-8")

        if file_ext == ProcessingEnum.PDF.value:
            return PyMuPDFLoader(file_path)
        
        return None

    def normalize_document_metadata(self, file_id: str, document_metadata: dict = None,
                                    page_fallback: int = 1, page_offset: int = 0):
        file_path = os.path.join(self.project_path, file_id)
        filename = os.path.basename(file_path)
        file_type = self.get_file_extension(file_id=file_id).lstrip(".")

        normalized_metadata = dict(document_metadata or {})

        # Keep any metadata from the loader, but make sure the core source fields are always present.
        if "source" in normalized_metadata and normalized_metadata["source"] != filename:
            normalized_metadata.setdefault("loader_source", normalized_metadata["source"])

        normalized_metadata["source"] = filename
        normalized_metadata["filename"] = filename
        normalized_metadata["filepath"] = file_path
        normalized_metadata["file_type"] = file_type

        # Preserve loader page values when they exist; otherwise fall back to a stable 1-based page number.
        page_value = normalized_metadata.get("page", normalized_metadata.get("page_number", page_fallback))
        if isinstance(page_value, int):
            normalized_metadata["page"] = page_value + page_offset
        else:
            normalized_metadata["page"] = page_fallback

        if "page_number" not in normalized_metadata:
            normalized_metadata["page_number"] = normalized_metadata["page"]

        return normalized_metadata

    def get_file_content(self, file_id: str):

        loader = self.get_file_loader(file_id=file_id)
        if loader:
            loaded_documents = loader.load()
            page_offset = 0

            raw_pages = [
                document.metadata.get("page")
                for document in loaded_documents
                if isinstance(getattr(document, "metadata", None), dict)
                and isinstance(document.metadata.get("page"), int)
            ]

            # Normalize zero-based loader pages to a 1-based convention when the loader clearly uses 0 as the first page.
            if raw_pages and min(raw_pages) == 0:
                page_offset = 1

            for page_index, document in enumerate(loaded_documents, start=1):
                document.metadata = self.normalize_document_metadata(
                    file_id=file_id,
                    document_metadata=document.metadata,
                    page_fallback=page_index,
                    page_offset=page_offset,
                )

            return loaded_documents

        return None

    def process_file_content(self, file_content: list, file_id: str,
                            chunk_size: int=100, overlap_size: int=20):

        file_content_texts = [
            rec.page_content
            for rec in file_content
        ]

        file_content_metadata = [
            rec.metadata
            for rec in file_content
        ]

        # chunks = text_splitter.create_documents(
        #     file_content_texts,
        #     metadatas=file_content_metadata
        # )

        chunks = self.process_simpler_splitter(texts=file_content_texts,
                                               metadatas=file_content_metadata,
                                               chunk_size=chunk_size,
                                               file_id=file_id)

        return chunks

    def process_simpler_splitter(self, texts: List[str], metadatas: List[dict], chunk_size: int,
                                 file_id: str = None, splitter_tag: str="\n"):
        chunks = []
        source_file_id = file_id

        for idx, (text, metadata) in enumerate(zip(texts, metadatas)):
            if not text or not text.strip():
                continue

            base_metadata = self.normalize_document_metadata(
                file_id=source_file_id,
                document_metadata=metadata,
                page_fallback=idx + 1,
            )

            lines = [doc.strip() for doc in text.split(splitter_tag) if len(doc.strip()) > 1]
            current_chunk_lines = []

            for line in lines:
                current_chunk_lines.append(line)
                current_chunk = splitter_tag.join(current_chunk_lines).strip()

                if len(current_chunk) >= chunk_size:
                    chunks.append(Document(
                        page_content=current_chunk,
                        metadata=deepcopy(base_metadata)
                    ))
                    current_chunk_lines = []

            if current_chunk_lines:
                chunks.append(Document(
                    page_content=splitter_tag.join(current_chunk_lines).strip(),
                    metadata=deepcopy(base_metadata)
                ))

        total_chunks = len(chunks)
        for chunk_index, chunk in enumerate(chunks):
            chunk_metadata = dict(chunk.metadata or {})
            chunk_metadata["chunk_index"] = chunk_index
            chunk_metadata["total_chunks"] = total_chunks
            chunk.metadata = chunk_metadata

        return chunks


    
