from ..LLMInterface import LLMInterface
from ..LLMEnums import GeminiEnums
from google import genai
from google.genai import types
import logging

class GeminiProvider(LLMInterface):

    def __init__(self, api_key: str=None,
                       default_input_max_characters: int=1000,
                       default_generation_max_output_tokens: int=1000,
                       default_generation_temperature: float=0.1):

        self.api_key = api_key

        self.default_input_max_characters = default_input_max_characters
        self.default_generation_max_output_tokens = default_generation_max_output_tokens
        self.default_generation_temperature = default_generation_temperature

        self.generation_model_id = None

        self.embedding_model_id = None
        self.embedding_size = None

        self.client = genai.Client(api_key=self.api_key) if self.api_key else genai.Client()

        self.enums = GeminiEnums
        self.logger = logging.getLogger(__name__)

    def set_generation_model(self, model_id: str):
        self.generation_model_id = model_id

    def set_embedding_model(self, model_id: str, embedding_size: int):
        self.embedding_model_id = model_id
        self.embedding_size = embedding_size

    def process_text(self, text: str):
        return text[:self.default_input_max_characters].strip()

    def generate_text(self, prompt: str, chat_history: list=[], max_output_tokens: int=None,
                            temperature: float = None):

        if not self.client:
            self.logger.error("Gemini client was not set")
            return None

        if not self.generation_model_id:
            self.logger.error("Generation model for Gemini was not set")
            return None

        max_output_tokens = max_output_tokens if max_output_tokens else self.default_generation_max_output_tokens
        temperature = temperature if temperature else self.default_generation_temperature

        if chat_history is None:
            chat_history = []

        chat_history.append(
            self.construct_prompt(prompt=prompt, role=GeminiEnums.USER.value)
        )
        system_instruction, contents = self._prepare_contents(chat_history=chat_history)

        response = self.client.models.generate_content(
            model=self.generation_model_id,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                max_output_tokens=max_output_tokens,
                temperature=temperature,
            )
        )

        if not response or not response.text:
            self.logger.error("Error while generating text with Gemini")
            return None

        return response.text

    def embed_text(self, text: str, document_type: str = None):
        self.logger.error("GeminiProvider does not implement embeddings")
        return None

    def construct_prompt(self, prompt: str, role: str):
        return {
            "role": role,
            "content": prompt,
        }

    def _prepare_contents(self, chat_history: list):
        system_instruction = None
        contents = []

        for message in chat_history or []:
            role = self._extract_role(message)
            text = self._extract_text(message)

            if not text:
                continue

            if self._is_system_role(role):
                system_instruction = text if not system_instruction else f"{system_instruction}\n\n{text}"
                continue

            contents.append(
                types.Content(
                    role=self._map_role(role),
                    parts=[types.Part.from_text(text=self.process_text(text))]
                )
            )

        return system_instruction, contents

    def _extract_role(self, message):
        if not isinstance(message, dict):
            return GeminiEnums.USER.value

        return message.get("role", GeminiEnums.USER.value)

    def _extract_text(self, message):
        if isinstance(message, str):
            return message

        if not isinstance(message, dict):
            return None

        return message.get("content") or message.get("text")

    def _is_system_role(self, role: str):
        return str(role).lower() == GeminiEnums.SYSTEM.value

    def _map_role(self, role: str):
        normalized_role = str(role).lower()
        if normalized_role in [GeminiEnums.ASSISTANT.value, 'model', 'chatbot']:
            return 'model'

        return 'user'
