"""
ConversationMessageParser for extracting tool calls from conversation messages.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Union
from panda_agi.client.token_processor import TokenProcessor
from panda_agi.tools.registry import ToolRegistry

logger = logging.getLogger("ConversationMessageParser")
logger.setLevel(logging.INFO)


class ConversationMessageParser:
    """Parser to extract tool calls from conversation messages"""

    def __init__(self):
        self.tool_call_id_counter = 0
        self.tool_registry = ToolRegistry()
        self.token_processor = TokenProcessor(tool_registry=self.tool_registry)

    def extract_tool_calls_from_message(
        self, message_content: Union[str, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Extract tool calls from a conversation message.

        Args:
            message_content: The content of the message (string or dict)

        Returns:
            List of tool call dictionaries
        """
        tool_calls = []
        xml_chunks = self.token_processor._extract_xml_chunks(message_content)
        for chunk in xml_chunks:
            tool_call = self.token_processor._parse_xml_tool_call(chunk)
            if tool_call:
                tool_calls.append(tool_call)
        return tool_calls
